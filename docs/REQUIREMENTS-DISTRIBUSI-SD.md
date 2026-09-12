# Requirement aplikasi pembelajaran bahasa untuk siswa SD

Tanggal: 12 September 2026. Status: draf spesifikasi produk dan kriteria rilis, bukan pernyataan aplikasi sudah siap distribusi.

Dokumen ini disusun dari peninjauan kode proyek dan sumber resmi. Temuan kode merupakan tinjauan statis; build, layanan produksi, kontrak vendor, dan penggunaan langsung oleh anak belum diverifikasi. Semua angka kapasitas, durasi, dan target mutu di bawah adalah usulan penerimaan produk yang perlu disepakati sekolah.

## 1. Tujuan dan keputusan produk

Aplikasi membantu siswa berlatih kosakata, menyimak, membaca, dan berbicara melalui pelajaran pendek dengan pendampingan guru atau orang tua. AI merupakan alat latihan, tidak menggantikan guru atau menentukan nilai rapor.

Target yang telah dikonfirmasi pengguna: **siswa sekolah dasar di Taiwan**, usia sekitar 6–12 tahun. Bahasa yang dipelajari adalah Bahasa Indonesia sesuai materi dan sumber e-book yang diminta. Default rancangan antarmuka serta penjelasan tutor adalah **Mandarin Tradisional Taiwan (zh-TW)**; kosakata dan contoh pelafalan tetap Bahasa Indonesia. Android masih merupakan usulan platform pilot, belum konfirmasi perangkat.

Keputusan yang harus ditutup sebelum pengembangan rilis:

| Keputusan | Usulan awal | Penanggung jawab |
| --- | --- | --- |
| Negara dan jenjang sasaran | Dikonfirmasi: siswa SD Taiwan | Pengguna |
| Siswa dan kelas pilot | Kelas IV–VI, didampingi; kelas I–III setelah validasi tersendiri | Sekolah + pemilik produk |
| Bahasa yang dipelajari | Bahasa Indonesia, mengikuti materi aktif dan e-book yang diminta | Koordinator akademik |
| Bahasa instruksi | Default rancangan zh-TW; sesuaikan tingkat baca dengan kelas dan review guru Taiwan | Koordinator akademik |
| Bentuk distribusi | Pilot sekolah terbatas, kemudian perluasan bertahap | Pemilik produk |
| Perangkat | Satu profil siswa aktif per perangkat; pergantian pengguna harus aman | Sekolah + engineering |
| AI | Opsional dan didampingi; kamera anak mati secara default | Sekolah + penanggung jawab perlindungan anak |
| Anggaran | Tetapkan biaya maksimum per siswa/bulan dan jumlah sesi bersamaan | Pemilik anggaran |
| Pengelola data | Tetapkan badan/pihak pengelola, kontak privasi, serta hubungan sekolah dan vendor | Pengelola + penanggung jawab hukum |

Tidak mengasumsikan targetnya belajar Bahasa Inggris: materi aktif saat ini justru mengajarkan Bahasa Indonesia, dengan bagian penjelasan Inggris dan Mandarin Tradisional.

**P0 lokalisasi Taiwan:** navigasi, onboarding, soal/instruksi, error, bantuan, dan informasi wali memakai Mandarin Tradisional yang sederhana. AI menjelaskan dalam Mandarin Taiwan dan memberi contoh dalam Bahasa Indonesia; bahasa Inggris tidak menjadi prasyarat. Guru Taiwan memeriksa istilah, tingkat baca, serta kecocokan materi K12EA. Dukungan audio instruksi penting bagi pembaca pemula. Dokumen requirement tetap berbahasa Indonesia untuk tim pengembang.

## 2. Kondisi proyek yang ditemukan

