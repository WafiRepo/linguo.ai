# Server voice agent Taiwan

Hasil pemeriksaan 12 September 2026 melalui SSH yang diotorisasi pengguna. Kredensial tidak disimpan dalam dokumen ini.

- Host: `140.115.126.90`.
- Proyek: `/home/hwanglab-iis/Desktop/vinsa_backend/react-native-lingua`.
- Runtime: `vision-agent/.venv/bin/python`, Vision Agents **0.6.9**.
- Proses yang ditemukan: `main.py serve --host 0.0.0.0 --port 8010`.
- `/health` dan `/ready` pada loopback merespons HTTP 200. Ini bukan pengukuran latensi percakapan.
- `main.py` dan `class_management.py` server memiliki hash yang sama dengan salinan lokal saat diperiksa; keduanya sudah memuat perubahan pengguna.
- Entry point aktif memakai default launcher tanpa batas concurrency/durasi yang eksplisit, dan belum memasang callback otorisasi API.
- Nginx TLS yang ditemukan pada port 27491 mengarah ke **layanan lain** di 9011. Jangan mengalihkannya ke agent tanpa rancangan routing yang jelas.

## Entry point terlindungi yang disiapkan

`vision-agent/serve_secure.py` menggunakan callback otorisasi bawaan versi 0.6.9. Semua operasi sesi dan metrik membutuhkan header `X-Agent-Service-Key`. Kunci minimal 32 karakter hanya untuk backend. Default sesi siswa tertutup sampai `AI_PILOT_ENABLED=true` di server, setelah gerbang keselamatan selesai.

Batas awal: 2 sesi bersamaan, 1 sesi per call, maksimum 300 detik per sesi, idle timeout 30 detik. Ini batas konservatif pengujian, bukan klaim kapasitas satu kelas.

Contoh menjalankan setelah environment aman tersedia:

```sh
cd /home/hwanglab-iis/Desktop/vinsa_backend/react-native-lingua/vision-agent
.venv/bin/python serve_secure.py serve --host 127.0.0.1 --port 8011
```

Jangan meletakkan kunci pada argumen CLI atau `EXPO_PUBLIC_*`. Gunakan environment service/file terbatas. Proses `main.py` yang aktif belum diganti oleh entry point ini.

## Syarat sebelum perpindahan layanan

1. Tentukan URL HTTPS/reverse proxy agent dan jaringan akses backend Expo; IP HTTP port 8010 bukan URL produksi yang layak untuk aplikasi siswa.
2. Implementasikan dan uji autentikasi Clerk, kepemilikan call/session, persetujuan wali, rate limit per akun, serta sanitasi konten/prompt pada backend API.
3. Konfigurasikan shared secret backend–agent dan uji penolakan tanpa/salah token. Jangan mengekspos secret ke aplikasi.
4. Pindahkan jalur produksi secara terencana; tutup akses langsung entry point lama agar proteksi tidak dapat dilewati. Hindari `pkill -f` yang dapat menghentikan proses lain.
5. Selesaikan review data vendor, retensi/log transkrip, dan pengujian keluaran suara anak. Jangan mengaktifkan AI siswa hanya karena health check lolos.
6. Ukur percakapan dari perangkat Taiwan: waktu mulai sesi, waktu akhir ucapan → respons suara pertama, keberhasilan transkripsi, interupsi, dan biaya. Catat median/p95 serta jaringan dan jumlah sesi.

Koneksi SSH dan pemeriksaan server tidak otomatis mengganti konfigurasi backend Expo yang masih memiliki fallback Railway di kode sebelumnya. Deploy API dan perpindahan agent perlu dilakukan bersama setelah gerbang di atas lulus.
