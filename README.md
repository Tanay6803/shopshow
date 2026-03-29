# ShopShow 🛍️

A beautiful product showcase website with admin panel. No database required — uses a JSON file for storage.

## Features
- Public: Browse products with image, title, price, description
- Public: Share any item to WhatsApp, Facebook, Twitter, Telegram, Instagram, or copy link
- Admin: Protected login (ID + password)
- Admin: Add, edit, delete product listings with image upload
- Admin: Dashboard with stats and all listings table
- Responsive, mobile-friendly design
- Smooth animations and transitions

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# Public site:  http://localhost:3000
# Admin panel:  http://localhost:3000/admin/login
#   Default ID: admin | Password: shopshow2024
```

**Change your admin credentials** in `server.js` lines 18–19 or use environment variables:
```
ADMIN_ID=yourid
ADMIN_PASS=yourpassword
```

---

## Deploying to Render (FREE — recommended)

### Step 1: Push to GitHub
1. Create a GitHub account at https://github.com
2. Create a new repository (e.g. `shopshow`)
3. Run these commands in your project folder:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/shopshow.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to https://render.com and sign up (free)
2. Click **New → Web Service**
3. Connect your GitHub account and select your repo
4. Fill in:
   - **Name**: shopshow (or anything)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add **Environment Variables**:
   - `ADMIN_ID` = your chosen admin ID
   - `ADMIN_PASS` = your chosen password
6. Click **Create Web Service**
7. Wait ~2 minutes — your site is live!

> ⚠️ Note: Render's free tier sleeps after inactivity. Uploaded images are temporary (lost on redeploy). For permanent images, use Cloudinary (see below).

---

## Deploying to Railway (FREE tier available)

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repo
4. Add environment variables (ADMIN_ID, ADMIN_PASS)
5. Railway auto-detects Node.js and deploys
6. Click **Generate Domain** to get your free URL

---

## Free Domain Options

| Site | Free Domain | Notes |
|------|-------------|-------|
| https://is.gd | yourname.is.gd | URL shortener redirect |
| https://freedns.afraid.org | yourname.mooo.com etc | True free subdomain |
| https://www.freenom.com | .tk .ml .ga .cf .gq | Free for 1 year |
| https://nic.eu.org | yourname.eu.org | Free, requires approval |
| Render built-in | yourname.onrender.com | Free with Render |
| Railway built-in | yourname.railway.app | Free with Railway |

**Recommendation**: Just use the free `.onrender.com` or `.railway.app` subdomain — they look professional and cost nothing.

---

## Persistent Image Storage with Cloudinary (Optional)

If you want images to survive redeployments:

1. Sign up at https://cloudinary.com (free tier: 25GB)
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Replace the multer storage in `server.js` with Cloudinary storage
4. Add env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

---

## Project Structure

```
shopshow/
├── server.js          ← Express backend
├── package.json
├── Procfile           ← For deployment
├── data/
│   └── items.json     ← All product data (auto-created)
├── public/
│   ├── css/style.css  ← All styles
│   ├── js/main.js     ← Frontend JS (share, search, etc.)
│   └── uploads/       ← Uploaded images
└── views/
    ├── index.ejs      ← Public home page
    ├── item.ejs       ← Single item page
    ├── admin-login.ejs
    ├── admin-dashboard.ejs
    ├── admin-add.ejs
    ├── admin-edit.ejs
    ├── 404.ejs
    └── partials/
        ├── header.ejs
        └── footer.ejs
```