| Bagian | Bukti kode | Implikasi requirement |
| --- | --- | --- |
| Pelajaran, kosakata, latihan | data/lessons/indonesian.ts, app/practice/[id].tsx, app/learning-material/[id].tsx | Fondasi tersedia; perlu audit umur, tujuan, bahasa, dan jawaban |
| Rencana harian dan XP | app/today-plan.tsx, store/learningStore.ts | Progres lokal ada; bukan pelaporan sekolah lintas perangkat |
| Guru AI | app/lesson/[id].tsx, vision-agent/main.py | Integrasi tersedia; keselamatan, kapasitas, dan kualitas anak perlu diuji |
| Autentikasi | app/(auth)/, app/api/stream-token+api.ts | Clerk digunakan; alur wali dan otorisasi perlu dilengkapi |
| Sesi AI | app/api/agent-session+api.ts | POST/DELETE tidak memperlihatkan autentikasi dan pemeriksaan kepemilikan sesi; penghalang rilis AI |
| Penyimpanan | learning-storage dan language-storage memakai kunci tetap | Belum dipisahkan berdasarkan pengguna pada konfigurasi store; risiko perangkat bersama |
| Analitik | lib/posthog.ts, app/_layout.tsx | Pelacakan dan identifikasi ada; pengiriman data serta alur persetujuan perlu diaudit |
| Chat → Informasi | app/(tabs)/chat.tsx saat ini hanya menampilkan judul | Ganti label dan ikon menjadi Informasi; isi dengan akses sumber e-book Bahasa Indonesia sesuai F19 |
| “Class management” | data/classManagement.ts berisi dialog pembelajaran | Bukan sistem daftar siswa, tugas guru, atau dashboard kelas |
| Bahasa | data/languages.ts, lib/instructionLanguage.ts, store/languageStore.ts | Perlu penyelarasan bahasa materi, instruksi, dan antarmuka |
| Build | eas.json berisi preview dan production | Konfigurasi bukan bukti build berhasil atau toko menyetujui |
| Dependensi dan pemeriksaan | store mengimpor Zustand; package.json belum mendeklarasikan Zustand dan belum memiliki script typecheck | Deklarasi dependensi dan pemeriksaan reproduksibilitas harus dibereskan sebelum rilis |

## 3. Cakupan dan prioritas

- **P0:** wajib sebelum pilot siswa menggunakan fitur terkait. Fitur AI boleh dikeluarkan sepenuhnya dari pilot jika belum memenuhi P0 AI.
- **P1:** wajib sebelum distribusi luas sesuai model operasional yang dipilih.
- **P2:** pengembangan berikutnya, bukan syarat pilot.

Pilot mencakup onboarding pendamping, profil siswa minimal, materi terkurasi, latihan, progres lokal, ringkasan belajar pada perangkat, kontrol pendamping, bantuan, dan privasi. AI ditambahkan hanya setelah lulus gerbang khusus.

Di luar pilot: percakapan antarsiswa, pesan dari orang asing, feed publik, leaderboard publik, iklan, pembelian oleh anak, unggahan publik, dan penilaian berisiko tinggi oleh AI.

Tetap mengikuti AGENTS.md: konten JSON/TypeScript, Zustand dan AsyncStorage, Clerk, backend untuk operasi aman, tanpa database baru. Dashboard guru jarak jauh, sinkronisasi perangkat, serta penyimpanan terpusat bukan kemampuan yang boleh dijanjikan dalam arsitektur ini. Jika diwajibkan sekolah, perlu keputusan perubahan cakupan dan arsitektur terlebih dahulu.

## 4. Pengguna dan hak akses

| Peran | Hak akses | Batasan |
| --- | --- | --- |
| Siswa | Membuka materi sesuai tingkat, latihan, melihat progres sendiri, menghentikan AI, meminta bantuan | Tidak mengubah persetujuan, membuka data siswa lain, atau mengakses pengaturan vendor |
| Orang tua/wali | Aktivasi, persetujuan, kontrol fitur AI, batas penggunaan, ringkasan anak, permintaan penghapusan | Hanya anak yang menjadi tanggung jawabnya |
| Guru pendamping | Memilih materi, mendampingi praktik, meninjau hasil yang dibagikan secara sah | Tidak otomatis menggantikan persetujuan wali atau melihat percakapan privat |
| Operator sekolah | Instalasi, bantuan teknis, koordinasi daftar perangkat | Tidak perlu akses audio/video atau kata sandi |
| Pengelola layanan | Konfigurasi, respons insiden, penghentian layanan AI | Akses minimum dan operasi administratif tercatat |

Untuk pilot tanpa database, administrasi persetujuan dapat menggunakan prosedur sekolah yang terdokumentasi dan akses terbatas. Aktivasi AI tetap membutuhkan pemeriksaan status otorisasi di server melalui mekanisme yang dapat diaudit; flag AsyncStorage saja tidak memadai. Jangan membuka AI jika mekanisme tersebut belum ditetapkan.

## 5. Requirement fungsional dan penerimaan

