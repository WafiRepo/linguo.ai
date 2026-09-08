import { ClassManagementTopic } from "@/types/classManagement";

export const CLASS_MANAGEMENT_TOPICS: ClassManagementTopic[] = [
  {
    id: "topik-1",
    title: "Topik 1",
    subtitle: "Instruksi di Kelas",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: stopkontak, tombol, volume.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Masukkan ke stopkontak / Baik Bu Guru, " +
      "(2) Tekan tombolnya / Sudah, (3) Besarkan suaranya sedikit / Baik. Tidak ada materi lain.",
    imageKey: "topik1Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa tentang stopkontak, tombol, dan volume. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Masukkan ke stopkontak.",
          zhTW: "把插頭插入插座。",
        },
        studentLine: {
          id: "Baik, Bu Guru.",
          zhTW: "好的，老師。",
        },
        expectedAnswers: [
          "Baik, Bu Guru",
          "Baik bu guru",
          "Baik Bu Guru",
          "Baik",
        ],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "topik1Panel1",
        studentImageKey: "topik1Panel2",
      },
      {
        guruLine: {
          id: "Tekan tombolnya.",
          zhTW: "按下按鈕。",
        },
        studentLine: {
          id: "Sudah.",
          zhTW: "好了。",
        },
        expectedAnswers: ["Sudah", "Sudah bu guru", "Sudah Bu Guru"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "topik1Panel3",
        studentImageKey: "topik1Panel4",
      },
      {
        guruLine: {
          id: "Besarkan suaranya sedikit.",
          zhTW: "把聲音調大一點。",
        },
        studentLine: {
          id: "Baik.",
          zhTW: "好的。",
        },
        expectedAnswers: ["Baik", "Baik bu guru", "Baik Bu Guru"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "topik1Panel5",
        studentImageKey: "topik1Panel6",
      },
    ],
  },
  {
    id: "topik-2",
    title: "Topik 2",
    subtitle: "Mengulas Pelajaran Kemarin",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: membuka kelas dan mengulas pelajaran sebelumnya.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Mari kita mengulas pelajaran kemarin / Baik, Bu Guru, " +
      "(2) Siapa yang masih ingat pelajaran kemarin? / Saya masih ingat, " +
      "(3) Apa yang kita pelajari kemarin? / Kami belajar salam. Tidak ada materi lain.",
    imageKey: "topik2Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa tentang mengulas pelajaran kemarin. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Mari kita mengulas pelajaran kemarin.",
          zhTW: "讓我們複習昨天的課程。",
        },
        studentLine: {
          id: "Baik, Bu Guru.",
          zhTW: "好的，老師。",
        },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik Bu Guru", "Baik"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "topik2Panel1",
        studentImageKey: "topik2Panel2",
      },
      {
        guruLine: {
          id: "Siapa yang masih ingat pelajaran kemarin?",
          zhTW: "誰還記得昨天的課程？",
        },
        studentLine: {
          id: "Saya masih ingat.",
          zhTW: "我還記得。",
        },
        expectedAnswers: ["Saya masih ingat", "Saya masih ingat, Bu Guru"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "topik2Panel3",
        studentImageKey: "topik2Panel4",
      },
      {
        guruLine: {
          id: "Apa yang kita pelajari kemarin?",
          zhTW: "我們昨天學了什麼？",
        },
        studentLine: {
          id: "Kami belajar salam.",
          zhTW: "我們學習了問候語。",
        },
        expectedAnswers: ["Kami belajar salam", "Belajar salam"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "topik2Panel5",
        studentImageKey: "topik2Panel6",
      },
    ],
  },
  {
    id: "topik-3",
    title: "Topik 3",
    subtitle: "Membuka Kelas dan Absensi",
    description:
      "Latih empat dialog guru–siswa dari gambar komik: salam pembuka, cek kesiapan, dan absensi.",
    comicScope:
      "Hanya empat percakapan di gambar: (1) Selamat pagi, anak-anak / Selamat pagi, Bu Guru, " +
      "(2) Kalian sudah siap? / Ya, kami siap, (3) Saya mulai mengabsen, Andi? / Hadir, " +
      "(4) Siti? / Hadir. Tidak ada materi lain.",
    imageKey: "topik3Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "empat dialog membuka kelas dan absensi. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Selamat pagi, anak-anak.",
          zhTW: "同學們早安。",
        },
        studentLine: {
          id: "Selamat pagi, Bu Guru.",
          zhTW: "老師早安。",
        },
        expectedAnswers: ["Selamat pagi, Bu Guru", "Selamat pagi Bu Guru", "Selamat pagi"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "topik3Panel1",
        studentImageKey: "topik3Panel2",
      },
      {
        guruLine: {
          id: "Kalian sudah siap?",
          zhTW: "你們準備好了嗎？",
        },
        studentLine: {
          id: "Ya, kami siap.",
          zhTW: "是的，我們準備好了。",
        },
        expectedAnswers: ["Ya, kami siap", "Kami siap", "Ya kami siap"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "topik3Panel3",
        studentImageKey: "topik3Panel4",
      },
      {
        guruLine: {
          id: "Saya mulai mengabsen. Andi?",
          zhTW: "我要開始點名。安迪？",
        },
        studentLine: {
          id: "Hadir.",
          zhTW: "到。",
        },
        expectedAnswers: ["Hadir", "Hadir, Bu Guru", "Hadir Bu Guru"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "topik3Panel6",
        studentImageKey: "topik3Panel7",
      },
      {
        guruLine: {
          id: "Siti?",
          zhTW: "西蒂？",
        },
        studentLine: {
          id: "Hadir.",
          zhTW: "到。",
        },
        expectedAnswers: ["Hadir", "Hadir, Bu Guru", "Hadir Bu Guru"],
        guruPanelIndex: 6,
        studentPanelIndex: 7,
        guruImageKey: "topik3Panel8",
        studentImageKey: "topik3Panel9",
      },
    ],
  },
];

