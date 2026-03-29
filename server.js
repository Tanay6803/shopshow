const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data file ────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'items.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function readItems() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

// ── Admin credentials ────────────────────────────────────────────────────────
const ADMIN_ID   = process.env.ADMIN_ID   || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'shopshow2024';

// ── Multer (multiple image uploads) ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(file.mimetype));
  }
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'shopshow-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  const items = readItems().reverse();
  res.render('index', { items });
});

app.get('/item/:id', (req, res) => {
  const items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).render('404');
  res.render('item', { item });
});

app.get('/api/items', (req, res) => {
  res.json(readItems().reverse());
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin-login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_ID && password === ADMIN_PASS) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.render('admin-login', { error: 'Invalid credentials. Try again.' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  const items = readItems().reverse();
  res.render('admin-dashboard', { items });
});

app.get('/admin/add', requireAdmin, (req, res) => {
  res.render('admin-add', { error: null, success: null });
});

// ADD item — accept up to 8 images
app.post('/admin/add', requireAdmin, upload.array('images', 8), (req, res) => {
  const { title, description, price, category } = req.body;
  if (!title || !price || !req.files || req.files.length === 0) {
    return res.render('admin-add', {
      error: 'Title, price and at least one image are required.',
      success: null
    });
  }
  const images = req.files.map(f => '/uploads/' + f.filename);
  const items = readItems();
  const newItem = {
    id: Date.now().toString(),
    title: title.trim(),
    description: description ? description.trim() : '',
    price: parseFloat(price).toFixed(2),
    category: category ? category.trim() : 'General',
    image: images[0],      // keep first as primary for card thumbnails
    images: images,        // all images for detail page
    createdAt: new Date().toISOString()
  };
  items.push(newItem);
  writeItems(items);
  res.render('admin-add', { error: null, success: 'Item added successfully!' });
});

app.get('/admin/edit/:id', requireAdmin, (req, res) => {
  const items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.redirect('/admin');
  res.render('admin-edit', { item, error: null, success: null });
});

// EDIT item — accept up to 8 images
app.post('/admin/edit/:id', requireAdmin, upload.array('images', 8), (req, res) => {
  const items = readItems();
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.redirect('/admin');
  const { title, description, price, category } = req.body;
  items[idx].title       = title.trim();
  items[idx].description = description ? description.trim() : '';
  items[idx].price       = parseFloat(price).toFixed(2);
  items[idx].category    = category ? category.trim() : 'General';
  if (req.files && req.files.length > 0) {
    // Delete old images from disk
    const oldImages = items[idx].images || (items[idx].image ? [items[idx].image] : []);
    oldImages.forEach(img => {
      const imgPath = path.join(__dirname, 'public', img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
    const newImages = req.files.map(f => '/uploads/' + f.filename);
    items[idx].image  = newImages[0];
    items[idx].images = newImages;
  } else {
    // Ensure images array exists for old single-image items
    if (!items[idx].images) {
      items[idx].images = items[idx].image ? [items[idx].image] : [];
    }
  }
  writeItems(items);
  res.render('admin-edit', { item: items[idx], error: null, success: 'Updated!' });
});

app.post('/admin/delete/:id', requireAdmin, (req, res) => {
  let items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (item) {
    const allImages = item.images || (item.image ? [item.image] : []);
    allImages.forEach(img => {
      const imgPath = path.join(__dirname, 'public', img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
  }
  items = items.filter(i => i.id !== req.params.id);
  writeItems(items);
  res.redirect('/admin');
});

// 404
app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`\n🚀 ShopShow running at http://localhost:${PORT}`);
  console.log(`🔐 Admin panel:  http://localhost:${PORT}/admin/login`);
  console.log(`   ID: ${ADMIN_ID}  |  Pass: ${ADMIN_PASS}\n`);
});
