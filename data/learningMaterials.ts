import { LearningMaterial } from "@/types/learningMaterial";

export const LEARNING_MATERIALS: LearningMaterial[] = [
  {
    id: "bagian-1",
    title: "Bagian I",
    subtitle: "Pengaturan Peralatan Kelas",
    imageKey: "learningMaterialBagian1",
    aspectRatio: 1024 / 1536,
    vocabulary: [
      { word: "stopkontak", translation: "插座", speakText: "stopkontak" },
      { word: "steker (colokan)", translation: "插頭", speakText: "steker" },
      {
        word: "papan tulis elektronik",
        translation: "電子白板",
        speakText: "papan tulis elektronik",
      },
      {
        word: "speaker (pengeras suara)",
        translation: "喇叭",
        speakText: "speaker",
      },
      { word: "tombol (button)", translation: "按鈕", speakText: "tombol" },
      { word: "suara (bunyi)", translation: "聲音", speakText: "suara" },
      { word: "nyalakan", translation: "開啟", speakText: "nyalakan" },
      { word: "matikan", translation: "關閉", speakText: "matikan" },
      { word: "tekan", translation: "按下", speakText: "tekan" },
      {
        word: "masukkan (colokkan)",
        translation: "插入",
        speakText: "masukkan",
      },
      {
        word: "besarkan suara",
        translation: "調大音量",
        speakText: "besarkan suara",
      },
      {
        word: "kecilkan suara",
        translation: "調小音量",
        speakText: "kecilkan suara",
      },
    ],
  },
  {
    id: "bagian-2",
    title: "Bagian II",
    subtitle: "Pengantar Aktivitas Sebelum Pelajaran",
    imageKey: "learningMaterialBagian2",
    aspectRatio: 1086 / 1448,
    vocabulary: [
      { word: "mengulas", translation: "複習", speakText: "mengulas" },
      { word: "pelajaran", translation: "課程", speakText: "pelajaran" },
      { word: "kemarin", translation: "昨天", speakText: "kemarin" },
      { word: "ingat", translation: "記得", speakText: "ingat" },
      { word: "belajar", translation: "學習", speakText: "belajar" },
    ],
  },
  {
    id: "bagian-3",
    title: "Bagian III",
    subtitle: "Salam dan Absensi",
    imageKey: "learningMaterialBagian3",
    aspectRatio: 1086 / 1448,
    vocabulary: [
      {
        word: "waktunya belajar",
        translation: "學習時間",
        speakText: "waktunya belajar",
      },
      {
        word: "pelajaran dimulai",
        translation: "開始上課",
        speakText: "pelajaran dimulai",
      },
      { word: "siap", translation: "準備好", speakText: "siap" },
      { word: "mengabsen", translation: "點名", speakText: "mengabsen" },
      { word: "hadir", translation: "到", speakText: "hadir" },
    ],
  },
  // Bagian IV–VI follow AI Teacher Part B, topics 1–3 (same comic dialogues).
  {
    id: "bagian-4",
    title: "Bagian IV",
    subtitle: "Bersiap Memulai Pelajaran",
    imageKey: "learningMaterialBagian4",
    aspectRatio: 1086 / 1448,
    vocabulary: [
      { word: "silakan", translation: "請", speakText: "silakan" },
      { word: "duduk", translation: "坐下", speakText: "duduk" },
      { word: "perhatikan", translation: "注意", speakText: "perhatikan" },
      { word: "lihat", translation: "看", speakText: "lihat" },
      { word: "depan", translation: "前面", speakText: "depan" },
      { word: "keluarkan", translation: "拿出來", speakText: "keluarkan" },
      { word: "buku", translation: "課本", speakText: "buku" },
      { word: "pensil", translation: "鉛筆", speakText: "pensil" },
    ],
  },
  {
    id: "bagian-5",
    title: "Bagian V",
    subtitle: "Menunjukkan Gambar dan Video",
    imageKey: "learningMaterialBagian5",
    aspectRatio: 1086 / 1448,
    vocabulary: [
      { word: "gambar", translation: "圖片", speakText: "gambar" },
      { word: "melihat", translation: "看到", speakText: "melihat" },
      { word: "apa", translation: "什麼", speakText: "apa" },
      { word: "kalian", translation: "你們", speakText: "kalian" },
      { word: "sekolah", translation: "學校", speakText: "sekolah" },
      { word: "bagus sekali", translation: "非常好", speakText: "bagus sekali" },
      { word: "mari", translation: "我們來", speakText: "mari" },
      { word: "video", translation: "影片", speakText: "video" },
    ],
  },
  {
    id: "bagian-6",
    title: "Bagian VI",
    subtitle: "Membuka Buku dan Halaman",
    imageKey: "learningMaterialBagian6",
    aspectRatio: 1086 / 1448,
    vocabulary: [
      { word: "keluarkan", translation: "拿出來", speakText: "keluarkan" },
      { word: "buku", translation: "課本", speakText: "buku" },
      { word: "buka", translation: "翻開", speakText: "buka" },
      { word: "halaman", translation: "頁", speakText: "halaman" },
      { word: "sepuluh (10)", translation: "十", speakText: "sepuluh" },
      { word: "sudah", translation: "好了", speakText: "sudah" },
    ],
  },
];

export function getLearningMaterial(id: string): LearningMaterial | undefined {
  return LEARNING_MATERIALS.find((material) => material.id === id);
}