export const BAGIAN_B_TOPICS: ClassManagementTopic[] = [
  {
    id: "b-topik-1",
    title: "Topik 1",
    subtitle: "Bersiap Memulai Pelajaran",
    description:
      "Latih lima dialog guru–siswa dari gambar komik: duduk, perhatian, lihat ke depan, buku, dan pensil.",
    comicScope:
      "Hanya lima percakapan di gambar: (1) Silakan duduk dulu / Baik, Bu Guru, " +
      "(2) Perhatikan! / Baik, (3) Lihat ke depan / Ya, Bu Guru, " +
      "(4) Keluarkan bukumu / Sudah, (5) Keluarkan pensilmu / Sudah. Tidak ada materi lain.",
    imageKey: "bagianBTopik1Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "lima dialog guru dan siswa saat bersiap memulai pelajaran: duduk, perhatian, lihat ke depan, buku, dan pensil. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Silakan duduk dulu.",
          zhTW: "請先坐下。",
        },
        studentLine: {
          id: "Baik, Bu Guru.",
          zhTW: "好的，老師。",
        },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik Bu Guru", "Baik"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik1Panel1",
        studentImageKey: "bagianBTopik1Panel2",
      },
      {
        guruLine: {
          id: "Perhatikan!",
          zhTW: "請注意！",
        },
        studentLine: {
          id: "Baik.",
          zhTW: "好的。",
        },
        expectedAnswers: ["Baik", "Baik bu guru", "Baik Bu Guru"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik1Panel3",
        studentImageKey: "bagianBTopik1Panel4",
      },
      {
        guruLine: {
          id: "Lihat ke depan.",
          zhTW: "看前面。",
        },
        studentLine: {
          id: "Ya, Bu Guru.",
          zhTW: "好的，老師。",
        },
        expectedAnswers: ["Ya, Bu Guru", "Ya bu guru", "Ya"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik1Panel5",
        studentImageKey: "bagianBTopik1Panel6",
      },
      {
        guruLine: {
          id: "Keluarkan bukumu.",
          zhTW: "把課本拿出來。",
        },
        studentLine: {
          id: "Sudah.",
          zhTW: "好了。",
        },
        expectedAnswers: ["Sudah", "Sudah bu guru", "Sudah Bu Guru"],
        guruPanelIndex: 6,
        studentPanelIndex: 7,
        guruImageKey: "bagianBTopik1Panel7",
        studentImageKey: "bagianBTopik1Panel8",
      },
      {
        guruLine: {
          id: "Keluarkan pensilmu.",
          zhTW: "把筆拿出來。",
        },
        studentLine: {
          id: "Sudah.",
          zhTW: "好了。",
        },
        expectedAnswers: ["Sudah", "Sudah bu guru", "Sudah Bu Guru"],
        guruPanelIndex: 8,
        studentPanelIndex: 9,
        guruImageKey: "bagianBTopik1Panel9",
        studentImageKey: "bagianBTopik1Panel10",
      },
    ],
  },
  {
    id: "b-topik-2",
    title: "Topik 2",
    subtitle: "Menunjukkan Gambar dan Video",
    description:
      "Latih dua dialog guru–siswa dari gambar komik: menunjukkan gambar sekolah dan mengajak menonton video.",
    comicScope:
      "Hanya dua percakapan di gambar: (1) Lihat gambar ini. Apa yang kalian lihat? / Saya melihat sekolah, " +
      "(2) Bagus sekali. Mari lihat video. / Baik. Tidak ada materi lain.",
    imageKey: "bagianBTopik2Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "dua dialog guru dan siswa saat guru menunjukkan gambar dan mengajak menonton video. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Lihat gambar ini. Apa yang kalian lihat?",
          zhTW: "看這張圖片。你們看到了什麼？",
        },
        studentLine: {
          id: "Saya melihat sekolah.",
          zhTW: "我看到學校。",
        },
        expectedAnswers: [
          "Saya melihat sekolah",
          "Saya melihat sekolah, Bu Guru",
          "Melihat sekolah",
        ],
        guruPanelIndex: 0,
        studentPanelIndex: 2,
        guruImageKey: "bagianBTopik2Panel1",
        studentImageKey: "bagianBTopik2Panel3",
      },
      {
        guruLine: {
          id: "Bagus sekali. Mari lihat video.",
          zhTW: "非常好。我們來看影片。",
        },
        studentLine: {
          id: "Baik.",
          zhTW: "好的。",
        },
        expectedAnswers: ["Baik", "Baik bu guru", "Baik Bu Guru"],
        guruPanelIndex: 3,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik2Panel4",
        studentImageKey: "bagianBTopik2Panel6",
      },
    ],
  },
  {
    id: "b-topik-3",
    title: "Topik 3",
    subtitle: "Membuka Buku dan Halaman",
    description:
      "Latih satu dialog guru–siswa dari gambar komik: mengeluarkan buku dan membuka halaman 10.",
    comicScope:
      "Hanya satu percakapan di gambar: Keluarkan bukumu. Buka halaman 10. / Sudah, Bu Guru. " +
      "Tidak ada materi lain.",
    imageKey: "bagianBTopik3Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "satu dialog guru dan siswa tentang mengeluarkan buku dan membuka halaman. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Keluarkan bukumu. Buka halaman 10.",
          zhTW: "把課本拿出來。翻到第十頁。",
        },
        studentLine: {
          id: "Sudah, Bu Guru.",
          zhTW: "好了，老師。",
        },
        expectedAnswers: ["Sudah, Bu Guru", "Sudah bu guru", "Sudah Bu Guru", "Sudah"],
        guruPanelIndex: 0,
        studentPanelIndex: 2,
        guruImageKey: "bagianBTopik3Panel1",
        studentImageKey: "bagianBTopik3Panel3",
      },
    ],
  },
  {
    id: "b-topik-4",
    title: "Topik 4",
    subtitle: "Bermain Dadu dan Kartu Kata",
    description:
      "Latih delapan dialog guru–siswa dari gambar komik: mengenal dadu, aturan main, melempar dadu, menjawab kartu kata, dan koreksi bersama.",
    comicScope:
      "Hanya delapan percakapan di gambar (aksi non-verbal seperti melempar dadu dan menulis di papan tulis dilewati): " +
      "(1) Ini apa? / Saya tidak tahu, Pak Guru, " +
      "(2) Ini dadu. / Oh, ini dadu, " +
      "(3) Bagaimana cara bermain? / Saya tidak tahu, " +
      "(4) Pertama, lempar dadu. Kedua, ambil satu kartu kata. Ketiga, jawab pertanyaannya. / Baik, Pak Guru, " +
      "(5) Angka berapa? / Angka lima, " +
      "(6) Ini apa? / Ini sekolah, " +
      "(7) Teman-teman, apakah jawabannya benar? / Benar (siswa lain), " +
      "(8) Mari kita koreksi bersama. Apakah ejaannya benar? / Ya, benar. Tidak ada materi lain.",
    imageKey: "bagianBTopik4Panel1",
    xpReward: 15,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "delapan dialog guru dan siswa saat bermain dadu dan kartu kata. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Ini apa?", zhTW: "這是什麼？" },
        studentLine: { id: "Saya tidak tahu, Pak Guru.", zhTW: "老師，我不知道。" },
        expectedAnswers: ["Saya tidak tahu, Pak Guru", "Saya tidak tahu Pak Guru", "Saya tidak tahu"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik4Panel1",
        studentImageKey: "bagianBTopik4Panel2",
      },
      {
        guruLine: { id: "Ini dadu.", zhTW: "這是骰子。" },
        studentLine: { id: "Oh, ini dadu.", zhTW: "哦，這是骰子。" },
        expectedAnswers: ["Oh, ini dadu", "Ini dadu"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik4Panel3",
        studentImageKey: "bagianBTopik4Panel4",
      },
      {
        guruLine: { id: "Bagaimana cara bermain?", zhTW: "怎麼玩呢？" },
        studentLine: { id: "Saya tidak tahu.", zhTW: "我不知道。" },
        expectedAnswers: ["Saya tidak tahu", "Saya tidak tahu, Pak Guru"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik4Panel5",
        studentImageKey: "bagianBTopik4Panel6",
      },
      {
        guruLine: {
          id: "Pertama, lempar dadu. Kedua, ambil satu kartu kata. Ketiga, jawab pertanyaannya.",
          zhTW: "首先，丟骰子。第二，拿一張字卡。第三，回答問題。",
        },
        studentLine: { id: "Baik, Pak Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Pak Guru", "Baik Pak Guru", "Baik"],
        guruPanelIndex: 6,
        studentPanelIndex: 7,
        guruImageKey: "bagianBTopik4Panel7",
        studentImageKey: "bagianBTopik4Panel8",
      },
      {
        guruLine: { id: "Angka berapa?", zhTW: "幾點？" },
        studentLine: { id: "Angka lima.", zhTW: "五點。" },
        expectedAnswers: ["Angka lima", "Lima"],
        guruPanelIndex: 9,
        studentPanelIndex: 10,
        guruImageKey: "bagianBTopik4Panel10",
        studentImageKey: "bagianBTopik4Panel11",
      },
      {
        guruLine: { id: "Ini apa?", zhTW: "這是什麼？" },
        studentLine: { id: "Ini sekolah.", zhTW: "這是學校。" },
        expectedAnswers: ["Ini sekolah", "Ini sekolah, Pak Guru"],
        guruPanelIndex: 12,
        studentPanelIndex: 13,
        guruImageKey: "bagianBTopik4Panel13",
        studentImageKey: "bagianBTopik4Panel14",
      },
      {
        guruLine: { id: "Teman-teman, apakah jawabannya benar?", zhTW: "同學們，答案正確嗎？" },
        studentLine: { id: "Benar!", zhTW: "正確！" },
        expectedAnswers: ["Benar", "Benar, Pak Guru"],
        guruPanelIndex: 16,
        studentPanelIndex: 17,
        guruImageKey: "bagianBTopik4Panel17",
        studentImageKey: "bagianBTopik4Panel18",
      },
      {
        guruLine: {
          id: "Mari kita koreksi bersama. Apakah ejaannya benar?",
          zhTW: "我們一起訂正。拼字正確嗎？",
        },
        studentLine: { id: "Ya, benar.", zhTW: "是的，正確。" },
        expectedAnswers: ["Ya, benar", "Ya benar", "Benar"],
        guruPanelIndex: 18,
        studentPanelIndex: 20,
        guruImageKey: "bagianBTopik4Panel19",
        studentImageKey: "bagianBTopik4Panel21",
      },
    ],
  },
  {
    id: "b-topik-5",
    title: "Topik 5",
    subtitle: "Memastikan Pemahaman",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: menanyakan apakah sudah jelas, mengerti, dan ada pertanyaan.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Apakah sudah jelas? / Ya, sudah jelas, " +
      "(2) Apakah sudah mengerti? / Ya, saya mengerti, " +
      "(3) Ada pertanyaan? / Tidak ada. Tidak ada materi lain.",
    imageKey: "bagianBTopik5Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa memastikan pemahaman. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Apakah sudah jelas?", zhTW: "清楚了嗎？" },
        studentLine: { id: "Ya, sudah jelas.", zhTW: "是的，清楚了。" },
        expectedAnswers: ["Ya, sudah jelas", "Ya sudah jelas", "Sudah jelas"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik5Panel1",
        studentImageKey: "bagianBTopik5Panel2",
      },
      {
        guruLine: { id: "Apakah sudah mengerti?", zhTW: "了解了嗎？" },
        studentLine: { id: "Ya, saya mengerti.", zhTW: "是的，我了解了。" },
        expectedAnswers: ["Ya, saya mengerti", "Ya saya mengerti", "Saya mengerti"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik5Panel3",
        studentImageKey: "bagianBTopik5Panel4",
      },
      {
        guruLine: { id: "Ada pertanyaan?", zhTW: "有問題嗎？" },
        studentLine: { id: "Tidak ada.", zhTW: "沒有。" },
        expectedAnswers: ["Tidak ada", "Tidak ada, Pak Guru", "Tidak ada, Bu Guru"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik5Panel5",
        studentImageKey: "bagianBTopik5Panel6",
      },
    ],
  },
  {
    id: "b-topik-6",
    title: "Topik 6",
    subtitle: "Membagi Kelompok Belajar",
    description:
      "Latih empat dialog guru–siswa dari gambar komik: membagi kelompok, aturan berbicara, dan batas waktu.",
    comicScope:
      "Hanya empat percakapan di gambar: (1) Sekarang kita akan bekerja dalam kelompok. / Baik, Bu Guru, " +
      "(2) Satu kelompok tiga orang. / Baik, (3) Setiap orang harus berbicara. / Baik, Bu Guru, " +
      "(4) Kalian punya lima menit. / Kami siap. Tidak ada materi lain.",
    imageKey: "bagianBTopik6Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "empat dialog guru dan siswa saat membagi kelompok belajar. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Sekarang kita akan bekerja dalam kelompok.", zhTW: "現在我們要分組活動。" },
        studentLine: { id: "Baik, Bu Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik"],
        guruPanelIndex: 0,
        studentPanelIndex: 0,
        guruImageKey: "bagianBTopik6Panel1",
        studentImageKey: "bagianBTopik6Panel1",
      },
      {
        guruLine: { id: "Satu kelompok tiga orang.", zhTW: "三人一組。" },
        studentLine: { id: "Baik.", zhTW: "好的。" },
        expectedAnswers: ["Baik", "Baik Bu Guru"],
        guruPanelIndex: 1,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik6Panel2",
        studentImageKey: "bagianBTopik6Panel2",
      },
      {
        guruLine: { id: "Setiap orang harus berbicara.", zhTW: "每個人都要發言。" },
        studentLine: { id: "Baik, Bu Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik6Panel3",
        studentImageKey: "bagianBTopik6Panel4",
      },
      {
        guruLine: { id: "Kalian punya lima menit.", zhTW: "你們有五分鐘。" },
        studentLine: { id: "Kami siap.", zhTW: "我們準備好了。" },
        expectedAnswers: ["Kami siap", "Kami siap, Bu Guru"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik6Panel5",
        studentImageKey: "bagianBTopik6Panel6",
      },
    ],
  },
  {
    id: "b-topik-7",
    title: "Topik 7",
    subtitle: "Berkenalan di Kelas",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: guru mencontohkan perkenalan diri, siswa membalas.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Mari kita lihat contoh. / Contoh apa, Pak Guru, " +
      "(2) Saya akan memberikan contoh. Nama saya Budi. / Halo, Pak Budi. Nama saya Andi, " +
      "(3) Bagus! Ini contoh sederhana. Perhatikan contoh ini. Apakah kalian mengerti? / Ya, kami mengerti. Tidak ada materi lain.",
    imageKey: "bagianBTopik7Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa saat guru mencontohkan cara berkenalan. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Mari kita lihat contoh.", zhTW: "我們來看例子。" },
        studentLine: { id: "Contoh apa, Pak Guru?", zhTW: "老師，是什麼例子呢？" },
        expectedAnswers: ["Contoh apa, Pak Guru", "Contoh apa Pak Guru", "Contoh apa"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik7Panel1",
        studentImageKey: "bagianBTopik7Panel2",
      },
      {
        guruLine: { id: "Saya akan memberikan contoh. Nama saya Budi.", zhTW: "我要給大家一個例子。我的名字是 Budi。" },
        studentLine: { id: "Halo, Pak Budi. Nama saya Andi.", zhTW: "您好，Budi老師。我的名字是 Andi。" },
        expectedAnswers: ["Halo, Pak Budi. Nama saya Andi", "Halo Pak Budi Nama saya Andi"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik7Panel3",
        studentImageKey: "bagianBTopik7Panel4",
      },
      {
        guruLine: {
          id: "Bagus! Ini contoh sederhana. Perhatikan contoh ini. Apakah kalian mengerti?",
          zhTW: "很好！這是一個簡單的例子。請看這個例子。你們了解了嗎？",
        },
        studentLine: { id: "Ya, kami mengerti.", zhTW: "是的，我們了解了。" },
        expectedAnswers: ["Ya, kami mengerti", "Ya kami mengerti", "Kami mengerti"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik7Panel5",
        studentImageKey: "bagianBTopik7Panel6",
      },
    ],
  },
  {
    id: "b-topik-8",
    title: "Topik 8",
    subtitle: "Menjawab Kosakata dan Mendapat Pujian",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: menjawab pertanyaan kosakata, mencoba lagi, dan mendapat pujian.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Apa bahasa Indonesianya \"老師\"? / Siswa?, " +
      "(2) Belum tepat. Coba sekali lagi. / Guru, " +
      "(3) Betul! Jawabanmu benar. Sangat bagus! / Terima kasih, Bu Guru. Tidak ada materi lain.",
    imageKey: "bagianBTopik8Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa saat menjawab pertanyaan kosakata dan mendapat pujian. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Apa bahasa Indonesianya \"老師\"?", zhTW: "「老師」的印尼語是什麼？" },
        studentLine: { id: "Siswa?", zhTW: "Siswa？" },
        expectedAnswers: ["Siswa"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik8Panel1",
        studentImageKey: "bagianBTopik8Panel2",
      },
      {
        guruLine: { id: "Belum tepat. Coba sekali lagi.", zhTW: "還不正確。再試一次。" },
        studentLine: { id: "Guru.", zhTW: "Guru。" },
        expectedAnswers: ["Guru"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik8Panel3",
        studentImageKey: "bagianBTopik8Panel4",
      },
      {
        guruLine: { id: "Betul! Jawabanmu benar. Sangat bagus!", zhTW: "正確！你的答案正確。很棒！" },
        studentLine: { id: "Terima kasih, Bu Guru.", zhTW: "謝謝老師。" },
        expectedAnswers: ["Terima kasih, Bu Guru", "Terima kasih Bu Guru", "Terima kasih"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik8Panel5",
        studentImageKey: "bagianBTopik8Panel6",
      },
    ],
  },
  {
    id: "b-topik-9",
    title: "Topik 9",
    subtitle: "Diskusi di Kelas",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: menyampaikan pendapat, bicara lebih keras, dan menyetujui bersama.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Setelah membaca teks ini, apa pendapatmu? / Menurut saya, pelajaran hari ini sangat menarik, " +
      "(2) Bisa bicara lebih keras? / Menurut saya, pelajaran hari ini sangat menarik! (diulang lebih keras), " +
      "(3) Bagus. Teman-teman, apakah kalian setuju? Mengerti? Ada pertanyaan? / Ya, kami setuju. Kami mengerti dan tidak ada pertanyaan. Tidak ada materi lain.",
    imageKey: "bagianBTopik9Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa saat diskusi di kelas. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Setelah membaca teks ini, apa pendapatmu?", zhTW: "讀完這篇文章後，你的看法是什麼？" },
        studentLine: { id: "Menurut saya, pelajaran hari ini sangat menarik.", zhTW: "我覺得今天的課程非常有趣。" },
        expectedAnswers: ["Menurut saya, pelajaran hari ini sangat menarik", "Pelajaran hari ini sangat menarik"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik9Panel1",
        studentImageKey: "bagianBTopik9Panel2",
      },
      {
        guruLine: { id: "Bisa bicara lebih keras?", zhTW: "可以說大聲一點嗎？" },
        studentLine: { id: "Menurut saya, pelajaran hari ini sangat menarik!", zhTW: "我覺得今天的課程非常有趣！" },
        expectedAnswers: ["Menurut saya, pelajaran hari ini sangat menarik", "Pelajaran hari ini sangat menarik"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik9Panel3",
        studentImageKey: "bagianBTopik9Panel4",
      },
      {
        guruLine: {
          id: "Bagus. Teman-teman, apakah kalian setuju? Mengerti? Ada pertanyaan?",
          zhTW: "很好。同學們，你們同意嗎？了解嗎？有問題嗎？",
        },
        studentLine: { id: "Ya, kami setuju. Kami mengerti dan tidak ada pertanyaan.", zhTW: "是的，我們同意。我們了解，而且沒有問題。" },
        expectedAnswers: ["Ya, kami setuju", "Kami setuju", "Ya kami setuju"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianBTopik9Panel5",
        studentImageKey: "bagianBTopik9Panel6",
      },
    ],
  },
  {
    id: "b-topik-10",
    title: "Topik 10",
    subtitle: "Menulis Tema dan Kosakata Penting",
    description:
      "Latih dua dialog guru–siswa dari gambar komik: menulis tema catatan dan kosakata penting.",
    comicScope:
      "Hanya dua percakapan di gambar: (1) Tulis temanya. / Baik, " +
      "(2) Tulis kosakata penting. / Sudah selesai. Tidak ada materi lain.",
    imageKey: "bagianBTopik10Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "dua dialog guru dan siswa saat mencatat tema dan kosakata penting. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Tulis temanya.", zhTW: "寫下主題。" },
        studentLine: { id: "Baik.", zhTW: "好的。" },
        expectedAnswers: ["Baik", "Baik Bu Guru"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik10Panel1",
        studentImageKey: "bagianBTopik10Panel2",
      },
      {
        guruLine: { id: "Tulis kosakata penting.", zhTW: "寫下重要詞彙。" },
        studentLine: { id: "Sudah selesai.", zhTW: "完成了。" },
        expectedAnswers: ["Sudah selesai", "Selesai", "Sudah"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik10Panel3",
        studentImageKey: "bagianBTopik10Panel4",
      },
    ],
  },
  {
    id: "b-topik-11",
    title: "Topik 11",
    subtitle: "Menjelaskan Topik Keluarga",
    description:
      "Latih dua dialog guru–siswa dari gambar komik: guru memperkenalkan topik keluarga dan menawarkan penjelasan ulang.",
    comicScope:
      "Hanya dua percakapan di gambar: (1) Topik hari ini adalah keluarga. Selanjutnya saya akan menjelaskan kosakata keluarga. / Baik, Bu Guru, " +
      "(2) Jika belum paham, saya akan menjelaskan lagi. / Terima kasih. Tidak ada materi lain.",
    imageKey: "bagianBTopik11Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "dua dialog guru dan siswa saat guru menjelaskan topik keluarga. Siap mulai?",
    turns: [
      {
        guruLine: {
          id: "Topik hari ini adalah keluarga. Selanjutnya saya akan menjelaskan kosakata keluarga.",
          zhTW: "今天的主題是家庭。接下來我要介紹家庭詞彙。",
        },
        studentLine: { id: "Baik, Bu Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianBTopik11Panel1",
        studentImageKey: "bagianBTopik11Panel2",
      },
      {
        guruLine: { id: "Jika belum paham, saya akan menjelaskan lagi.", zhTW: "如果還不懂，我再說明一次。" },
        studentLine: { id: "Terima kasih.", zhTW: "謝謝。" },
        expectedAnswers: ["Terima kasih", "Terima kasih, Bu Guru"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianBTopik11Panel3",
        studentImageKey: "bagianBTopik11Panel4",
      },
    ],
  },
];

export const BAGIAN_C_TOPICS: ClassManagementTopic[] = [
  {
    id: "c-topik-1",
    title: "Topik 1",
    subtitle: "Memberikan Tugas dan PR",
    description:
      "Latih tujuh dialog guru–siswa dari gambar komik: memberi PR, bacaan, hafalan, latihan, dan salam penutup.",
    comicScope:
      "Hanya tujuh percakapan di gambar (baris \"Guru: Ya.\" dilewati karena hanya kata penegasan singkat tanpa balasan siswa): " +
      "(1) Ini pekerjaan rumah untuk minggu depan. Tolong kerjakan di rumah. / Baik, Pak Guru, " +
      "(2) Bacalah halaman 20 sampai 25. / Baik, Pak Guru, " +
      "(3) Hafalkan kosakata baru. / Semua kosakata pada halaman 20 sampai 25?, " +
      "(4) Kerjakan latihan nomor 1 sampai 5. / Baik, Pak Guru, " +
      "(5) Jangan lupa mengerjakan PR. Kumpulkan minggu depan. / Siap, Pak Guru, " +
      "(6) Apakah ada pertanyaan? / Tidak ada, " +
      "(7) Bagus. Sampai jumpa minggu depan. / Sampai jumpa, Pak Guru. Tidak ada materi lain.",
    imageKey: "bagianCTopik1Panel1",
    xpReward: 15,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tujuh dialog guru dan siswa saat guru memberikan tugas dan PR. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Ini pekerjaan rumah untuk minggu depan. Tolong kerjakan di rumah.", zhTW: "這是下週的課後作業。請在家完成。" },
        studentLine: { id: "Baik, Pak Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Pak Guru", "Baik Pak Guru", "Baik"],
        guruPanelIndex: 0,
        studentPanelIndex: 0,
        guruImageKey: "bagianCTopik1Panel1",
        studentImageKey: "bagianCTopik1Panel1",
      },
      {
        guruLine: { id: "Bacalah halaman 20 sampai 25.", zhTW: "請閱讀第20頁到第25頁。" },
        studentLine: { id: "Baik, Pak Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Pak Guru", "Baik Pak Guru", "Baik"],
        guruPanelIndex: 1,
        studentPanelIndex: 1,
        guruImageKey: "bagianCTopik1Panel2",
        studentImageKey: "bagianCTopik1Panel2",
      },
      {
        guruLine: { id: "Hafalkan kosakata baru.", zhTW: "請背誦新詞彙。" },
        studentLine: { id: "Semua kosakata pada halaman 20 sampai 25?", zhTW: "第20頁到25頁的所有新詞彙嗎？" },
        expectedAnswers: ["Semua kosakata pada halaman 20 sampai 25", "Semua kosakata pada halaman 20 sampai 25?"],
        guruPanelIndex: 2,
        studentPanelIndex: 2,
        guruImageKey: "bagianCTopik1Panel3",
        studentImageKey: "bagianCTopik1Panel3",
      },
      {
        guruLine: { id: "Kerjakan latihan nomor 1 sampai 5.", zhTW: "請完成第一題到第五題。" },
        studentLine: { id: "Baik, Pak Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Pak Guru", "Baik Pak Guru", "Baik"],
        guruPanelIndex: 3,
        studentPanelIndex: 3,
        guruImageKey: "bagianCTopik1Panel4",
        studentImageKey: "bagianCTopik1Panel4",
      },
      {
        guruLine: { id: "Jangan lupa mengerjakan PR. Kumpulkan minggu depan.", zhTW: "不要忘記寫課後作業。下週繳交。" },
        studentLine: { id: "Siap, Pak Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Siap, Pak Guru", "Siap Pak Guru", "Siap"],
        guruPanelIndex: 4,
        studentPanelIndex: 4,
        guruImageKey: "bagianCTopik1Panel5",
        studentImageKey: "bagianCTopik1Panel5",
      },
      {
        guruLine: { id: "Apakah ada pertanyaan?", zhTW: "有問題嗎？" },
        studentLine: { id: "Tidak ada.", zhTW: "沒有。" },
        expectedAnswers: ["Tidak ada", "Tidak ada, Pak Guru"],
        guruPanelIndex: 5,
        studentPanelIndex: 5,
        guruImageKey: "bagianCTopik1Panel6",
        studentImageKey: "bagianCTopik1Panel6",
      },
      {
        guruLine: { id: "Bagus. Sampai jumpa minggu depan.", zhTW: "很好。下週見。" },
        studentLine: { id: "Sampai jumpa, Pak Guru.", zhTW: "老師，下週見。" },
        expectedAnswers: ["Sampai jumpa, Pak Guru", "Sampai jumpa Pak Guru", "Sampai jumpa"],
        guruPanelIndex: 5,
        studentPanelIndex: 5,
        guruImageKey: "bagianCTopik1Panel6",
        studentImageKey: "bagianCTopik1Panel6",
      },
    ],
  },
  {
    id: "c-topik-2",
    title: "Topik 2",
    subtitle: "Ungkapan Penutupan Kelas",
    description:
      "Latih tiga dialog guru–siswa dari gambar komik: menutup pelajaran, berpamitan, dan mengingatkan hati-hati di jalan.",
    comicScope:
      "Hanya tiga percakapan di gambar: (1) Pelajaran hari ini sampai di sini. / Terima kasih, Bu Guru, " +
      "(2) Sampai jumpa minggu depan. / Sampai jumpa minggu depan, " +
      "(3) Hati-hati di jalan. / Terima kasih. Tidak ada materi lain.",
    imageKey: "bagianCTopik2Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "tiga dialog guru dan siswa saat menutup pelajaran. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Pelajaran hari ini sampai di sini.", zhTW: "今天的課程到這裡。" },
        studentLine: { id: "Terima kasih, Bu Guru.", zhTW: "謝謝老師。" },
        expectedAnswers: ["Terima kasih, Bu Guru", "Terima kasih Bu Guru", "Terima kasih"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianCTopik2Panel1",
        studentImageKey: "bagianCTopik2Panel2",
      },
      {
        guruLine: { id: "Sampai jumpa minggu depan.", zhTW: "下週見。" },
        studentLine: { id: "Sampai jumpa minggu depan.", zhTW: "下週見。" },
        expectedAnswers: ["Sampai jumpa minggu depan", "Sampai jumpa"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianCTopik2Panel3",
        studentImageKey: "bagianCTopik2Panel4",
      },
      {
        guruLine: { id: "Hati-hati di jalan.", zhTW: "路上小心。" },
        studentLine: { id: "Terima kasih.", zhTW: "謝謝。" },
        expectedAnswers: ["Terima kasih", "Terima kasih, Bu Guru"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianCTopik2Panel5",
        studentImageKey: "bagianCTopik2Panel6",
      },
    ],
  },
  {
    id: "c-topik-3",
    title: "Topik 3",
    subtitle: "Topik Pertemuan Berikutnya",
    description:
      "Latih dua dialog guru–siswa dari gambar komik: membocorkan topik minggu depan dan meminta siswa bersiap.",
    comicScope:
      "Hanya dua percakapan di gambar: (1) Minggu depan kita akan belajar tentang keluarga. / Menarik sekali, " +
      "(2) Tolong persiapkan diri kalian. / Baik, Bu Guru. Tidak ada materi lain.",
    imageKey: "bagianCTopik3Panel1",
    xpReward: 10,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "dua dialog guru dan siswa tentang topik pertemuan berikutnya. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Minggu depan kita akan belajar tentang keluarga.", zhTW: "下週我們要學習家庭主題。" },
        studentLine: { id: "Menarik sekali.", zhTW: "很有趣。" },
        expectedAnswers: ["Menarik sekali", "Menarik"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianCTopik3Panel1",
        studentImageKey: "bagianCTopik3Panel2",
      },
      {
        guruLine: { id: "Tolong persiapkan diri kalian.", zhTW: "請做好準備。" },
        studentLine: { id: "Baik, Bu Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianCTopik3Panel3",
        studentImageKey: "bagianCTopik3Panel4",
      },
    ],
  },
  {
    id: "c-topik-4",
    title: "Topik 4",
    subtitle: "Refleksi Setelah Belajar",
    description:
      "Latih empat dialog guru–siswa dari gambar komik: berbagi perasaan, kosakata favorit, kesulitan, dan semangat berlatih.",
    comicScope:
      "Hanya empat percakapan di gambar: (1) Bagaimana perasaanmu setelah belajar bahasa Indonesia hari ini? / Saya senang karena belajar banyak kosakata baru, " +
      "(2) Kosakata apa yang paling kamu sukai? / Saya paling suka kata \"keluarga\", " +
      "(3) Apa yang paling sulit dalam pelajaran hari ini? / Pengucapan beberapa kosakata masih sulit, " +
      "(4) Tidak apa-apa. Teruslah berlatih. / Baik, Bu Guru. Tidak ada materi lain.",
    imageKey: "bagianCTopik4Panel1",
    xpReward: 15,
    introMessage:
      "Kita latih percakapan dari gambar komik ini saja — " +
      "empat dialog guru dan siswa saat refleksi setelah belajar. Siap mulai?",
    turns: [
      {
        guruLine: { id: "Bagaimana perasaanmu setelah belajar bahasa Indonesia hari ini?", zhTW: "今天學完印尼語後，你感覺如何？" },
        studentLine: { id: "Saya senang karena belajar banyak kosakata baru.", zhTW: "我很開心，因為學到了很多新詞彙。" },
        expectedAnswers: ["Saya senang karena belajar banyak kosakata baru", "Saya senang"],
        guruPanelIndex: 0,
        studentPanelIndex: 1,
        guruImageKey: "bagianCTopik4Panel1",
        studentImageKey: "bagianCTopik4Panel2",
      },
      {
        guruLine: { id: "Kosakata apa yang paling kamu sukai?", zhTW: "你最喜歡哪個詞彙？" },
        studentLine: { id: "Saya paling suka kata \"keluarga\".", zhTW: "我最喜歡「keluarga」這個詞彙。" },
        expectedAnswers: ["Saya paling suka kata keluarga", "Saya paling suka keluarga"],
        guruPanelIndex: 2,
        studentPanelIndex: 3,
        guruImageKey: "bagianCTopik4Panel3",
        studentImageKey: "bagianCTopik4Panel4",
      },
      {
        guruLine: { id: "Apa yang paling sulit dalam pelajaran hari ini?", zhTW: "今天課程中最困難的是什麼？" },
        studentLine: { id: "Pengucapan beberapa kosakata masih sulit.", zhTW: "有些詞彙的發音還是很難。" },
        expectedAnswers: ["Pengucapan beberapa kosakata masih sulit", "Pengucapan masih sulit"],
        guruPanelIndex: 4,
        studentPanelIndex: 5,
        guruImageKey: "bagianCTopik4Panel5",
        studentImageKey: "bagianCTopik4Panel6",
      },
      {
        guruLine: { id: "Tidak apa-apa. Teruslah berlatih.", zhTW: "沒關係，繼續練習。" },
        studentLine: { id: "Baik, Bu Guru.", zhTW: "好的，老師。" },
        expectedAnswers: ["Baik, Bu Guru", "Baik bu guru", "Baik"],
        guruPanelIndex: 6,
        studentPanelIndex: 7,
        guruImageKey: "bagianCTopik4Panel7",
        studentImageKey: "bagianCTopik4Panel8",
      },
    ],
  },
];

const ALL_TOPICS: ClassManagementTopic[] = [
  ...CLASS_MANAGEMENT_TOPICS,
  ...BAGIAN_B_TOPICS,
  ...BAGIAN_C_TOPICS,
];

export function getClassTopic(id: string): ClassManagementTopic | undefined {
  return ALL_TOPICS.find((topic) => topic.id === id);
}
