# SaveIt — Video Downloader

Download video dari YouTube Shorts, TikTok (no watermark), Instagram, Facebook, dan Twitter.

**Stack:**
- Frontend → GitHub Pages (gratis selamanya)
- Backend → Vercel Serverless Functions (gratis selamanya)
- Engine → yt-dlp (open source)

---

## 🚀 Deploy Backend ke Vercel

### 1. Push folder `backend` ke GitHub

Buat repo baru di GitHub, misal: `saveit-backend`, lalu:

```bash
cd backend
git init
git add .
git commit -m "init backend"
git remote add origin https://github.com/USERNAME/saveit-backend.git
git push -u origin main
```

### 2. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → Login
2. Klik **Add New → Project**
3. Import repo `saveit-backend`
4. **Framework Preset** → pilih **Other**
5. Klik **Deploy**

Setelah deploy selesai, kamu dapat URL seperti:
`https://saveit-backend.vercel.app`

### 3. Test backend

Buka browser atau Postman:
```
POST https://saveit-backend.vercel.app/api/info
Content-Type: application/json

{"url": "https://www.youtube.com/shorts/XXXX"}
```

---

## 🌐 Deploy Frontend ke GitHub Pages

### 1. Ubah BACKEND_URL di `frontend/index.html`

Buka file `frontend/index.html`, cari baris:
```javascript
const BACKEND_URL = 'https://YOUR_VERCEL_PROJECT.vercel.app';
```

Ganti dengan URL Vercel kamu:
```javascript
const BACKEND_URL = 'https://saveit-backend.vercel.app';
```

### 2. Push folder `frontend` ke GitHub

Buat repo baru: `saveit-frontend` (atau `USERNAME.github.io`)

```bash
cd frontend
git init
git add .
git commit -m "init frontend"
git remote add origin https://github.com/USERNAME/saveit-frontend.git
git push -u origin main
```

### 3. Aktifkan GitHub Pages

1. Di repo frontend → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `root`
4. Klik **Save**

Website live di: `https://USERNAME.github.io/saveit-frontend`

---

## 📋 Platform yang Didukung

| Platform | Jenis Konten |
|----------|-------------|
| YouTube | Shorts, video biasa |
| TikTok | Video, Story (no watermark) |
| Instagram | Reels, Post, Story |
| Facebook | Reels, Post, Story, Watch |
| Twitter/X | Video tweet |

---

## ❓ Troubleshooting

**Error "Could not fetch video"**
- Pastikan link yang dipaste adalah link publik (bukan private/friends only)
- Untuk Instagram Story: harus login dulu di browser, link story biasanya tidak bisa di-scrape

**Video tidak ada audio**
- Ini terjadi di beberapa format YouTube (adaptive streams)
- Pilih format lain yang ada label audionya

**Vercel timeout**
- Vercel free tier max 10 detik per request
- Video dengan info yang banyak (playlist) mungkin timeout — gunakan link video langsung

---

## 🔧 Update yt-dlp

yt-dlp sering update untuk bypass perubahan platform. Untuk update:

Di `backend/requirements.txt`, ganti versinya ke yang terbaru:
```
yt-dlp==VERSI_TERBARU
```

Cek versi terbaru di: https://github.com/yt-dlp/yt-dlp/releases

Lalu push ke GitHub → Vercel otomatis redeploy.
