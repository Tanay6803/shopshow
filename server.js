const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data file (replaces DB) ──────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'items.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function readItems() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

// ── Admin credentials (change these!) ────────────────────────────────────────
const ADMIN_ID  = process.env.ADMIN_ID  || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'shopshow2024';

// ── Multer (image uploads) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
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

// Home — all items
app.get('/', (req, res) => {
  const items = readItems().reverse();
  res.render('index', { items });
});

// Single item page (for share links)
app.get('/item/:id', (req, res) => {
  const items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).render('404');
  res.render('item', { item });
});

// API: all items (JSON)
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

app.post('/admin/add', requireAdmin, upload.single('image'), (req, res) => {
  const { title, description, price, category } = req.body;
  if (!title || !price || !req.file) {
    return res.render('admin-add', {
      error: 'Title, price and image are required.',
      success: null
    });
  }
  const items = readItems();
  const newItem = {
    id: Date.now().toString(),
    title: title.trim(),
    description: description ? description.trim() : '',
    price: parseFloat(price).toFixed(2),
    category: category ? category.trim() : 'General',
    image: '/uploads/' + req.file.filename,
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

app.post('/admin/edit/:id', requireAdmin, upload.single('image'), (req, res) => {
  const items = readItems();
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.redirect('/admin');
  const { title, description, price, category } = req.body;
  items[idx].title = title.trim();
  items[idx].description = description ? description.trim() : '';
  items[idx].price = parseFloat(price).toFixed(2);
  items[idx].category = category ? category.trim() : 'General';
  if (req.file) items[idx].image = '/uploads/' + req.file.filename;
  writeItems(items);
  res.render('admin-edit', { item: items[idx], error: null, success: 'Updated!' });
});

app.post('/admin/delete/:id', requireAdmin, (req, res) => {
  let items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (item && item.image) {
    const imgPath = path.join(__dirname, 'public', item.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
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
