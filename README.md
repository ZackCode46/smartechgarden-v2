# 🌿 Smartech Garden 2.0 — Node/Next.js Edition

Rewrite dari versi lama (Firebase + vanilla JS) ke stack Node/Next.js + Postgres,
dengan microservice Python terpisah untuk analisis kesehatan tanaman.

## Arsitektur

```
smartech-v2/
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Login (Google, Facebook, email/password)
│   ├── (auth)/register/    # Registrasi akun
│   ├── (dashboard)/        # Halaman ber-auth: dashboard, e-book, history, dst.
│   └── api/                # API routes (sensor, control, plant-check, dst.)
├── components/             # Komponen UI (gauge, nav, form)
├── lib/                    # Prisma client & konfigurasi NextAuth
├── prisma/
│   ├── schema.prisma       # Skema database Postgres
│   └── seed.mjs            # Data awal katalog tanaman (e-book)
└── python-service/          # Microservice FastAPI + OpenCV
    ├── main.py
    └── requirements.txt
```

**Kenapa Python dipisah?** OpenCV/numpy berat untuk serverless function
(Vercel). Next.js cukup `fetch()` ke endpoint FastAPI ini seperti API
eksternal biasa. Jalankan Python di Railway/Render (ada free tier), atau
lokal di laptop saat demo/sidang.

## Yang sudah dibuat (Fase 1)

- ✅ Skema Postgres lengkap: user, auth, device, sensor reading, e-book
  (`PlantSpecies`), plant check, notifikasi, pengaturan
- ✅ Auth: NextAuth dengan Google, Facebook, dan email/password (bcrypt)
- ✅ Dashboard: gauge analog (suhu, kelembaban udara, kelembaban tanah,
  cahaya), grafik riwayat (recharts), kendali pompa AUTO/MANUAL
- ✅ API sensor (`POST /api/sensor`) untuk ESP32 kirim data pakai device key,
  dengan notifikasi otomatis saat tanah terlalu kering/suhu terlalu tinggi
