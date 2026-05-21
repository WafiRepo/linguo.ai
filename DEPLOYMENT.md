# Panduan Deploy — Lingua App

Panduan ini menjelaskan cara agar **orang lain bisa memakai aplikasi** (beta tester atau publik), bukan hanya di jaringan lokal Anda.

## Arsitektur production

```
┌─────────────┐     HTTPS      ┌──────────────────┐     HTTPS     ┌─────────────────┐
│  Mobile App │ ──────────────►│  EAS Hosting     │ ────────────►│  Vision Agent   │
│ (EAS Build) │                │  /api/* routes   │             │  (Railway/Fly)  │
└─────────────┘                └──────────────────┘             └─────────────────┘
       │                                │                                  │
       │                                │                                  │
       ▼                                ▼                                  ▼
   Clerk Auth                    Stream tokens                      OpenAI Realtime
                                 (server secret)                    Stream Video
```

**3 komponen wajib online:**

| Komponen | Fungsi | Deploy ke |
|----------|--------|-----------|
| **Mobile app** | UI + Stream client | EAS Build (APK/IPA) |
| **API routes** | `/api/stream-token`, `/api/agent-session` | EAS Hosting |
| **Vision Agent** | AI teacher Python | Railway / Fly.io / Render |

---

## Prasyarat

