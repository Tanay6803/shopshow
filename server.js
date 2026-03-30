const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MongoDB Connection ────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shopshow:shopshop@cluster0.ncitrl0.mongodb.net/shopshow?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ── Item Schema ───────────────────────────────────────────────────────────────
const itemSchema = new mongoose.Schema({
  id: { type: String, default: () => Date.now().toString() },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: String, required: true },
  category: { type: String, default: 'General' },
  image: { type: String },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

// ── Admin credentials ─────────────────────────────────────────────────────────
const ADMIN_ID   = process.env.ADMIN_ID   || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'shopshow2024';

// ── Multer (image uploads) ────────────────────────────────────────────────────
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

app.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.render('index', { items });
  } catch (err) {
    res.render('index', { items: [] });
  }
});

app.get('/item/:id', async (req, res) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.status(404).render('404');
    res.render('item', { item });
  } catch (err) {
    res.status(404).render('404');
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.json([]);
  }
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

app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.render('admin-dashboard', { items });
  } catch (err) {
    res.render('admin-dashboard', { items: [] });
  }
});

app.get('/admin/add', requireAdmin, (req, res) => {
  res.render('admin-add', { error: null, success: null });
});

app.post('/admin/add', requireAdmin, upload.array('images', 8), async (req, res) => {
  const { title, description, price, category } = req.body;
  if (!title || !price || !req.files || req.files.length === 0) {
    return res.render('admin-add', {
      error: 'Title, price and at least one image are required.',
      success: null
    });
  }
  try {
    const images = req.files.map(f => '/uploads/' + f.filename);
    const newItem = new Item({
      id: Date.now().toString(),
      title: title.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price).toFixed(2),
      category: category ? category.trim() : 'General',
      image: images[0],
      images: images,
      createdAt: new Date()
    });
    await newItem.save();
    res.render('admin-add', { error: null, success: 'Item added successfully!' });
  } catch (err) {
    console.error(err);
    res.render('admin-add', { error: 'Error saving item. Try again.', success: null });
  }
});

app.get('/admin/edit/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.redirect('/admin');
    res.render('admin-edit', { item, error: null, success: null });
  } catch (err) {
    res.redirect('/admin');
  }
});

app.post('/admin/edit/:id', requireAdmin, upload.array('images', 8), async (req, res) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.redirect('/admin');
    const { title, description, price, category } = req.body;
    item.title       = title.trim();
    item.description = description ? description.trim() : '';
    item.price       = parseFloat(price).toFixed(2);
    item.category    = category ? category.trim() : 'General';
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => '/uploads/' + f.filename);
      item.image  = newImages[0];
      item.images = newImages;
    } else {
      if (!item.images || item.images.length === 0) {
        item.images = item.image ? [item.image] : [];
      }
    }
    await item.save();
    res.render('admin-edit', { item, error: null, success: 'Updated successfully!' });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

app.post('/admin/delete/:id', requireAdmin, async (req, res) => {
  try {
    await Item.deleteOne({ id: req.params.id });
    res.redirect('/admin');
  } catch (err) {
    res.redirect('/admin');
  }
});

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`\n🚀 ShopShow running at http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin/login`);
  console.log(`   ID: ${ADMIN_ID}  |  Pass: ${ADMIN_PASS}\n`);
});