| ID | Prioritas | Requirement | Kriteria penerimaan |
| --- | --- | --- | --- |
| F01 | P0 | Pendamping mengaktifkan penggunaan sebelum pengumpulan data anak | Akun baru belum mengirim data anak/AI sebelum alur yang sesuai selesai; penolakan menyediakan jalur materi lokal |
| F02 | P0 | Akun pendamping memakai Clerk; anak tidak diwajibkan mempunyai email, nomor telepon, atau akun sosial pribadi | Siswa dapat masuk ke pengalaman belajar melalui profil yang diaktifkan pendamping |
| F03 | P0 | Profil minimal: ID lokal/acak, nama panggilan, kelompok kelas, bahasa | Tidak meminta alamat, NIK, tanggal lahir lengkap, foto wajah, atau lokasi untuk fungsi belajar |
| F04 | P0 | Pengaturan pendamping terlindungi | Anak tidak dapat mengubah izin, membuka tautan eksternal, atau menghapus profil hanya dari tombol biasa; tindakan sensitif memerlukan autentikasi ulang pendamping |
| F05 | P0 | Pelajaran tersusun per tingkat dan tujuan | Setiap materi memiliki ID stabil, tujuan, prasyarat, urutan, estimasi durasi, versi, dan reviewer guru |
| F06 | P0 | Alur pelajaran pendek: contoh → latihan → umpan balik → ringkasan | Siswa dapat menyelesaikan satu pelajaran dan mengulang tanpa bantuan teknis; target 5–10 menit |
| F07 | P0 | Latihan membaca/menyimak memakai jawaban terkurasi | Jawaban benar, opsi, petunjuk, kapitalisasi, spasi, dan variasi jawaban diuji; jawaban salah diberi penjelasan ramah |
| F08 | P0 | Audio dapat diputar ulang dan memiliki teks | Penolakan mikrofon tidak menghalangi materi; kegagalan TTS menampilkan alternatif; kemampuan offline hanya diklaim untuk audio yang terbukti tersedia |
| F09 | P0 | Progres tersimpan sesudah aktivitas | Tutup paksa dan buka kembali tidak menggandakan XP atau mencampur profil; pergantian tanggal tidak merusak progres |
| F10 | P0 | Resume setelah interupsi | Telepon masuk, background, koneksi putus, dan tombol kembali menghasilkan keadaan yang jelas dan dapat dilanjutkan |
| F11 | P0 | Materi inti dapat diakses offline setelah pemasangan/persiapan | Mode pesawat masih membuka paket lokal dan menyimpan latihan; AI ditandai perlu internet; aktivasi awal boleh online |
| F12 | P0 | Gamifikasi mendukung belajar | Tidak ada hukuman, tekanan membeli, mempermalukan, atau ranking publik; streak putus memakai pesan netral |
| F13 | P0 | Ringkasan lokal untuk pendamping | Menunjukkan materi selesai, jumlah latihan, dan bagian yang perlu diulang; tidak mengklaim XP sebagai nilai akademik |
| F14 | P0 | Penggunaan perangkat bersama aman | Uji akun/profil A → keluar → B: progres, transkrip, identitas, dan sesi A tidak terlihat; token dibersihkan sesuai lifecycle |
| F15 | P0 | Hapus data dan cabut izin dapat diakses pendamping | Penghapusan lokal, akun layanan, serta permintaan penghapusan vendor dibedakan; proses mempunyai status dan kontak bantuan |
| F16 | P0 | Bantuan tersedia dalam bahasa sederhana | Ada panduan audio/mikrofon, koneksi, progres hilang, dan kontak sekolah; siswa bisa meminta bantuan tanpa menulis data sensitif |
| F17 | P1 | Pelaporan sekolah sesuai kebutuhan yang disepakati | Untuk model lokal, laporan dibagikan pendamping secara sadar dengan data minimum; tidak ada sinkronisasi otomatis yang dijanjikan |
| F18 | P2 | Penugasan dan dashboard guru lintas perangkat | Baru masuk pengembangan setelah persetujuan penyimpanan, otorisasi kelas, dan aturan akses data |
| F19 | P0 | Ganti tab Chat menjadi Informasi untuk mencari e-book Bahasa Indonesia | Label, ikon informasi, isi halaman, akses sumber resmi, pembatasan tautan eksternal untuk anak, dan kondisi gagal memenuhi rincian bagian 5.1 |

### 5.1. Menu Informasi: e-book Bahasa Indonesia

Revisi atas permintaan pengguna: menu Chat diganti menjadi **Informasi** (Information). Halaman ini membantu siswa menemukan dokumen dan e-book tambahan untuk belajar Bahasa Indonesia.

**Penyesuaian target Taiwan:** teks Indonesia pada rincian berikut merupakan penjelasan untuk pengembang. Teks UI utama menggunakan zh-TW: label tab **資訊**, judul **印尼語電子書**, tombol **尋找印尼語電子書**, pengantar **想學更多印尼語嗎？來找找課本和學習資料吧！**, dan petunjuk **點選「線上閱覽」看書，或請老師、家長協助下載及選書。** Label pembaca layar juga memakai zh-TW. Seluruh terjemahan final ditinjau guru Taiwan sebelum rilis.