1. Akun [Expo](https://expo.dev) + install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Akun [Clerk](https://clerk.com) (auth)
3. Akun [Stream](https://getstream.io) (video/voice)
4. Akun [OpenAI](https://platform.openai.com) (Realtime model untuk agent)
5. Akun [Railway](https://railway.app) atau [Fly.io](https://fly.io) (vision agent)

---

## Langkah 1 — Inisialisasi EAS project

Di root project:

```bash
cd f:\other\react-native-lingua
eas init
```

Ini menghubungkan project ke Expo dashboard dan menambahkan `projectId` di `app.config.js` jika belum ada.

---

## Langkah 2 — Deploy Vision Agent ke cloud

Vision agent **tidak boleh** pakai `http://192.168.x.x` atau `localhost` — hanya bisa diakses dari PC Anda.

### Opsi A: Railway (paling mudah)

1. Buat project baru di [Railway](https://railway.app)
2. **New → GitHub Repo** (atau deploy from folder `vision-agent/`)
3. Set **Root Directory** = `vision-agent`
4. Railway akan pakai `Dockerfile` otomatis
5. Tambah **Environment Variables**:
   ```
   STREAM_API_KEY=...
   STREAM_API_SECRET=...
   OPENAI_API_KEY=...
   ```
6. Deploy → copy **public URL**, mis. `https://lingua-agent-production.up.railway.app`

### Opsi B: Fly.io

```bash
cd vision-agent
fly launch
fly secrets set STREAM_API_KEY=... STREAM_API_SECRET=... OPENAI_API_KEY=...
fly deploy
```

### Verifikasi

```bash
curl https://YOUR-AGENT-URL/health
```

(Jika endpoint health belum ada, cek log Railway — server harus listen di port yang ditentukan platform.)

---

## Langkah 3 — Deploy API routes (EAS Hosting)

API routes (`app/api/stream-token+api.ts`, `app/api/agent-session+api.ts`) harus online agar app di HP bisa minta token Stream dan start agent session.

### 3a. Set environment variables di EAS

```bash
# Secrets untuk API routes (server-side)
eas env:create --name STREAM_API_KEY --value YOUR_KEY --environment production --visibility secret
eas env:create --name STREAM_API_SECRET --value YOUR_SECRET --environment production --visibility secret
eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value YOUR_CLERK_PK --environment production --visibility plaintext
eas env:create --name VISION_AGENT_URL --value https://YOUR-AGENT-URL --environment production --visibility secret
```

Ulangi untuk environment `preview` jika pakai profile preview.

### 3b. Deploy

```bash
npm run deploy:api
# atau
eas deploy --prod
```

Catat URL production, mis. `https://duolingo-clone.expo.app`

### 3c. Tes API

```bash
# Harus return 401 tanpa auth (bukan 404)
curl https://YOUR-EAS-URL.expo.app/api/stream-token
```

> **Catatan:** `stream-token+api.ts` memakai Node `crypto`. Jika `eas deploy` gagal di Cloudflare Workers, buka issue atau deploy API ke Railway terpisah — untuk kebanyakan project Expo SDK 54+, compat layer sudah cukup.

---

## Langkah 4 — Konfigurasi Clerk untuk production

1. Buka [Clerk Dashboard](https://dashboard.clerk.com) → **Configure → Native applications**
2. Tambah bundle ID / package name dari `app.config.js`:
   - iOS: `com.jsmastery.duolingo-clone`
   - Android: `com.jsmastery.duolingo-clone`
3. Tambah **redirect URLs** jika pakai OAuth
4. (Opsional) Buat instance **Production** dan ganti `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

---

## Langkah 5 — Build app untuk tester

Set `EXPO_PUBLIC_API_URL` ke URL EAS Hosting **sebelum build** — nilai ini di-embed ke app saat compile.

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-EAS-URL.expo.app --environment preview --visibility plaintext
```

### Android APK (internal testing)

```bash
npm run build:android:preview
```

Setelah selesai, download APK dari Expo dashboard → share link ke tester.

### iOS TestFlight

```bash
npm run build:ios:preview
eas submit -p ios --profile production
```

Atau gabung: `eas build -p ios --profile preview --submit`

Tester install dari **TestFlight**, bukan Expo Go.

---

## Langkah 6 — Distribusi ke orang lain

| Metode | Cara share | Cocok untuk |
|--------|------------|-------------|
| **APK link** | Link download dari Expo build | Android beta (5–50 orang) |
| **TestFlight** | Invite email Apple ID | iOS beta |
| **Play Internal Testing** | Track internal di Play Console | Android formal beta |
| **App Store / Play Store** | Profile `production` + submit | Publik |

---

## Environment variables — ringkasan

### Root `.env` (local dev)

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=
STREAM_API_KEY=...
STREAM_API_SECRET=...
VISION_AGENT_URL=http://192.168.1.2:8000
```

### EAS Hosting (server API)

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `STREAM_API_KEY` | ✅ | Server only |
| `STREAM_API_SECRET` | ✅ | Server only |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Verifikasi JWT Clerk |
| `VISION_AGENT_URL` | ✅ | URL public vision agent |

### EAS Build (mobile app)

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Auth di app |
| `EXPO_PUBLIC_API_URL` | ✅ production | URL EAS Hosting |

### Vision Agent (Railway/Fly)

| Variable | Wajib |
|----------|-------|
| `STREAM_API_KEY` | ✅ |
| `STREAM_API_SECRET` | ✅ |
| `OPENAI_API_KEY` | ✅ |

---

## Checklist sebelum share ke tester

- [ ] Vision agent online (URL public, bukan IP lokal)
- [ ] `VISION_AGENT_URL` di EAS env mengarah ke agent
- [ ] API routes deployed (`eas deploy --prod`)
- [ ] `EXPO_PUBLIC_API_URL` di-set saat build mobile
- [ ] Clerk bundle ID / package name cocok
- [ ] Build APK/IPA selesai dan link di-share
- [ ] Tes: sign in → buka lesson → guru AI bicara

---

## Troubleshooting

### Voice lesson gagal connect di HP tester

1. Cek `EXPO_PUBLIC_API_URL` di build — harus URL EAS, bukan kosong
2. Cek `VISION_AGENT_URL` di EAS env — harus URL cloud agent
3. Buka log vision agent di Railway

### `Cannot reach vision agent`

Agent belum deploy atau URL salah di EAS `VISION_AGENT_URL`.

### Auth gagal di production

Clerk publishable key production vs test tidak cocok, atau bundle ID belum didaftarkan.

### App hanya jalan di WiFi yang sama

Masih mode dev (`expo start` + dev client). Build standalone dengan EAS (`preview` / `production`).

---

## Perintah cepat

```bash
# Deploy API
npm run deploy:api

# Build Android untuk beta
npm run build:android:preview

# Build iOS untuk TestFlight
npm run build:ios:preview

# Production release
npm run build:android:prod
npm run build:ios:prod
```

---

## Web (terbatas)

```bash
npm run web
```

Voice lesson **tidak tersedia** di browser — hanya mobile build.

Untuk pertanyaan lebih lanjut, lihat:
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Hosting / API routes](https://docs.expo.dev/router/reference/api-routes/)
- [Stream Vision Agents](https://getstream.io/video/docs/)
