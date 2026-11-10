// Learning material pages for the app (assets/learning-materials/*.jpg).
// Words and sentences come from the AI Teacher comics in data/classManagement.ts.
// Icons and scenes are AI illustrations in public/materials/; all text is
// typed here, so it is always correct.

export type MaterialWord = { icon: string; word: string; zh: string };
export type MaterialSentence = { scene: string; id: string; zh: string };

export type MaterialPage = {
  id: string;
  numeral: string;
  zhTitle: string;
  idTitle: string;
  words: MaterialWord[];
  sentences: MaterialSentence[];
};

export const MATERIAL_PAGES: MaterialPage[] = [
  {
    id: "bagian-4",
    numeral: "IV",
    zhTitle: "準備開始上課",
    idTitle: "Bersiap Memulai Pelajaran",
    words: [
      { icon: "silakan", word: "silakan", zh: "請" },
      { icon: "duduk", word: "duduk", zh: "坐下" },
      { icon: "perhatikan", word: "perhatikan", zh: "注意" },
      { icon: "lihat", word: "lihat", zh: "看" },
      { icon: "depan", word: "depan", zh: "前面" },
      { icon: "keluarkan", word: "keluarkan", zh: "拿出來" },
      { icon: "buku", word: "buku", zh: "課本" },
      { icon: "pensil", word: "pensil", zh: "鉛筆" },
    ],
    sentences: [
      { scene: "s-b1-1", id: "Silakan duduk dulu.", zh: "請先坐下。" },
      { scene: "s-b1-2", id: "Perhatikan!", zh: "請注意！" },
      { scene: "s-b1-3", id: "Lihat ke depan.", zh: "看前面。" },
      { scene: "s-b1-4", id: "Keluarkan bukumu.", zh: "把課本拿出來。" },
      { scene: "s-b1-5", id: "Keluarkan pensilmu.", zh: "把筆拿出來。" },
    ],
  },
  {
    id: "bagian-5",
    numeral: "V",
    zhTitle: "展示圖片與影片",
    idTitle: "Menunjukkan Gambar dan Video",
    words: [
      { icon: "gambar", word: "gambar", zh: "圖片" },
      { icon: "melihat", word: "melihat", zh: "看到" },
      { icon: "apa", word: "apa", zh: "什麼" },
      { icon: "kalian", word: "kalian", zh: "你們" },
      { icon: "sekolah", word: "sekolah", zh: "學校" },
      { icon: "bagus-sekali", word: "bagus sekali", zh: "非常好" },
      { icon: "mari", word: "mari", zh: "我們來" },
      { icon: "video", word: "video", zh: "影片" },
    ],
    sentences: [
      { scene: "s-b2-1", id: "Lihat gambar ini. Apa yang kalian lihat?", zh: "看這張圖片。你們看到了什麼？" },
      { scene: "s-b2-2", id: "Saya melihat sekolah.", zh: "我看到學校。" },
      { scene: "s-b2-3", id: "Bagus sekali. Mari lihat video.", zh: "非常好。我們來看影片。" },
    ],
  },
  {
    id: "bagian-6",
    numeral: "VI",
    zhTitle: "打開課本與翻頁",
    idTitle: "Membuka Buku dan Halaman",
    words: [
      { icon: "keluarkan", word: "keluarkan", zh: "拿出來" },
      { icon: "buku", word: "buku", zh: "課本" },
      { icon: "buka", word: "buka", zh: "翻開" },
      { icon: "halaman", word: "halaman", zh: "頁" },
      { icon: "sepuluh", word: "sepuluh (10)", zh: "十" },
      { icon: "sudah", word: "sudah", zh: "好了" },
    ],
    sentences: [
      { scene: "s-b3-1", id: "Keluarkan bukumu. Buka halaman 10.", zh: "把課本拿出來。翻到第十頁。" },
      { scene: "s-b3-2", id: "Sudah, Bu Guru.", zh: "好了，老師。" },
    ],
  },
];

export const PAGE_SIZE = { width: 1086, height: 1448 };