- **Navigasi:** ganti label Chat menjadi Informasi dan ikon gelembung percakapan menjadi ikon informasi berbentuk “i” dalam lingkaran. Gunakan ikon dari library yang sudah tersedia, misalnya Ionicons information-circle-outline/information-circle untuk keadaan tidak aktif/aktif. Label pembaca layar: “Informasi”.
- **Judul halaman:** “E-book Bahasa Indonesia”.
- **Teks pengantar:** “Ingin belajar lebih banyak? Temukan buku dan bahan belajar Bahasa Indonesia di sini.”
- **Kartu sumber:** “Buku Bahasa Indonesia — K12 Education Administration, Taiwan”, dengan keterangan singkat “Pilih buku untuk dibaca online atau lihat pilihan unduhan di situs sumber.”
- **Tombol utama:** “Cari E-book Bahasa Indonesia”, menuju URL tetap https://mkm.k12ea.gov.tw/textbook/material/2?type=1. Pencarian/pemilihan buku dilakukan di situs sumber; versi awal tidak membutuhkan mesin pencarian, database, atau katalog tersinkronisasi di aplikasi.
- **Petunjuk sederhana:** “Situs ini menggunakan bahasa Mandarin. 線上閱覽 berarti Baca online, dan 離線下載 berarti Unduh. Mintalah bantuan guru atau orang tua untuk memilih buku.”
- **Perpindahan ke situs:** jelaskan bahwa tautan membuka situs luar dan membutuhkan internet. Ikuti kontrol pendamping F04 sebelum membuka browser; kembali dari browser mengembalikan siswa ke halaman Informasi tanpa kehilangan progres.
- **Kondisi gagal:** jika perangkat diketahui offline atau tautan tidak dapat dibuka, tampilkan “Belum bisa membuka e-book. Periksa internet atau minta bantuan guru.” dan tombol “Coba lagi”. Kegagalan halaman setelah terbuka mengikuti tampilan browser; aplikasi tidak mengklaim bisa mendeteksi seluruh gangguan situs luar.
- **Privasi:** jangan menambahkan nama, ID siswa, email, token, atau progres ke URL. Tampilkan identitas sumber; kunjungan browser mengikuti praktik privasi situs tersebut.
- **Batas cakupan:** halaman informasi dapat dibaca offline, tetapi katalog luar membutuhkan internet. Unduhan dikelola situs/browser; tidak ada unduhan otomatis, penyalinan buku ke aplikasi, atau janji semua buku tersedia offline. Guru tetap memilih materi sesuai usia; nomor jilid bukan otomatis nomor kelas SD.