- ✅ **Cek Kesehatan Tanaman (v2, detail)**: bukan cuma skor warna —
  sekarang ada **deteksi bercak** (jumlah, ukuran, pola sebaran lewat contour
  detection), **analisis zonal** (tepi vs tengah, buat bedain kekeringan vs
  serangan jamur vs kekurangan nitrogen), **daftar temuan** bertingkat
  (ringan/sedang/berat) dengan alasan spesifik, **confidence score**
  segmentasi, dan **perbandingan otomatis** ke data sensor ESP32 kamu kalau
  nama spesies yang diisi cocok dengan katalog e-book (mis. "suhu sekarang
  32°C, di atas ideal Tomat 20-27°C")
- ✅ Microservice FastAPI (`python-service/main.py`) sudah diuji dengan
  gambar sintetis (daun hijau/kuning/coklat, buah mentah/matang/busuk)
- ✅ Halaman E-book (katalog 17 tanaman, data lama dibersihkan dari
  duplikat & link gambar rusak, ditambah info suhu/kelembaban/cahaya/masa
  panen)
- ✅ Halaman Riwayat, Profil (dengan upload foto profil, otomatis dikompres di
  browser), Pengaturan (ambang notifikasi), Mulai Tanam (wizard device key +
  contoh kode ESP32)
- ✅ **Role User/Admin** — panel `/admin` untuk CRUD katalog e-book (tambah,
  edit, hapus tanaman) langsung dari browser, tanpa perlu edit `seed.mjs`
  manual lagi
- ✅ Tema visual baru "buku kebun" — bukan gaya AI generik: kartu ala
  label benih, gauge kuningan analog, palet moss/brass/clay

## Cara Menjalankan

### 1. Setup Next.js

```bash
cd smartech-v2
npm install
cp .env.example .env       # isi DATABASE_URL, NEXTAUTH_SECRET, dst.
npx prisma db push          # bikin tabel di Neon Postgres
npm run db:seed             # isi katalog tanaman awal
npm run dev
```

Buka http://localhost:3000

### 2. Setup Google & Facebook OAuth

- **Google**: [Google Cloud Console](https://console.cloud.google.com) →
  Credentials → OAuth Client ID → tipe Web application → Authorized redirect
  URI: `http://localhost:3000/api/auth/callback/google` (dan versi domain
  production nanti)
- **Facebook**: [Facebook for Developers](https://developers.facebook.com) →
  buat App → Facebook Login → Valid OAuth Redirect URI:
  `http://localhost:3000/api/auth/callback/facebook`

Masukkan client ID & secret ke `.env`.

### 3. Setup Neon Postgres

1. Buat project di [neon.tech](https://neon.tech) (gratis)
2. Copy connection string (pooled) → `DATABASE_URL`
3. Copy connection string (direct, tanpa `-pooler`) → `DIRECT_URL`

### 4. Setup Python Plant-Check Service

```bash
cd python-service
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8001
```

Test cepat:
```bash
curl -X POST http://localhost:8001/analyze \
  -F "image=@contoh_daun.jpg" -F "kind=daun"
```

Untuk deploy: push `python-service/` sebagai repo terpisah ke Railway/Render,
set env `ALLOWED_ORIGINS` ke domain Vercel kamu, lalu isi
`PLANT_CHECK_SERVICE_URL` di `.env` Next.js dengan URL publiknya.

### 5. Jadi Admin

Registrasi akun baru selalu berperan `USER` (demi keamanan — supaya orang
lain yang daftar gak otomatis bisa akses panel admin). Untuk menjadikan
akunmu sendiri admin, setelah register lewat browser, jalankan:

```bash
npm run promote-admin -- namamu@email.com
```

Setelah itu, login ulang (atau refresh session) dan menu **🛠️ Admin** akan
muncul di sidebar. Dari situ bisa tambah/edit/hapus tanaman di katalog
e-book langsung lewat form, termasuk ganti foto (isi URL gambar — bisa path
lokal `/plants/nama-file.jpg` kalau filenya kamu taruh di folder
`public/plants/`, atau link gambar langsung dari internet).

### 6. Deploy ke Vercel (Next.js saja)

```bash
vercel
```
Isi semua environment variable yang sama seperti `.env` di dashboard Vercel.

## Migrasi Data dari Versi Lama

- Data e-book lama (`data_base.json`) punya banyak duplikat (Tomat, Apel,
  Pisang muncul 2x) dan beberapa link gambar rusak (mengarah ke halaman
  pencarian Shutterstock/iStock, bukan file gambar langsung). Di
  `prisma/seed.mjs`, data sudah dibersihkan & diganti ke gambar Wikimedia
  Commons yang valid, plus ditambah field detail (suhu, kelembaban, cahaya,
  masa panen).
- Firebase Auth & Realtime Database **tidak dipakai lagi** — semua pindah ke
  NextAuth + Postgres sesuai keputusan kamu. API key Firebase yang ada di
  kode lama (`firebase_config.js`) adalah client key publik (memang didesain
  untuk terlihat di frontend), jadi tidak masalah keamanan meskipun terlihat
  di repo lama — tapi karena sudah tidak dipakai, boleh diabaikan/dihapus.

## Belum Dibuat / Langkah Selanjutnya

Karena scope-nya besar, ini fase 1 (fondasi + fitur inti). Yang masih bisa
dikembangkan lebih lanjut:
- Panel notifikasi (bell icon) yang menampilkan isi tabel `Notification`
  secara real-time di dashboard
- Upload foto ke object storage (Vercel Blob/S3) — saat ini `imageUrl` pada
  `PlantCheck` belum diisi file asli, hanya hasil analisisnya
- Role admin (CRUD katalog e-book lewat UI, bukan cuma lewat seed script)
- PWA/offline support kalau dipakai di lapangan
- Grafik riwayat dengan rentang waktu custom (bukan cuma 20 pembacaan
  terakhir)

## Catatan Keamanan

- Next.js dipin ke `14.2.35` (versi terpatch untuk kerentanan RSC yang
  diumumkan Desember 2025). Next.js 14 sendiri sudah EOL — pertimbangkan
  migrasi ke Next.js 15/16 untuk dukungan keamanan jangka panjang.
- `NEXTAUTH_SECRET` wajib diisi acak & rahasia:
  `openssl rand -base64 32`
