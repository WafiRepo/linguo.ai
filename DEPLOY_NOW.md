# Deploy Sekarang — Checklist Langkah demi Langkah

Ikuti urutan ini. Centang setiap langkah setelah selesai.

Repo GitHub: **https://github.com/WafiRepo/linguo.ai**

Expo project: **https://expo.dev/accounts/wafirepo/projects/linguo-ai**

Production API URL: **https://linguo-ai.expo.app**

---

## Fase A — Railway (Vision Agent) ~15 menit

Vision agent **harus online dulu** sebelum API routes bisa jalan.

### A1. Buat project Railway

1. Login [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Pilih repo **`WafiRepo/linguo.ai`**
4. Di **Settings → Root Directory** set: `vision-agent`
5. Railway akan detect `Dockerfile` otomatis

### A2. Environment variables (Railway → Variables)

| Variable | Nilai |
|----------|-------|
| `STREAM_API_KEY` | dari `.env` lokal Anda |
| `STREAM_API_SECRET` | dari `.env` lokal Anda |
| `OPENAI_API_KEY` | dari [OpenAI dashboard](https://platform.openai.com/api-keys) |

### A3. Deploy & catat URL

1. Klik **Deploy**
2. Buka **Settings → Networking → Generate Domain**
3. Salin URL public, contoh:  
   `https://linguo-ai-production-xxxx.up.railway.app`

**Simpan URL ini** — dipakai di Fase C sebagai `VISION_AGENT_URL`.

### A4. Verifikasi (opsional)

Cek log Railway — harus ada:
```
Application startup complete
Uvicorn running on 0.0.0.0:...
```

---

## Fase B — Expo / EAS Setup ~10 menit

### B1. Login Expo

```powershell
cd f:\other\react-native-lingua
npx eas-cli login
```

Buka browser jika diminta, login akun Expo (buat gratis di [expo.dev](https://expo.dev)).

### B2. Inisialisasi project

```powershell
npx eas-cli init
```

- Pilih **Create a new project** (atau link ke project existing)
- Ini menambahkan `projectId` ke `app.config.js`

### B3. Verifikasi login

```powershell
npx eas-cli whoami
```

Harus tampil username Expo Anda.

---

## Fase C — Deploy API Routes (EAS Hosting) ~10 menit

Ganti placeholder dengan nilai asli Anda.

### C1. Set secrets di EAS

```powershell
# Ganti YOUR_* dengan nilai dari .env lokal
npx eas-cli env:create --name STREAM_API_KEY --value YOUR_STREAM_API_KEY --environment production --visibility secret
npx eas-cli env:create --name STREAM_API_SECRET --value YOUR_STREAM_SECRET --environment production --visibility secret
npx eas-cli env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value YOUR_CLERK_PK --environment production --visibility plaintext
npx eas-cli env:create --name VISION_AGENT_URL --value https://YOUR-RAILWAY-URL --environment production --visibility secret
```

Ulangi untuk environment **`preview`** jika akan build profile preview:

```powershell
npx eas-cli env:create --name STREAM_API_KEY --value YOUR_STREAM_API_KEY --environment preview --visibility secret
npx eas-cli env:create --name STREAM_API_SECRET --value YOUR_STREAM_SECRET --environment preview --visibility secret
npx eas-cli env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value YOUR_CLERK_PK --environment preview --visibility plaintext
npx eas-cli env:create --name VISION_AGENT_URL --value https://YOUR-RAILWAY-URL --environment preview --visibility secret
```

### C2. Deploy API

```powershell
npm run deploy:api
```

Catat URL yang muncul, contoh: `https://linguo-ai.expo.app`

### C3. Tes API

```powershell
curl https://YOUR-EAS-URL.expo.app/api/stream-token
```

Harus dapat **401 Unauthorized** (bukan 404).

---

## Fase D — Clerk Native App ~5 menit

1. [Clerk Dashboard](https://dashboard.clerk.com) → **Configure → Native applications**
2. Tambahkan:
   - **Android package:** `com.jsmastery.duolingo-clone`
   - **iOS bundle ID:** `com.jsmastery.duolingo-clone`
3. Pastikan publishable key sama dengan yang di EAS env

---

## Fase E — Build APK untuk Tester ~20 menit

### E1. Set API URL untuk mobile build

```powershell
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-EAS-URL.expo.app --environment preview --visibility plaintext
```

### E2. Build Android APK

```powershell
npm run build:android:preview
```

Tunggu build selesai di [expo.dev](https://expo.dev) → **Builds**.

### E3. Share ke tester

1. Download **APK** dari dashboard Expo
2. Kirim link/file ke tester Android
3. Tester: install → allow unknown sources → sign up → buka voice lesson

---

## Fase F — Tes End-to-End

- [ ] Sign in di app build (bukan dev client)
- [ ] Pilih Indonesian
- [ ] Buka lesson → allow mic
- [ ] Guru AI (Sari) bicara
- [ ] Practice tab → mixed review jalan

---

## Troubleshooting cepat

| Gejala | Fix |
|--------|-----|
| Voice lesson error | Cek `EXPO_PUBLIC_API_URL` di EAS preview env |
| Cannot reach vision agent | `VISION_AGENT_URL` di EAS harus URL Railway |
| Auth gagal | Clerk bundle ID + publishable key |
| Build gagal | `npx eas-cli build:list` → baca log |

---

## Perintah helper (PowerShell)

Jalankan script interaktif:

```powershell
.\scripts\deploy-setup.ps1
```

---

## Setelah deploy berhasil

- Update README dengan URL production (opsional)
- Invite tester iOS via TestFlight: `npm run build:ios:preview`
- Lihat panduan lengkap: [DEPLOYMENT.md](./DEPLOYMENT.md)