Sumber yang diperiksa menampilkan materi Bahasa Indonesia dengan pilihan baca online dan unduhan pada daftar buku. Ketersediaan serta format setiap dokumen perlu diperiksa saat implementasi dan sebelum rilis. [Katalog materi Bahasa Indonesia — situs K12EA](https://mkm.k12ea.gov.tw/textbook/material/2?type=1).

**Uji penerimaan F19:** (1) tab menampilkan ikon dan label Informasi; (2) halaman berisi judul, pengantar, kartu sumber, petunjuk, dan tombol; (3) setelah kontrol pendamping, tombol membuka URL tepat di atas; (4) pembatalan tetap di aplikasi; (5) kegagalan membuka tautan memberi pesan dan bisa dicoba lagi; (6) kembali ke aplikasi mempertahankan progres; (7) URL tidak membawa data siswa. Perubahan ini merupakan requirement, belum implementasi UI.

## 6. Konten dan pedagogi

- **P0:** guru SD dan pengajar bahasa memeriksa seluruh paket pilot, termasuk gambar, suara, instruksi, terjemahan, dan jawaban. Materi yang belum disetujui tidak ditampilkan.
- **P0:** matriks materi menghubungkan tujuan belajar sekolah dengan aktivitas dan bukti keberhasilan. Jangan menyebut selaras kurikulum resmi sebelum pemetaan disahkan guru.
- **P0:** kelas I–II memakai instruksi audio/gambar dan minim mengetik; kelas III–IV memakai kata serta kalimat pendek; kelas V–VI memakai dialog sederhana. Tidak cukup mengganti label kelas pada materi yang sama.
- **P0:** contoh memakai konteks aman dan dekat dengan kehidupan anak. Dialog yang ditemukan tentang memasukkan steker ke stopkontak harus diganti dengan konteks aman atau diperjelas sebagai simulasi oleh orang dewasa; aplikasi tidak menyuruh anak mempraktikkannya.
- **P0:** satu instruksi per langkah, koreksi tidak mengejek, tidak menganggap aksen atau kesulitan bicara sebagai kemalasan. Hasil pengenalan suara dapat salah dan bisa dilewati.
- **P0:** bahasa UI, soal, penjelasan guru, dan pesan error konsisten dengan bahasa instruksi yang dipilih.
- **Usulan paket pilot:** 4 unit × 5 pelajaran, masing-masing 3–5 kosakata dan 3–5 aktivitas; jumlah final mengikuti review guru.
- **P0:** identitas merek, komik, ilustrasi, musik, font, dan suara memiliki izin distribusi. Inspirasi Duolingo tidak berarti boleh memakai merek atau asetnya.

## 7. Requirement khusus AI, audio, dan video

| ID | Prioritas | Requirement dan penerimaan |
| --- | --- | --- |
| AI01 | P0 AI | Jelaskan “ini tutor AI, jawabannya bisa keliru”; tidak mengaku manusia atau teman rahasia anak |
| AI02 | P0 AI | AI hanya menerima pelajaran/topik yang diizinkan server; prompt dan profil yang dikirim klien tidak boleh mengganti aturan keselamatan |
| AI03 | P0 AI | Validasi autentikasi Clerk pada token, mulai sesi, dan hapus sesi; periksa kepemilikan call/session dan status izin; akses lintas pengguna ditolak |
| AI04 | P0 AI | Backend agent tidak dapat dipanggil langsung tanpa otorisasi layanan; rahasia hanya di server; verifikasi JWT mencakup algoritme, issuer, waktu berlaku, dan klaim penerima yang relevan |
| AI05 | P0 AI | Filter dan pengujian berlapis untuk kekerasan, seksual, kebencian, perundungan, instruksi berbahaya, dan permintaan data pribadi; prompt saja bukan bukti aman |
| AI06 | P0 AI | Anak selalu punya tombol berhenti; hentikan pengiriman mikrofon/kamera saat selesai, background sesuai kebijakan, izin dicabut, atau sesi kedaluwarsa |
| AI07 | P0 AI | Kamera mati default, bukan syarat latihan; mikrofon diminta saat dipakai dengan penjelasan; izin OS bukan pengganti persetujuan wali |
| AI08 | P0 AI | Output suara harus melalui kontrol keselamatan yang layak sebelum didengar anak. Jika pipeline realtime belum dapat memenuhi ini, gunakan dialog terbatas/terkurasi atau nonaktifkan AI |
| AI09 | P0 AI | AI tidak meminta nama lengkap, alamat, sekolah spesifik, foto, kontak, atau rahasia; tidak menjanjikan kerahasiaan ketika anak mengungkap bahaya |
| AI10 | P0 AI | Respons situasi berbahaya mengarahkan anak meminta bantuan orang dewasa tepercaya; SOP sekolah menangani laporan, bukan diagnosis atau penanganan oleh chatbot |
| AI11 | P0 AI | Usulan sesi maksimum 5 menit, 2 sesi/hari/profil dan satu sesi aktif; batas ditegakkan server; retry tidak memulai sesi berbayar ganda |
| AI12 | P0 AI | Saat lambat/putus/kuota habis, siswa mendapat pesan jelas dan kembali ke latihan terkurasi tanpa kehilangan progres |
| AI13 | P0 AI | Rekaman audio/video dinonaktifkan default; transkrip sementara dihapus saat sesi berakhir; kebijakan vendor diverifikasi terpisah dari perilaku aplikasi |
| AI14 | P0 AI | Umpan balik pelafalan bersifat latihan dan dapat diulang; bukan nilai rapor, diagnosis, atau penilaian kemampuan intelektual |
| AI15 | P0 AI | Tersedia pelaporan respons bermasalah dan penghentian AI dari sisi layanan; laporan memuat metadata minimum, bukan otomatis seluruh percakapan |

AI tidak boleh mempunyai kemampuan mengirim pesan ke pihak lain, membuka tautan sewenang-wenang, melakukan pembelian, atau menjalankan perintah perangkat.

## 8. Data, persetujuan, dan privasi

Matriks berikut adalah rancangan target, bukan klaim pengaturan vendor saat ini.

| Data | Tujuan dan lokasi | Retensi/penghapusan target |
| --- | --- | --- |
| Identitas pendamping | Autentikasi di Clerk | Selama akun aktif; penghapusan melalui prosedur akun/vendor |
| Profil anak minimal | Personalisasi pada perangkat | Sampai profil dihapus; jelaskan bahwa reinstall bisa menghilangkan data |
| Progres dan pengaturan | Zustand + AsyncStorage, terpisah per profil | Sampai reset/hapus profil; migrasi versi tidak merusak progres |
| Bukti persetujuan | Catatan akses terbatas: versi pemberitahuan, waktu, pemberi izin, fitur yang disetujui | Jadwal ditetapkan pengelola sebelum pilot; tidak menyimpan bukti hanya di flag perangkat |
| Token autentikasi | Cache aman melalui SecureStore/Clerk | Sampai kedaluwarsa/logout; tidak masuk log atau AsyncStorage biasa |
| Audio/video sesi | Pemrosesan Stream dan penyedia AI saat fitur diaktifkan | Tidak direkam aplikasi; retensi pihak ketiga harus diverifikasi dan diungkapkan sebelum digunakan |
| Transkrip | Konteks sesi sementara | Hapus setelah sesi; pengecualian pelaporan perlu dasar dan akses yang jelas |
| Log operasional | Kode error, versi aplikasi, latensi tanpa isi percakapan | Usulan 30 hari lalu hapus otomatis |
| Laporan insiden | Penanganan oleh petugas terbatas | Jadwal khusus sesuai kebutuhan kasus dan kewajiban yang berlaku |
| Analitik perilaku | Tidak diperlukan untuk fungsi inti | Nonaktifkan untuk pilot anak; jangan identifikasi anak ke PostHog |

**P0:** inventarisasi semua penerima data, termasuk Clerk, Stream, layanan AI/transkripsi/TTS, hosting API/agent, PostHog bila aktif, dan permintaan aset eksternal. Catat jenis data, tujuan, lokasi pemrosesan, subprosesor, akses dukungan, retensi, serta ketentuan penggunaan untuk layanan yang ditujukan kepada anak.

**P0:** persetujuan terpisah untuk pemrosesan inti dan AI opsional; penolakan AI tidak menghalangi materi lokal. Persetujuan dapat dicabut; server menolak sesi baru setelah pencabutan. Jangan menyebut anak sudah memberi persetujuan hanya karena mengetuk “setuju”.

**P0:** pemberitahuan ringkas yang bisa dipahami anak dan kebijakan lengkap bagi wali tersedia sebelum aktivasi. Jelaskan pemrosesan lintas negara, keterbatasan offline, hilangnya progres saat uninstall, dan cara meminta akses/koreksi/hapus.

**P0:** target operasional usulan: permintaan privasi diterima maksimal 2 hari kerja dan diselesaikan dalam 30 hari, atau lebih cepat bila hukum mewajibkan. Log penghapusan tidak menyimpan kembali isi data yang dihapus.

## 9. Kepatuhan dan kebijakan distribusi

**Wilayah utama: Taiwan.** Kajian privasi berangkat dari Personal Data Protection Act Taiwan (個人資料保護法). Pemberitahuan pengumpulan data perlu menjelaskan pengelola, tujuan, jenis data, periode/wilayah/pihak/cara penggunaan, hak pengguna, dan dampak jika data tidak diberikan, dengan memperhatikan pengecualian hukum yang berlaku. Sebelum pilot, petugas hukum menetapkan dasar pemrosesan sesuai peran sekolah/pengelola, ketentuan yang sudah efektif, transfer lintas negara, serta prosedur akses, koreksi, penghapusan, dan insiden. [Sumber resmi PDPA Taiwan](https://law.pdpc.gov.tw/LawContent.aspx?id=FL010627).

**P0:** alur aktivasi dan persetujuan wali ditinjau menurut ketentuan kapasitas anak dan perwakilan hukum di Taiwan; jangan menyalin aturan batas umur negara lain. Civil Code memuat ketentuan perwakilan dan persetujuan bagi pihak yang belum memiliki kapasitas hukum penuh. Kebijakan produk tetap mewajibkan pendamping untuk aktivasi dan fitur AI anak; ini bukan klaim bahwa semua pemrosesan hanya dapat berdasar persetujuan. [Civil Code Taiwan, terutama Pasal 76–79](https://mojlaw.moj.gov.tw/LawContentE.aspx?LSID=FL001351&media=print).

Dokumen wali, pemberitahuan data, dan kontak bantuan tersedia dalam Mandarin Tradisional. Hukum Indonesia tidak menjadi acuan utama hanya karena bahasa pelajarannya Bahasa Indonesia; kewajiban tambahan ditelaah jika lokasi pengelola atau operasi membuat hukum negara lain relevan. Checklist ini bukan jaminan kepatuhan hukum.

Google Play mewajibkan pengungkapan target usia, praktik data, serta kesesuaian API/SDK untuk layanan anak. Data mikrofon dan kamera termasuk data sensitif anak. **P0 toko:** audit SDK, izin manifest, Data safety, rating konten, dan kebijakan privasi terhadap perilaku build sebenarnya. [Google Play Families Policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en).

Untuk iOS, periksa ketentuan Kids Category serta privasi anak, parental gate, dan pembatasan analitik pihak ketiga. Jangan menganggap SDK analitik yang sudah terpasang otomatis boleh digunakan. **P0 toko:** keputusan kategori, rating, deklarasi privasi, dan review alur pendamping sebelum submission. [Apple App Review Guidelines, terutama 1.3 dan 5.1](https://developer.apple.com/app-store/review/guidelines/).

Distribusi APK terbatas tidak menghapus kewajiban melindungi data anak. Jika wilayah sasaran berbeda, lakukan pemetaan hukum setempat sebelum mengumpulkan data. Persetujuan sekolah juga tidak otomatis menggantikan persetujuan wali.

## 10. Kualitas teknis, aksesibilitas, dan kinerja

| ID | Prioritas | Target penerimaan usulan |
| --- | --- | --- |
| Q01 | P0 | Build bersih dari lockfile berhasil; npm run lint dan npm run typecheck lulus setelah script tersedia; dependensi langsung dinyatakan |
| Q02 | P0 | TypeScript ketat, tanpa secret di bundle/log; API membatasi input, ukuran body, rate, timeout, dan hak akses |
| Q03 | P0 | Target perangkat pilot ditetapkan dari inventaris sekolah; uji ponsel RAM 3 GB dan layar kecil sekitar 360 dp, serta tablet yang benar-benar digunakan |
| Q04 | P0 | Usulan: 95% cold start ≤5 detik pada perangkat acuan, membuka materi lokal ≤1 detik setelah aplikasi siap |
| Q05 | P0 AI | Usulan: 95% mulai sesi ≤10 detik dan respons awal setelah ujaran ≤5 detik pada jaringan uji yang dicatat; tampilkan fallback bila terlampaui |
| Q06 | P0 | Tidak ada progres silang, XP ganda karena retry, kehilangan progres saat restart normal, atau crash pada seluruh skenario wajib |
| Q07 | P0 | Target sentuh ≥48 dp; teks utama sekitar 16 sp, pembesaran font 200% tanpa tombol hilang; informasi tidak hanya mengandalkan warna |
| Q08 | P0 | Label pembaca layar, urutan fokus, teks pendamping audio, animasi yang dapat dikurangi, dan kontras target 4,5:1 untuk teks biasa diuji |
| Q09 | P0 | Aset inti tersedia lokal, lisensinya tercatat; UI tidak bergantung pada layanan bendera/gambar eksternal untuk belajar offline |
| Q10 | P0 | Session cleanup, cache migration, pemulihan storage gagal, dan ruang penyimpanan rendah memiliki perilaku yang jelas |
| Q11 | P1 | Usulan reliabilitas: ≥99,5% sesi aplikasi tanpa crash selama pilot; ukur agregat dengan metode yang lolos kajian privasi, sertakan jumlah sampel |
| Q12 | P0 AI | Uji beban setidaknya kapasitas kelas yang dijanjikan, misalnya 30 sesi serentak; bila tidak mampu, batasi giliran dan komunikasikan kapasitas |

Versi OS minimum harus mengikuti dukungan aktual Expo/RN/SDK pada build. Nilai minSdkVersion di konfigurasi saja tidak membuktikan semua versi Android tersebut dapat menjalankan aplikasi.

## 11. Operasional dan paket distribusi

**Sebelum pilot:** tetapkan pemilik rilis, guru reviewer, petugas perlindungan anak/privasi, dan dukungan teknis. Siapkan daftar perangkat, akun pendamping, instruksi instalasi, panduan 1 halaman bagi siswa, panduan wali, serta demonstrasi guru.

**Build:** identitas aplikasi dan branding final, penandatanganan dikelola aman, environment preview/production terpisah, endpoint production eksplisit, versi aplikasi dan konten tercatat. Kesesuaian frontend–backend diuji sebelum update.

**Distribusi:** mulai internal/closed testing Android dengan akses yang dikelola sekolah. Gunakan build native sesuai kebutuhan WebRTC, bukan menjadikan keberhasilan Expo Go sebagai bukti rilis. iOS merupakan gerbang tambahan bila sekolah membutuhkannya.

**Pemantauan:** pantau kesehatan backend, error rate, waktu respons, biaya dan kuota tanpa isi percakapan. Tetapkan batas pengeluaran harian/bulanan dan penghentian sesi server ketika batas tercapai.

**Insiden:** jika terjadi kebocoran, akses silang, atau output AI berbahaya, hentikan fitur terkait, batasi akses, simpan bukti minimum secara aman, hubungi penanggung jawab, dan ikuti tenggat pemberitahuan yang berlaku. Target internal usulan: menonaktifkan AI dalam 15 menit sejak insiden terkonfirmasi selama jam pilot; tidak menjanjikan layanan 24 jam tanpa petugas.

**Pemulihan:** dokumentasikan cara kembali ke build/backend sebelumnya dan verifikasi migrasi data. Perubahan modul native memerlukan build baru. Jangan mengasumsikan channel di eas.json membuktikan OTA telah siap.

## 12. Pengujian dan gerbang go/no-go

| Kelompok uji | Skenario wajib | Bukti kelulusan |
| --- | --- | --- |
| Pembelajaran | Mulai → jawab benar/salah → selesai → ulang → resume | Catatan UAT tiap tingkat dan persetujuan guru |
| Akun/perangkat | Logout/login, A→B, reinstall, reset data, izin dicabut | Tidak ada data silang; kehilangan data yang memang tak didukung pemulihannya dijelaskan |
| Koneksi | Mode pesawat, jaringan lambat, putus tengah sesi, backend mati | Latihan lokal tetap berfungsi; AI berhenti/fallback dengan jelas |
| Otorisasi | Tanpa token, token kedaluwarsa, call/session milik orang lain, akses langsung agent | Semua permintaan yang tidak berhak ditolak |
| AI safety | Usulan ≥100 kasus: keluar topik, prompt injection, seksual, bahaya, identitas pribadi, perundungan, aksen anak | Tidak ada keluaran kritis pada suite rilis; tetap ada monitoring karena ini bukan jaminan semua keluaran aman |
| Privasi | Instalasi baru, sebelum izin, setelah menolak, setelah cabut, setelah hapus | Inspeksi jaringan/log membuktikan tidak ada pengiriman data di luar yang disetujui |
| Aksesibilitas | Font besar, screen reader, tanpa audio, tanpa mikrofon | Alur inti tetap dapat diselesaikan |
| Perangkat dan beban | Perangkat sekolah, interupsi, beberapa sesi serentak | Laporan build, crash, latensi, dan biaya dengan kondisi pengujian |

Usulan pilot: 1–2 kelas, 20–30 siswa, 2 minggu, persetujuan wali dan pendampingan. Ukur kemampuan menyelesaikan alur, kesalahan UI, kestabilan, dan manfaat menurut guru; hindari eksperimen tanpa persetujuan atau pengumpulan rekaman untuk analisis rutin.

Target usulan: ≥90% peserta menyelesaikan pelajaran setelah pengarahan awal tanpa bantuan teknis berulang; ≥80% mencapai tujuan latihan terkurasi. Hasil ini merupakan indikator pilot, bukan bukti efektivitas pendidikan secara umum.

**Go pilot hanya jika:** semua P0 lingkup pilot lulus, tidak ada cacat keamanan/privasi kritis atau tinggi yang terbuka, konten disetujui guru, dokumen wali tersedia, dan tim mampu menghentikan fitur bermasalah. P0 AI yang belum lulus berarti AI dinonaktifkan dan tidak bisa diaktifkan lewat klien.

**Go distribusi luas hanya jika:** hasil pilot ditinjau, seluruh P1 model distribusi selesai, kapasitas dan biaya terukur, penghapusan data diuji lintas layanan, dukungan tersedia, serta kebijakan kanal distribusi dipenuhi. Ulangi pengujian AI ketika model, prompt, guardrail, atau vendor berubah.

## 13. Backlog implementasi yang disarankan

1. **Tetapkan produk dan materi:** negara/jenjang sudah ditetapkan SD Taiwan; selesaikan pilihan kelas pilot, materi Bahasa Indonesia, lokalisasi zh-TW, audit konten berbahaya, dan lisensi aset. Keluaran: paket pilot disetujui guru Taiwan.
2. **Tutup celah teknis:** auth dan kepemilikan semua sesi AI, pengamanan agent, isolasi store, perbaikan manifest dependensi dan typecheck. Keluaran: build bersih dan uji keamanan lulus.
3. **Bangun alur pendamping:** aktivasi, persetujuan, profil minimal, kontrol AI, hapus data, matikan analitik anak, inventaris vendor. Keluaran: alur data dapat dijelaskan dan diverifikasi.
4. **Lengkapi belajar dasar:** offline, audio alternatif, resume, ringkasan lokal, aksesibilitas, serta ganti placeholder Chat menjadi Informasi dengan akses e-book Bahasa Indonesia sesuai F19. Keluaran: siswa bisa belajar tanpa AI dan menemukan sumber belajar tambahan.
5. **Validasi AI opsional:** scope server, guardrail, kuota, penghentian layanan, retensi, pengujian anak dan beban. Keluaran: keputusan AI boleh/tidak untuk pilot.
6. **Jalankan pilot dan perbaiki:** UAT, dukungan, pengukuran minimum, evaluasi guru/wali. Keluaran: keputusan tertulis perluasan atau pengulangan pilot.
7. **Siapkan distribusi luas:** dokumen toko, deklarasi data, build final, kapasitas operasional. Dashboard lintas perangkat tetap menunggu keputusan arsitektur bila dibutuhkan.

Estimasi waktu dan biaya baru dibuat setelah keputusan pada bagian 1 ditutup dan kondisi build diverifikasi. Dokumen ini tidak mengubah kode aplikasi atau menyatakan masalah di atas sudah diperbaiki.
