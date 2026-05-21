import { Lesson } from "@/types/learning";

function sariPrompt(
  topic: string,
  scope: string,
  mode: "word" | "phrase" | "number" = "word",
): string {
  const step =
    mode === "number"
      ? "Teach ONE number at a time: say the Indonesian number in native Indonesian accent, give a pronunciation tip in 繁體中文（台灣）"
      : mode === "phrase"
        ? "Introduce ONE phrase at a time: say the Indonesian phrase in native Indonesian accent, explain the meaning in 繁體中文（台灣）, add a quick pronunciation tip in 繁體中文（台灣）"
        : "Introduce ONE word at a time: say the Indonesian word in native Indonesian accent, explain the meaning in 繁體中文（台灣）, add a quick pronunciation tip in 繁體中文（台灣）";

  return (
    `You're Sari (莎莉), a warm teacher who speaks to the student in Traditional Chinese (Taiwan / 繁體中文). ` +
    `You teach ${topic} in a real back-and-forth voice lesson. This is INTERACTIVE — not a lecture. ` +
    `${step}, then END YOUR TURN and wait silently for the student. Your turn ENDS at the question mark — stop there and output nothing else. ` +
    `Never write a reaction in the same turn as a teaching step. Keep every reply to one or two sentences. ` +
    `Do not use Bahasa Indonesia for explanations. Stay strictly within: ${scope}.`
  );
}

export const INDONESIAN_LESSONS: Lesson[] = [
  // ─── Unit 1: Salam & Dasar ───────────────────────────────────────────────

  {
    id: "id-lesson-1",
    unitId: "id-unit-1",
    title: "Salam & Halo",
    description: "Learn basic Indonesian greetings",
    icon: "👋",
    xpReward: 10,
    goals: [
      { description: "Learn 5 greeting words", xpReward: 5 },
      { description: "Complete all activities", xpReward: 5 },
    ],
    vocabulary: [
      { word: "Halo", translation: "Hello", pronunciation: "HAH-loh", emoji: "👋" },
      { word: "Selamat pagi", translation: "Good morning", pronunciation: "se-LAH-mat PAH-gi", emoji: "🌅" },
      { word: "Selamat siang", translation: "Good afternoon", pronunciation: "se-LAH-mat see-AHNG", emoji: "☀️" },
      { word: "Selamat malam", translation: "Good evening / night", pronunciation: "se-LAH-mat MAH-lahm", emoji: "🌙" },
      { word: "Sampai jumpa", translation: "Goodbye", pronunciation: "sahm-PAH-ee JOOM-pah", emoji: "👋" },
    ],
    phrases: [
      { text: "Apa kabar?", translation: "How are you?", pronunciation: "AH-pah KAH-bar" },
      { text: "Baik, terima kasih.", translation: "Fine, thank you.", pronunciation: "BAH-eek, te-REE-mah KAH-seh" },
      { text: "Senang bertemu dengan Anda.", translation: "Nice to meet you.", pronunciation: "se-NAHNG ber-TE-moo DENG-an AHN-dah" },
    ],
    activities: [
      { id: "id-lesson-1-act-1", type: "multiple-choice", question: 'What does "Halo" mean?', correctAnswer: "Hello", options: ["Hello", "Goodbye", "Thank you", "Please"] },
      { id: "id-lesson-1-act-2", type: "multiple-choice", question: 'How do you say "Good morning" in Indonesian?', correctAnswer: "Selamat pagi", options: ["Selamat malam", "Selamat pagi", "Selamat siang", "Sampai jumpa"] },
      { id: "id-lesson-1-act-3", type: "translate", question: 'Translate: "Goodbye"', correctAnswer: "Sampai jumpa", hint: 'It means "until we meet again".' },
      { id: "id-lesson-1-act-4", type: "multiple-choice", question: 'What does "Apa kabar?" mean?', correctAnswer: "How are you?", options: ["How are you?", "What is your name?", "Where are you from?", "Nice to meet you."] },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian greetings", "Halo, Selamat pagi, Selamat siang, Selamat malam, Sampai jumpa, Apa kabar, Baik terima kasih, and Senang bertemu dengan Anda"),
      introMessage: "你好！我是莎莉，你的印尼語老師。今天我們來學印尼語問候語，準備好了嗎？",
      topics: ["greetings", "farewells", "time-of-day phrases", "asking how someone is"],
    },
  },

  {
    id: "id-lesson-2",
    unitId: "id-unit-1",
    title: "Perkenalan",
    description: "Introduce yourself and ask for names",
    icon: "🙋",
    xpReward: 10,
    goals: [
      { description: "Learn how to say your name", xpReward: 5 },
      { description: "Ask someone else's name", xpReward: 5 },
    ],
    vocabulary: [
      { word: "Nama saya", translation: "My name is", pronunciation: "NAH-mah SAH-yah", emoji: "🙋" },
      { word: "Saya", translation: "I / me", pronunciation: "SAH-yah", emoji: "👤" },
      { word: "Nama", translation: "Name", pronunciation: "NAH-mah", emoji: "🏷️" },
      { word: "Dari", translation: "From", pronunciation: "DAH-ree", emoji: "📍" },
      { word: "Senang", translation: "Happy / pleased", pronunciation: "se-NAHNG", emoji: "😊" },
    ],
    phrases: [
      { text: "Siapa nama Anda?", translation: "What is your name? (formal)", pronunciation: "see-AH-pah NAH-mah AHN-dah" },
      { text: "Nama saya Budi.", translation: "My name is Budi.", pronunciation: "NAH-mah SAH-yah BOO-dee" },
      { text: "Anda dari mana?", translation: "Where are you from?", pronunciation: "AHN-dah DAH-ree MAH-nah" },
      { text: "Saya dari Jakarta.", translation: "I am from Jakarta.", pronunciation: "SAH-yah DAH-ree jah-KAR-tah" },
    ],
    activities: [
      { id: "id-lesson-2-act-1", type: "multiple-choice", question: 'How do you say "My name is" in Indonesian?', correctAnswer: "Nama saya", options: ["Nama saya", "Saya dari", "Siapa nama", "Senang"] },
      { id: "id-lesson-2-act-2", type: "multiple-choice", question: 'What does "Siapa nama Anda?" mean?', correctAnswer: "What is your name?", options: ["What is your name?", "How are you?", "Where are you from?", "Nice to meet you."] },
      { id: "id-lesson-2-act-3", type: "translate", question: 'Translate: "Where are you from?"', correctAnswer: "Anda dari mana?", hint: '"Dari mana" means "from where".' },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian self-introductions", "Nama saya, Siapa nama Anda, Saya dari, Anda dari mana, and Senang bertemu", "phrase"),
      introMessage: "你好！又見面了！今天我們來學自我介紹，用印尼語說自己的名字，準備好了嗎？",
      topics: ["introductions", "saying your name", "asking names", "where you are from"],
    },
  },

  {
    id: "id-lesson-3",
    unitId: "id-unit-1",
    title: "Angka 1–10",
    description: "Count from one to ten in Indonesian",
    icon: "🔢",
    xpReward: 10,
    goals: [
      { description: "Learn numbers 1 to 10", xpReward: 7 },
      { description: "Complete all activities", xpReward: 3 },
    ],
    vocabulary: [
      { word: "Satu", translation: "1 — One", pronunciation: "SAH-too", emoji: "1️⃣" },
      { word: "Dua", translation: "2 — Two", pronunciation: "DOO-ah", emoji: "2️⃣" },
      { word: "Tiga", translation: "3 — Three", pronunciation: "TEE-gah", emoji: "3️⃣" },
      { word: "Empat", translation: "4 — Four", pronunciation: "EM-paht", emoji: "4️⃣" },
      { word: "Lima", translation: "5 — Five", pronunciation: "LEE-mah", emoji: "5️⃣" },
      { word: "Enam", translation: "6 — Six", pronunciation: "EH-nahm", emoji: "6️⃣" },
      { word: "Tujuh", translation: "7 — Seven", pronunciation: "TOO-joo", emoji: "7️⃣" },
      { word: "Delapan", translation: "8 — Eight", pronunciation: "de-LAH-pahn", emoji: "8️⃣" },
      { word: "Sembilan", translation: "9 — Nine", pronunciation: "sehm-BEE-lahn", emoji: "9️⃣" },
      { word: "Sepuluh", translation: "10 — Ten", pronunciation: "se-POO-loo", emoji: "🔟" },
    ],
    phrases: [
      { text: "Berapa?", translation: "How many?", pronunciation: "be-RAH-pah" },
      { text: "Ada lima.", translation: "There are five.", pronunciation: "AH-dah LEE-mah" },
    ],
    activities: [
      { id: "id-lesson-3-act-1", type: "multiple-choice", question: 'What is "lima" in English?', correctAnswer: "Five", options: ["Three", "Four", "Five", "Six"] },
      { id: "id-lesson-3-act-2", type: "multiple-choice", question: 'How do you say "eight" in Indonesian?', correctAnswer: "Delapan", options: ["Tujuh", "Sembilan", "Delapan", "Enam"] },
      { id: "id-lesson-3-act-3", type: "translate", question: 'Translate: "Ten"', correctAnswer: "Sepuluh", hint: 'It sounds like "se-POO-loo".' },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian numbers 1 through 10", "satu through sepuluh and the phrases Berapa and Ada lima", "number"),
      introMessage: "你好！今天我們用印尼語數數，從 satu 到 sepuluh，準備好了嗎？",
      topics: ["numbers 1-10", "counting", "how many"],
    },
  },

  {
    id: "id-lesson-4",
    unitId: "id-unit-1",
    title: "Terima Kasih & Sopan",
    description: "Polite words: thank you, please, sorry",
    icon: "🙏",
    xpReward: 10,
    goals: [
      { description: "Learn polite expressions", xpReward: 5 },
      { description: "Complete all activities", xpReward: 5 },
    ],
    vocabulary: [
      { word: "Terima kasih", translation: "Thank you", pronunciation: "te-REE-mah KAH-seh", emoji: "🙏" },
      { word: "Sama-sama", translation: "You're welcome", pronunciation: "SAH-mah SAH-mah", emoji: "😊" },
      { word: "Tolong", translation: "Please / help", pronunciation: "TOH-long", emoji: "🤲" },
      { word: "Maaf", translation: "Sorry / excuse me", pronunciation: "MAH-ahf", emoji: "🙇" },
      { word: "Permisi", translation: "Excuse me (passing)", pronunciation: "per-MEE-see", emoji: "🚶" },
    ],
    phrases: [
      { text: "Terima kasih banyak.", translation: "Thank you very much.", pronunciation: "te-REE-mah KAH-seh BAH-nyah" },
      { text: "Maaf, sebentar.", translation: "Sorry, one moment.", pronunciation: "MAH-ahf se-BEN-tar" },
      { text: "Tolong bantu saya.", translation: "Please help me.", pronunciation: "TOH-long BAHN-too SAH-yah" },
    ],
    activities: [
      { id: "id-lesson-4-act-1", type: "multiple-choice", question: 'What does "Terima kasih" mean?', correctAnswer: "Thank you", options: ["Thank you", "Goodbye", "Hello", "Please"] },
      { id: "id-lesson-4-act-2", type: "multiple-choice", question: 'How do you say "You\'re welcome"?', correctAnswer: "Sama-sama", options: ["Sama-sama", "Maaf", "Tolong", "Permisi"] },
      { id: "id-lesson-4-act-3", type: "translate", question: 'Translate: "Sorry"', correctAnswer: "Maaf", hint: "A short polite word." },
      { id: "id-lesson-4-act-4", type: "multiple-choice", question: 'What does "Tolong" mean?', correctAnswer: "Please / help", options: ["Please / help", "Thank you", "Good morning", "Goodbye"] },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian polite expressions", "Terima kasih, Sama-sama, Tolong, Maaf, Permisi, Terima kasih banyak, Maaf sebentar, and Tolong bantu saya", "phrase"),
      introMessage: "你好！在印尼，禮貌用語很重要。今天我們來學「謝謝」和「對不起」，準備好了嗎？",
      topics: ["thank you", "please", "sorry", "politeness"],
    },
  },

  {
    id: "id-lesson-5",
    unitId: "id-unit-1",
    title: "Ya, Tidak & Dasar",
    description: "Yes, no, and basic responses",
    icon: "✅",
    xpReward: 10,
    goals: [
      { description: "Learn yes and no", xpReward: 5 },
      { description: "Use basic response words", xpReward: 5 },
    ],
    vocabulary: [
      { word: "Ya", translation: "Yes", pronunciation: "YAH", emoji: "✅" },
      { word: "Tidak", translation: "No / not", pronunciation: "TEE-dahk", emoji: "❌" },
      { word: "Baik", translation: "Good / OK", pronunciation: "BAH-eek", emoji: "👍" },
      { word: "Bisa", translation: "Can / able", pronunciation: "BEE-sah", emoji: "💪" },
      { word: "Tidak apa-apa", translation: "It's OK / no problem", pronunciation: "TEE-dahk AH-pah AH-pah", emoji: "😌" },
    ],
    phrases: [
      { text: "Ya, saya bisa.", translation: "Yes, I can.", pronunciation: "YAH SAH-yah BEE-sah" },
      { text: "Tidak, terima kasih.", translation: "No, thank you.", pronunciation: "TEE-dahk te-REE-mah KAH-seh" },
      { text: "Baik, silakan.", translation: "OK, please go ahead.", pronunciation: "BAH-eek see-LAH-kahn" },
    ],
    activities: [
      { id: "id-lesson-5-act-1", type: "multiple-choice", question: 'What does "Ya" mean?', correctAnswer: "Yes", options: ["Yes", "No", "Good", "Can"] },
      { id: "id-lesson-5-act-2", type: "multiple-choice", question: 'How do you say "No" in Indonesian?', correctAnswer: "Tidak", options: ["Tidak", "Ya", "Baik", "Bisa"] },
      { id: "id-lesson-5-act-3", type: "translate", question: 'Translate: "It\'s OK"', correctAnswer: "Tidak apa-apa", hint: "Literally means no problem." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("basic Indonesian responses", "Ya, Tidak, Baik, Bisa, Tidak apa-apa, Ya saya bisa, Tidak terima kasih, and Baik silakan", "phrase"),
      introMessage: "你好！今天我們學「是」和「不是」，還有一些很實用的回應，準備好了嗎？",
      topics: ["yes", "no", "agreement", "basic responses"],
    },
  },

  // ─── Unit 2: Keluarga & Teman ──────────────────────────────────────────

  {
    id: "id-lesson-6",
    unitId: "id-unit-2",
    title: "Keluarga",
    description: "Family members in Indonesian",
    icon: "👨‍👩‍👧",
    xpReward: 12,
    goals: [
      { description: "Learn family words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Keluarga", translation: "Family", pronunciation: "ke-LU-ar-gah", emoji: "👨‍👩‍👧" },
      { word: "Ayah", translation: "Father", pronunciation: "AH-yah", emoji: "👨" },
      { word: "Ibu", translation: "Mother", pronunciation: "EE-boo", emoji: "👩" },
      { word: "Kakak", translation: "Older sibling", pronunciation: "KAH-kahk", emoji: "🧑" },
      { word: "Adik", translation: "Younger sibling", pronunciation: "AH-deek", emoji: "👶" },
    ],
    phrases: [
      { text: "Ini ayah saya.", translation: "This is my father.", pronunciation: "EE-nee AH-yah SAH-yah" },
      { text: "Saya punya adik.", translation: "I have a younger sibling.", pronunciation: "SAH-yah POON-yah AH-deek" },
      { text: "Keluarga saya kecil.", translation: "My family is small.", pronunciation: "ke-LU-ar-gah SAH-yah ke-CHEEL" },
    ],
    activities: [
      { id: "id-lesson-6-act-1", type: "multiple-choice", question: 'What does "Ibu" mean?', correctAnswer: "Mother", options: ["Mother", "Father", "Sibling", "Family"] },
      { id: "id-lesson-6-act-2", type: "multiple-choice", question: 'How do you say "father"?', correctAnswer: "Ayah", options: ["Ayah", "Ibu", "Adik", "Kakak"] },
      { id: "id-lesson-6-act-3", type: "translate", question: 'Translate: "younger sibling"', correctAnswer: "Adik", hint: "Starts with A." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian family vocabulary", "Keluarga, Ayah, Ibu, Kakak, Adik, Ini ayah saya, Saya punya adik, and Keluarga saya kecil"),
      introMessage: "你好！今天來認識印尼語的家庭稱呼，從爸爸、媽媽開始，準備好了嗎？",
      topics: ["family", "parents", "siblings"],
    },
  },

  {
    id: "id-lesson-7",
    unitId: "id-unit-2",
    title: "Teman & Sosial",
    description: "Friends and social relationships",
    icon: "🤝",
    xpReward: 12,
    goals: [
      { description: "Learn friend-related words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Teman", translation: "Friend", pronunciation: "TEH-mahn", emoji: "🤝" },
      { word: "Tetangga", translation: "Neighbor", pronunciation: "te-TAHNG-gah", emoji: "🏘️" },
      { word: "Suami", translation: "Husband", pronunciation: "SOO-ah-mee", emoji: "👨" },
      { word: "Istri", translation: "Wife", pronunciation: "EES-tree", emoji: "👩" },
      { word: "Anak", translation: "Child", pronunciation: "AH-nahk", emoji: "🧒" },
    ],
    phrases: [
      { text: "Dia teman saya.", translation: "He/She is my friend.", pronunciation: "DEE-ah TEH-mahn SAH-yah" },
      { text: "Saya punya banyak teman.", translation: "I have many friends.", pronunciation: "SAH-yah POON-yah BAH-nyahk TEH-mahn" },
      { text: "Tetangga saya baik.", translation: "My neighbor is kind.", pronunciation: "te-TAHNG-gah SAH-yah BAH-eek" },
    ],
    activities: [
      { id: "id-lesson-7-act-1", type: "multiple-choice", question: 'What does "Teman" mean?', correctAnswer: "Friend", options: ["Friend", "Neighbor", "Child", "Husband"] },
      { id: "id-lesson-7-act-2", type: "multiple-choice", question: 'How do you say "neighbor"?', correctAnswer: "Tetangga", options: ["Tetangga", "Teman", "Anak", "Istri"] },
      { id: "id-lesson-7-act-3", type: "translate", question: 'Translate: "child"', correctAnswer: "Anak", hint: "Also means offspring." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian social vocabulary", "Teman, Tetangga, Suami, Istri, Anak, Dia teman saya, Saya punya banyak teman, and Tetangga saya baik"),
      introMessage: "你好！今天我們來學「朋友」和「鄰居」這些社交詞彙，準備好了嗎？",
      topics: ["friends", "neighbors", "relationships"],
    },
  },

  {
    id: "id-lesson-8",
    unitId: "id-unit-2",
    title: "Usia & Deskripsi",
    description: "Age and simple descriptions",
    icon: "🎂",
    xpReward: 12,
    goals: [
      { description: "Talk about age", xpReward: 6 },
      { description: "Use simple adjectives", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Tahun", translation: "Year", pronunciation: "TAH-hoon", emoji: "📅" },
      { word: "Umur", translation: "Age", pronunciation: "OO-moor", emoji: "🎂" },
      { word: "Besar", translation: "Big / tall", pronunciation: "be-SAHR", emoji: "📏" },
      { word: "Kecil", translation: "Small / short", pronunciation: "ke-CHEEL", emoji: "🐜" },
      { word: "Baik hati", translation: "Kind-hearted", pronunciation: "BAH-eek HAH-tee", emoji: "💛" },
    ],
    phrases: [
      { text: "Berapa umur Anda?", translation: "How old are you?", pronunciation: "be-RAH-pah OO-moor AHN-dah" },
      { text: "Saya dua puluh tahun.", translation: "I am twenty years old.", pronunciation: "SAH-yah DOO-ah POO-loo TAH-hoon" },
      { text: "Dia baik hati.", translation: "He/She is kind.", pronunciation: "DEE-ah BAH-eek HAH-tee" },
    ],
    activities: [
      { id: "id-lesson-8-act-1", type: "multiple-choice", question: 'What does "Umur" mean?', correctAnswer: "Age", options: ["Age", "Year", "Big", "Small"] },
      { id: "id-lesson-8-act-2", type: "multiple-choice", question: 'How do you ask "How old are you?"', correctAnswer: "Berapa umur Anda?", options: ["Berapa umur Anda?", "Siapa nama Anda?", "Anda dari mana?", "Apa kabar?"] },
      { id: "id-lesson-8-act-3", type: "translate", question: 'Translate: "small"', correctAnswer: "Kecil", hint: "Opposite of besar." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("age and descriptions in Indonesian", "Tahun, Umur, Besar, Kecil, Baik hati, Berapa umur Anda, Saya dua puluh tahun, and Dia baik hati"),
      introMessage: "你好！今天我們來學怎麼問年齡，還有一些簡單的形容詞，準備好了嗎？",
      topics: ["age", "descriptions", "adjectives"],
    },
  },

  {
    id: "id-lesson-9",
    unitId: "id-unit-2",
    title: "Pekerjaan",
    description: "Jobs and professions",
    icon: "💼",
    xpReward: 12,
    goals: [
      { description: "Learn job vocabulary", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Pekerjaan", translation: "Job / occupation", pronunciation: "pe-ker-JAH-ahn", emoji: "💼" },
      { word: "Guru", translation: "Teacher", pronunciation: "GOO-roo", emoji: "👩‍🏫" },
      { word: "Dokter", translation: "Doctor", pronunciation: "DOK-ter", emoji: "👨‍⚕️" },
      { word: "Mahasiswa", translation: "University student", pronunciation: "mah-hah-SEES-wah", emoji: "🎓" },
      { word: "Karyawan", translation: "Employee / worker", pronunciation: "kar-YAH-wahn", emoji: "🏢" },
    ],
    phrases: [
      { text: "Saya seorang guru.", translation: "I am a teacher.", pronunciation: "SAH-yah se-OR-ahng GOO-roo" },
      { text: "Apa pekerjaan Anda?", translation: "What is your job?", pronunciation: "AH-pah pe-ker-JAH-ahn AHN-dah" },
      { text: "Dia dokter.", translation: "He/She is a doctor.", pronunciation: "DEE-ah DOK-ter" },
    ],
    activities: [
      { id: "id-lesson-9-act-1", type: "multiple-choice", question: 'What does "Guru" mean?', correctAnswer: "Teacher", options: ["Teacher", "Doctor", "Student", "Employee"] },
      { id: "id-lesson-9-act-2", type: "multiple-choice", question: 'How do you say "doctor"?', correctAnswer: "Dokter", options: ["Dokter", "Guru", "Karyawan", "Mahasiswa"] },
      { id: "id-lesson-9-act-3", type: "translate", question: 'Translate: "What is your job?"', correctAnswer: "Apa pekerjaan Anda?", hint: "Uses pekerjaan." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian job vocabulary", "Pekerjaan, Guru, Dokter, Mahasiswa, Karyawan, Saya seorang guru, Apa pekerjaan Anda, and Dia dokter"),
      introMessage: "你好！今天來學職業詞彙，比如老師、醫生，準備好了嗎？",
      topics: ["jobs", "professions", "work"],
    },
  },

  {
    id: "id-lesson-10",
    unitId: "id-unit-2",
    title: "Hobi & Waktu Luang",
    description: "Hobbies and free time",
    icon: "🎨",
    xpReward: 12,
    goals: [
      { description: "Learn hobby words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Hobi", translation: "Hobby", pronunciation: "HOH-bee", emoji: "🎨" },
      { word: "Membaca", translation: "Reading", pronunciation: "mem-BAH-chah", emoji: "📚" },
      { word: "Menonton", translation: "Watching", pronunciation: "me-NON-ton", emoji: "📺" },
      { word: "Olahraga", translation: "Sports / exercise", pronunciation: "oh-lah-RAH-gah", emoji: "⚽" },
      { word: "Musik", translation: "Music", pronunciation: "MOO-seek", emoji: "🎵" },
    ],
    phrases: [
      { text: "Hobi saya membaca.", translation: "My hobby is reading.", pronunciation: "HOH-bee SAH-yah mem-BAH-chah" },
      { text: "Saya suka olahraga.", translation: "I like sports.", pronunciation: "SAH-yah SOO-kah oh-lah-RAH-gah" },
      { text: "Apa hobi Anda?", translation: "What is your hobby?", pronunciation: "AH-pah HOH-bee AHN-dah" },
    ],
    activities: [
      { id: "id-lesson-10-act-1", type: "multiple-choice", question: 'What does "Membaca" mean?', correctAnswer: "Reading", options: ["Reading", "Watching", "Sports", "Music"] },
      { id: "id-lesson-10-act-2", type: "multiple-choice", question: 'How do you say "hobby"?', correctAnswer: "Hobi", options: ["Hobi", "Musik", "Olahraga", "Membaca"] },
      { id: "id-lesson-10-act-3", type: "translate", question: 'Translate: "I like sports."', correctAnswer: "Saya suka olahraga", hint: "Suka means like." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian hobby vocabulary", "Hobi, Membaca, Menonton, Olahraga, Musik, Hobi saya membaca, Saya suka olahraga, and Apa hobi Anda"),
      introMessage: "你好！今天聊聊興趣和休閒時間，用印尼語說你喜歡做什麼，準備好了嗎？",
      topics: ["hobbies", "free time", "likes"],
    },
  },

  // ─── Unit 3: Makanan & Minuman ─────────────────────────────────────────

  {
    id: "id-lesson-11",
    unitId: "id-unit-3",
    title: "Makanan Dasar",
    description: "Basic food vocabulary",
    icon: "🍚",
    xpReward: 12,
    goals: [
      { description: "Learn basic food words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Nasi", translation: "Rice", pronunciation: "NAH-see", emoji: "🍚" },
      { word: "Ayam", translation: "Chicken", pronunciation: "AH-yahm", emoji: "🍗" },
      { word: "Ikan", translation: "Fish", pronunciation: "EE-kahn", emoji: "🐟" },
      { word: "Sayur", translation: "Vegetables", pronunciation: "SAH-yoor", emoji: "🥬" },
      { word: "Buah", translation: "Fruit", pronunciation: "BOO-ah", emoji: "🍎" },
    ],
    phrases: [
      { text: "Saya mau nasi.", translation: "I want rice.", pronunciation: "SAH-yah MAH-oo NAH-see" },
      { text: "Ada ayam?", translation: "Is there chicken?", pronunciation: "AH-dah AH-yahm" },
      { text: "Saya suka ikan.", translation: "I like fish.", pronunciation: "SAH-yah SOO-kah EE-kahn" },
    ],
    activities: [
      { id: "id-lesson-11-act-1", type: "multiple-choice", question: 'What does "Nasi" mean?', correctAnswer: "Rice", options: ["Rice", "Chicken", "Fish", "Fruit"] },
      { id: "id-lesson-11-act-2", type: "multiple-choice", question: 'How do you say "vegetables"?', correctAnswer: "Sayur", options: ["Sayur", "Buah", "Nasi", "Ikan"] },
      { id: "id-lesson-11-act-3", type: "translate", question: 'Translate: "I want rice."', correctAnswer: "Saya mau nasi", hint: "Mau means want." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("basic Indonesian food vocabulary", "Nasi, Ayam, Ikan, Sayur, Buah, Saya mau nasi, Ada ayam, and Saya suka ikan"),
      introMessage: "你好！印尼美食很有名！今天我們來學基本的食物詞彙，準備好了嗎？",
      topics: ["food", "rice", "meat", "vegetables"],
    },
  },

  {
    id: "id-lesson-12",
    unitId: "id-unit-3",
    title: "Minuman",
    description: "Drinks and beverages",
    icon: "☕",
    xpReward: 12,
    goals: [
      { description: "Learn drink vocabulary", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Air", translation: "Water", pronunciation: "AH-eer", emoji: "💧" },
      { word: "Teh", translation: "Tea", pronunciation: "TEH", emoji: "🍵" },
      { word: "Kopi", translation: "Coffee", pronunciation: "KOH-pee", emoji: "☕" },
      { word: "Jus", translation: "Juice", pronunciation: "JOOS", emoji: "🧃" },
      { word: "Es", translation: "Ice / cold", pronunciation: "ES", emoji: "🧊" },
    ],
    phrases: [
      { text: "Saya mau kopi.", translation: "I want coffee.", pronunciation: "SAH-yah MAH-oo KOH-pee" },
      { text: "Teh panas, tolong.", translation: "Hot tea, please.", pronunciation: "TEH PAH-nahs TOH-long" },
      { text: "Es teh manis.", translation: "Sweet iced tea.", pronunciation: "ES TEH MAH-nees" },
    ],
    activities: [
      { id: "id-lesson-12-act-1", type: "multiple-choice", question: 'What does "Kopi" mean?', correctAnswer: "Coffee", options: ["Coffee", "Tea", "Water", "Juice"] },
      { id: "id-lesson-12-act-2", type: "multiple-choice", question: 'How do you say "water"?', correctAnswer: "Air", options: ["Air", "Es", "Jus", "Teh"] },
      { id: "id-lesson-12-act-3", type: "translate", question: 'Translate: "Sweet iced tea"', correctAnswer: "Es teh manis", hint: "Es means ice." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian drink vocabulary", "Air, Teh, Kopi, Jus, Es, Saya mau kopi, Teh panas tolong, and Es teh manis"),
      introMessage: "你好！在印尼，冰甜茶 es teh 非常受歡迎。今天我們來學飲料詞彙，準備好了嗎？",
      topics: ["drinks", "tea", "coffee", "ordering drinks"],
    },
  },

  {
    id: "id-lesson-13",
    unitId: "id-unit-3",
    title: "Rasa & Rasa Makanan",
    description: "Tastes and flavors",
    icon: "🌶️",
    xpReward: 12,
    goals: [
      { description: "Learn taste words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Enak", translation: "Delicious", pronunciation: "EH-nahk", emoji: "😋" },
      { word: "Pedas", translation: "Spicy", pronunciation: "pe-DAHS", emoji: "🌶️" },
      { word: "Manis", translation: "Sweet", pronunciation: "MAH-nees", emoji: "🍬" },
      { word: "Asin", translation: "Salty", pronunciation: "AH-seen", emoji: "🧂" },
      { word: "Pahit", translation: "Bitter", pronunciation: "PAH-heet", emoji: "☕" },
    ],
    phrases: [
      { text: "Makanan ini enak!", translation: "This food is delicious!", pronunciation: "mah-kah-NAH-nee EE-nee EH-nahk" },
      { text: "Terlalu pedas.", translation: "Too spicy.", pronunciation: "ter-LAH-oo pe-DAHS" },
      { text: "Sedikit manis.", translation: "A little sweet.", pronunciation: "se-dee-KEET MAH-nees" },
    ],
    activities: [
      { id: "id-lesson-13-act-1", type: "multiple-choice", question: 'What does "Enak" mean?', correctAnswer: "Delicious", options: ["Delicious", "Spicy", "Sweet", "Salty"] },
      { id: "id-lesson-13-act-2", type: "multiple-choice", question: 'How do you say "spicy"?', correctAnswer: "Pedas", options: ["Pedas", "Manis", "Asin", "Pahit"] },
      { id: "id-lesson-13-act-3", type: "translate", question: 'Translate: "Too spicy."', correctAnswer: "Terlalu pedas", hint: "Terlalu means too." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian taste vocabulary", "Enak, Pedas, Manis, Asin, Pahit, Makanan ini enak, Terlalu pedas, and Sedikit manis"),
      introMessage: "你好！印尼菜常常很辣！今天我們來學描述味道的詞，準備好了嗎？",
      topics: ["taste", "flavors", "spicy", "delicious"],
    },
  },

  {
    id: "id-lesson-14",
    unitId: "id-unit-3",
    title: "Di Warung",
    description: "Ordering at a food stall",
    icon: "🍜",
    xpReward: 15,
    goals: [
      { description: "Order food politely", xpReward: 8 },
      { description: "Complete all activities", xpReward: 7 },
    ],
    vocabulary: [
      { word: "Warung", translation: "Food stall / small eatery", pronunciation: "WAH-roong", emoji: "🏪" },
      { word: "Pesan", translation: "Order", pronunciation: "pe-SAHN", emoji: "📝" },
      { word: "Makan", translation: "Eat", pronunciation: "MAH-kahn", emoji: "🍽️" },
      { word: "Minum", translation: "Drink", pronunciation: "MEE-noom", emoji: "🥤" },
      { word: "Bayar", translation: "Pay", pronunciation: "BAH-yar", emoji: "💰" },
    ],
    phrases: [
      { text: "Saya mau pesan nasi goreng.", translation: "I want to order fried rice.", pronunciation: "SAH-yah MAH-oo pe-SAHN NAH-see GOR-reng" },
      { text: "Berapa harganya?", translation: "How much does it cost?", pronunciation: "be-RAH-pah har-GAH-nyah" },
      { text: "Saya mau makan di sini.", translation: "I want to eat here.", pronunciation: "SAH-yah MAH-oo MAH-kahn dee SEE-nee" },
    ],
    activities: [
      { id: "id-lesson-14-act-1", type: "multiple-choice", question: 'What does "Pesan" mean?', correctAnswer: "Order", options: ["Order", "Eat", "Pay", "Drink"] },
      { id: "id-lesson-14-act-2", type: "multiple-choice", question: 'How do you ask "How much does it cost?"', correctAnswer: "Berapa harganya?", options: ["Berapa harganya?", "Apa kabar?", "Siapa nama Anda?", "Ada ayam?"] },
      { id: "id-lesson-14-act-3", type: "translate", question: 'Translate: "I want to eat here."', correctAnswer: "Saya mau makan di sini", hint: "Di sini means here." },
      { id: "id-lesson-14-act-4", type: "multiple-choice", question: 'What is a "warung"?', correctAnswer: "Food stall", options: ["Food stall", "Hospital", "School", "Airport"] },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("ordering food at an Indonesian warung", "Warung, Pesan, Makan, Minum, Bayar, Saya mau pesan nasi goreng, Berapa harganya, and Saya mau makan di sini", "phrase"),
      introMessage: "你好！想像我們在印尼的小食攤 warung 點餐，今天我來教你怎麼點，準備好了嗎？",
      topics: ["ordering", "warung", "food stall", "prices"],
    },
  },

  {
    id: "id-lesson-15",
    unitId: "id-unit-3",
    title: "Sarapan & Makan Siang",
    description: "Meals of the day",
    icon: "🍳",
    xpReward: 12,
    goals: [
      { description: "Learn meal vocabulary", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Sarapan", translation: "Breakfast", pronunciation: "sah-RAH-pahn", emoji: "🍳" },
      { word: "Makan siang", translation: "Lunch", pronunciation: "MAH-kahn see-AHNG", emoji: "🍱" },
      { word: "Makan malam", translation: "Dinner", pronunciation: "MAH-kahn MAH-lahm", emoji: "🍽️" },
      { word: "Lapar", translation: "Hungry", pronunciation: "LAH-par", emoji: "😋" },
      { word: "Kenyang", translation: "Full / satisfied", pronunciation: "ken-YAHNG", emoji: "😊" },
    ],
    phrases: [
      { text: "Saya lapar.", translation: "I am hungry.", pronunciation: "SAH-yah LAH-par" },
      { text: "Sudah sarapan?", translation: "Have you had breakfast?", pronunciation: "SOO-dah sah-RAH-pahn" },
      { text: "Saya sudah kenyang.", translation: "I am full.", pronunciation: "SAH-yah SOO-dah ken-YAHNG" },
    ],
    activities: [
      { id: "id-lesson-15-act-1", type: "multiple-choice", question: 'What does "Sarapan" mean?', correctAnswer: "Breakfast", options: ["Breakfast", "Lunch", "Dinner", "Hungry"] },
      { id: "id-lesson-15-act-2", type: "multiple-choice", question: 'How do you say "I am hungry"?', correctAnswer: "Saya lapar", options: ["Saya lapar", "Saya kenyang", "Saya mau", "Saya baik"] },
      { id: "id-lesson-15-act-3", type: "translate", question: 'Translate: "I am full."', correctAnswer: "Saya sudah kenyang", hint: "Sudah means already." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian meal vocabulary", "Sarapan, Makan siang, Makan malam, Lapar, Kenyang, Saya lapar, Sudah sarapan, and Saya sudah kenyang"),
      introMessage: "你好！今天來學早餐、午餐、晚餐，還有「餓了」和「飽了」，準備好了嗎？",
      topics: ["meals", "breakfast", "lunch", "dinner", "hungry"],
    },
  },

  // ─── Unit 4: Belanja & Uang ────────────────────────────────────────────

  {
    id: "id-lesson-16",
    unitId: "id-unit-4",
    title: "Belanja Dasar",
    description: "Basic shopping vocabulary",
    icon: "🛒",
    xpReward: 12,
    goals: [
      { description: "Learn shopping words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Belanja", translation: "Shopping", pronunciation: "be-LAHN-jah", emoji: "🛒" },
      { word: "Beli", translation: "Buy", pronunciation: "BE-lee", emoji: "🛍️" },
      { word: "Jual", translation: "Sell", pronunciation: "JOO-ahl", emoji: "🏷️" },
      { word: "Harga", translation: "Price", pronunciation: "HAR-gah", emoji: "💲" },
      { word: "Toko", translation: "Shop / store", pronunciation: "TOH-koh", emoji: "🏪" },
    ],
    phrases: [
      { text: "Saya mau beli ini.", translation: "I want to buy this.", pronunciation: "SAH-yah MAH-oo BE-lee EE-nee" },
      { text: "Berapa harganya?", translation: "How much is the price?", pronunciation: "be-RAH-pah har-GAH-nyah" },
      { text: "Di mana toko?", translation: "Where is the shop?", pronunciation: "dee MAH-nah TOH-koh" },
    ],
    activities: [
      { id: "id-lesson-16-act-1", type: "multiple-choice", question: 'What does "Beli" mean?', correctAnswer: "Buy", options: ["Buy", "Sell", "Price", "Shop"] },
      { id: "id-lesson-16-act-2", type: "multiple-choice", question: 'How do you say "price"?', correctAnswer: "Harga", options: ["Harga", "Toko", "Belanja", "Jual"] },
      { id: "id-lesson-16-act-3", type: "translate", question: 'Translate: "I want to buy this."', correctAnswer: "Saya mau beli ini", hint: "Ini means this." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("basic Indonesian shopping vocabulary", "Belanja, Beli, Jual, Harga, Toko, Saya mau beli ini, Berapa harganya, and Di mana toko"),
      introMessage: "你好！今天來學購物基本詞彙，在印尼買東西很實用，準備好了嗎？",
      topics: ["shopping", "buying", "prices", "stores"],
    },
  },

  {
    id: "id-lesson-17",
    unitId: "id-unit-4",
    title: "Uang & Bayar",
    description: "Money and paying",
    icon: "💵",
    xpReward: 12,
    goals: [
      { description: "Learn money vocabulary", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Uang", translation: "Money", pronunciation: "OO-ahng", emoji: "💵" },
      { word: "Rupiah", translation: "Indonesian currency", pronunciation: "roo-PEE-ah", emoji: "🇮🇩" },
      { word: "Tunai", translation: "Cash", pronunciation: "TOO-nah-ee", emoji: "💴" },
      { word: "Kartu", translation: "Card", pronunciation: "KAR-too", emoji: "💳" },
      { word: "Kembalian", translation: "Change (money back)", pronunciation: "kem-BAH-lee-ahn", emoji: "🪙" },
    ],
    phrases: [
      { text: "Berapa totalnya?", translation: "What is the total?", pronunciation: "be-RAH-pah to-TAHL-nyah" },
      { text: "Saya bayar tunai.", translation: "I pay with cash.", pronunciation: "SAH-yah BAH-yar TOO-nah-ee" },
      { text: "Ini uang kembalian.", translation: "Here is your change.", pronunciation: "EE-nee OO-ahng kem-BAH-lee-ahn" },
    ],
    activities: [
      { id: "id-lesson-17-act-1", type: "multiple-choice", question: 'What does "Uang" mean?', correctAnswer: "Money", options: ["Money", "Card", "Cash", "Change"] },
      { id: "id-lesson-17-act-2", type: "multiple-choice", question: 'What is Indonesia\'s currency?', correctAnswer: "Rupiah", options: ["Rupiah", "Dollar", "Yen", "Euro"] },
      { id: "id-lesson-17-act-3", type: "translate", question: 'Translate: "I pay with cash."', correctAnswer: "Saya bayar tunai", hint: "Tunai means cash." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian money and payment vocabulary", "Uang, Rupiah, Tunai, Kartu, Kembalian, Berapa totalnya, Saya bayar tunai, and Ini uang kembalian"),
      introMessage: "你好！在印尼用 rupiah 盧比。今天我們來學跟錢有關的詞，準備好了嗎？",
      topics: ["money", "rupiah", "cash", "paying"],
    },
  },

  {
    id: "id-lesson-18",
    unitId: "id-unit-4",
    title: "Warna & Ukuran",
    description: "Colors and sizes when shopping",
    icon: "🎨",
    xpReward: 12,
    goals: [
      { description: "Learn colors and sizes", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Merah", translation: "Red", pronunciation: "MEH-rah", emoji: "🔴" },
      { word: "Biru", translation: "Blue", pronunciation: "BEE-roo", emoji: "🔵" },
      { word: "Hitam", translation: "Black", pronunciation: "HEE-tahm", emoji: "⚫" },
      { word: "Putih", translation: "White", pronunciation: "POO-teh", emoji: "⚪" },
      { word: "Besar / Kecil", translation: "Large / Small", pronunciation: "be-SAHR / ke-CHEEL", emoji: "📐" },
    ],
    phrases: [
      { text: "Saya mau yang merah.", translation: "I want the red one.", pronunciation: "SAH-yah MAH-oo yahng MEH-rah" },
      { text: "Ada ukuran besar?", translation: "Do you have a large size?", pronunciation: "AH-dah oo-KOO-rahn be-SAHR" },
      { text: "Yang kecil, tolong.", translation: "The small one, please.", pronunciation: "yahng ke-CHEEL TOH-long" },
    ],
    activities: [
      { id: "id-lesson-18-act-1", type: "multiple-choice", question: 'What does "Merah" mean?', correctAnswer: "Red", options: ["Red", "Blue", "Black", "White"] },
      { id: "id-lesson-18-act-2", type: "multiple-choice", question: 'How do you say "white"?', correctAnswer: "Putih", options: ["Putih", "Hitam", "Biru", "Merah"] },
      { id: "id-lesson-18-act-3", type: "translate", question: 'Translate: "I want the red one."', correctAnswer: "Saya mau yang merah", hint: "Yang means the one." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("colors and sizes in Indonesian shopping", "Merah, Biru, Hitam, Putih, Besar, Kecil, Saya mau yang merah, Ada ukuran besar, and Yang kecil tolong"),
      introMessage: "你好！購物時要說顏色和尺寸。今天我們來學這些詞，準備好了嗎？",
      topics: ["colors", "sizes", "shopping"],
    },
  },

  {
    id: "id-lesson-19",
    unitId: "id-unit-4",
    title: "Di Pasar",
    description: "At the traditional market",
    icon: "🏪",
    xpReward: 15,
    goals: [
      { description: "Learn market vocabulary", xpReward: 8 },
      { description: "Complete all activities", xpReward: 7 },
    ],
    vocabulary: [
      { word: "Pasar", translation: "Market", pronunciation: "PAH-sahr", emoji: "🏪" },
      { word: "Segar", translation: "Fresh", pronunciation: "SEH-gar", emoji: "🥬" },
      { word: "Kilo", translation: "Kilogram", pronunciation: "KEE-loh", emoji: "⚖️" },
      { word: "Tawar", translation: "Bargain / negotiate", pronunciation: "TAH-war", emoji: "🤝" },
    ],
    phrases: [
      { text: "Satu kilo, berapa?", translation: "One kilo, how much?", pronunciation: "SAH-too KEE-loh be-RAH-pah" },
      { text: "Bisa kurang?", translation: "Can it be cheaper?", pronunciation: "BEE-sah KOO-rahng" },
      { text: "Sayur segar.", translation: "Fresh vegetables.", pronunciation: "SAH-yoor SEH-gar" },
    ],
    activities: [
      { id: "id-lesson-19-act-1", type: "multiple-choice", question: 'What does "Pasar" mean?', correctAnswer: "Market", options: ["Market", "Shop", "Restaurant", "Bank"] },
      { id: "id-lesson-19-act-2", type: "multiple-choice", question: 'How do you ask "Can it be cheaper?"', correctAnswer: "Bisa kurang?", options: ["Bisa kurang?", "Berapa harganya?", "Saya mau beli", "Tolong bantu"] },
      { id: "id-lesson-19-act-3", type: "translate", question: 'Translate: "Fresh vegetables."', correctAnswer: "Sayur segar", hint: "Segar means fresh." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("shopping at an Indonesian pasar (market)", "Pasar, Segar, Kilo, Tawar, Satu kilo berapa, Bisa kurang, and Sayur segar", "phrase"),
      introMessage: "你好！想像我們在熱鬧的印尼傳統市場 pasar 買菜，準備好了嗎？",
      topics: ["market", "bargaining", "fresh produce"],
    },
  },

  {
    id: "id-lesson-20",
    unitId: "id-unit-4",
    title: "Murah & Mahal",
    description: "Cheap, expensive, and comparing prices",
    icon: "💰",
    xpReward: 12,
    goals: [
      { description: "Compare prices", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Murah", translation: "Cheap", pronunciation: "MOO-rah", emoji: "💚" },
      { word: "Mahal", translation: "Expensive", pronunciation: "MAH-hahl", emoji: "💸" },
      { word: "Diskon", translation: "Discount", pronunciation: "DEES-kon", emoji: "🏷️" },
      { word: "Gratis", translation: "Free", pronunciation: "GRAH-tis", emoji: "🎁" },
      { word: "Promo", translation: "Promotion / sale", pronunciation: "PROH-moh", emoji: "📢" },
    ],
    phrases: [
      { text: "Ini terlalu mahal.", translation: "This is too expensive.", pronunciation: "EE-nee ter-LAH-oo MAH-hahl" },
      { text: "Ada yang lebih murah?", translation: "Is there something cheaper?", pronunciation: "AH-dah yahng le-BEEH MOO-rah" },
      { text: "Sedang ada promo.", translation: "There is a sale now.", pronunciation: "se-DAHNG AH-dah PROH-moh" },
    ],
    activities: [
      { id: "id-lesson-20-act-1", type: "multiple-choice", question: 'What does "Murah" mean?', correctAnswer: "Cheap", options: ["Cheap", "Expensive", "Free", "Discount"] },
      { id: "id-lesson-20-act-2", type: "multiple-choice", question: 'How do you say "expensive"?', correctAnswer: "Mahal", options: ["Mahal", "Murah", "Gratis", "Promo"] },
      { id: "id-lesson-20-act-3", type: "translate", question: 'Translate: "This is too expensive."', correctAnswer: "Ini terlalu mahal", hint: "Terlalu means too." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("price comparison in Indonesian", "Murah, Mahal, Diskon, Gratis, Promo, Ini terlalu mahal, Ada yang lebih murah, and Sedang ada promo"),
      introMessage: "你好！今天來學「便宜」和「貴」，購物時非常實用，準備好了嗎？",
      topics: ["cheap", "expensive", "discounts", "bargaining"],
    },
  },

  // ─── Unit 5: Perjalanan & Kehidupan Sehari-hari ────────────────────────

  {
    id: "id-lesson-21",
    unitId: "id-unit-5",
    title: "Arah & Jalan",
    description: "Directions and finding your way",
    icon: "🧭",
    xpReward: 15,
    goals: [
      { description: "Learn direction words", xpReward: 8 },
      { description: "Complete all activities", xpReward: 7 },
    ],
    vocabulary: [
      { word: "Kiri", translation: "Left", pronunciation: "KEE-ree", emoji: "⬅️" },
      { word: "Kanan", translation: "Right", pronunciation: "KAH-nahn", emoji: "➡️" },
      { word: "Lurus", translation: "Straight", pronunciation: "LOO-roos", emoji: "⬆️" },
      { word: "Dekat", translation: "Near / close", pronunciation: "DEH-kaht", emoji: "📍" },
      { word: "Jauh", translation: "Far", pronunciation: "JAH-oo", emoji: "🗺️" },
    ],
    phrases: [
      { text: "Belok kiri.", translation: "Turn left.", pronunciation: "BEH-lok KEE-ree" },
      { text: "Jalan lurus.", translation: "Go straight.", pronunciation: "JAH-lahn LOO-roos" },
      { text: "Di mana toilet?", translation: "Where is the restroom?", pronunciation: "dee MAH-nah TOY-let" },
    ],
    activities: [
      { id: "id-lesson-21-act-1", type: "multiple-choice", question: 'What does "Kiri" mean?', correctAnswer: "Left", options: ["Left", "Right", "Straight", "Near"] },
      { id: "id-lesson-21-act-2", type: "multiple-choice", question: 'How do you say "Go straight"?', correctAnswer: "Jalan lurus", options: ["Jalan lurus", "Belok kiri", "Belok kanan", "Di mana"] },
      { id: "id-lesson-21-act-3", type: "translate", question: 'Translate: "Turn left."', correctAnswer: "Belok kiri", hint: "Belok means turn." },
      { id: "id-lesson-21-act-4", type: "multiple-choice", question: 'What does "Jauh" mean?', correctAnswer: "Far", options: ["Far", "Near", "Left", "Right"] },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian directions", "Kiri, Kanan, Lurus, Dekat, Jauh, Belok kiri, Jalan lurus, and Di mana toilet", "phrase"),
      introMessage: "你好！在印尼旅行時，問路和方向很重要。今天我們來學，準備好了嗎？",
      topics: ["directions", "left", "right", "straight"],
    },
  },

  {
    id: "id-lesson-22",
    unitId: "id-unit-5",
    title: "Transportasi",
    description: "Transport and getting around",
    icon: "🚌",
    xpReward: 12,
    goals: [
      { description: "Learn transport words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Mobil", translation: "Car", pronunciation: "MOH-beel", emoji: "🚗" },
      { word: "Bus", translation: "Bus", pronunciation: "BOOS", emoji: "🚌" },
      { word: "Kereta", translation: "Train", pronunciation: "ke-REH-tah", emoji: "🚆" },
      { word: "Pesawat", translation: "Airplane", pronunciation: "pe-SAH-waht", emoji: "✈️" },
      { word: "Ojek", translation: "Motorcycle taxi", pronunciation: "OH-jek", emoji: "🏍️" },
    ],
    phrases: [
      { text: "Saya naik bus.", translation: "I take the bus.", pronunciation: "SAH-yah NAH-eek BOOS" },
      { text: "Ke bandara, tolong.", translation: "To the airport, please.", pronunciation: "keh bahn-DAH-rah TOH-long" },
      { text: "Berapa ongkosnya?", translation: "How much is the fare?", pronunciation: "be-RAH-pah ONG-kos-nyah" },
    ],
    activities: [
      { id: "id-lesson-22-act-1", type: "multiple-choice", question: 'What does "Pesawat" mean?', correctAnswer: "Airplane", options: ["Airplane", "Train", "Bus", "Car"] },
      { id: "id-lesson-22-act-2", type: "multiple-choice", question: 'What is an "ojek"?', correctAnswer: "Motorcycle taxi", options: ["Motorcycle taxi", "Airplane", "Train", "Boat"] },
      { id: "id-lesson-22-act-3", type: "translate", question: 'Translate: "I take the bus."', correctAnswer: "Saya naik bus", hint: "Naik means ride/take." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian transportation vocabulary", "Mobil, Bus, Kereta, Pesawat, Ojek, Saya naik bus, Ke bandara tolong, and Berapa ongkosnya"),
      introMessage: "你好！在印尼，ojek 機車計程車很常見。今天我們來學交通詞彙，準備好了嗎？",
      topics: ["transport", "bus", "train", "ojek"],
    },
  },

  {
    id: "id-lesson-23",
    unitId: "id-unit-5",
    title: "Di Hotel",
    description: "Hotel check-in and requests",
    icon: "🏨",
    xpReward: 15,
    goals: [
      { description: "Learn hotel vocabulary", xpReward: 8 },
      { description: "Complete all activities", xpReward: 7 },
    ],
    vocabulary: [
      { word: "Hotel", translation: "Hotel", pronunciation: "hoh-TEL", emoji: "🏨" },
      { word: "Kamar", translation: "Room", pronunciation: "KAH-mar", emoji: "🛏️" },
      { word: "Kunci", translation: "Key", pronunciation: "KOON-chee", emoji: "🔑" },
      { word: "Reservasi", translation: "Reservation", pronunciation: "re-ser-VAH-see", emoji: "📋" },
      { word: "Check-in", translation: "Check-in", pronunciation: "CHEK-in", emoji: "✅" },
    ],
    phrases: [
      { text: "Saya punya reservasi.", translation: "I have a reservation.", pronunciation: "SAH-yah POON-yah re-ser-VAH-see" },
      { text: "Kamar nomor lima.", translation: "Room number five.", pronunciation: "KAH-mar NOH-mor LEE-mah" },
      { text: "WiFi-nya apa?", translation: "What is the WiFi password?", pronunciation: "WEE-fee-nyah AH-pah" },
    ],
    activities: [
      { id: "id-lesson-23-act-1", type: "multiple-choice", question: 'What does "Kamar" mean?', correctAnswer: "Room", options: ["Room", "Key", "Hotel", "Reservation"] },
      { id: "id-lesson-23-act-2", type: "multiple-choice", question: 'How do you say "I have a reservation"?', correctAnswer: "Saya punya reservasi", options: ["Saya punya reservasi", "Saya mau kamar", "Di mana hotel", "Berapa harganya"] },
      { id: "id-lesson-23-act-3", type: "translate", question: 'Translate: "key"', correctAnswer: "Kunci", hint: "You need it for your room." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian hotel vocabulary", "Hotel, Kamar, Kunci, Reservasi, Check-in, Saya punya reservasi, Kamar nomor lima, and WiFi-nya apa", "phrase"),
      introMessage: "你好！想像我們在印尼飯店 check-in，今天我來教你實用的飯店用語，準備好了嗎？",
      topics: ["hotel", "check-in", "room", "reservation"],
    },
  },

  {
    id: "id-lesson-24",
    unitId: "id-unit-5",
    title: "Cuaca",
    description: "Weather and seasons",
    icon: "🌤️",
    xpReward: 12,
    goals: [
      { description: "Learn weather words", xpReward: 6 },
      { description: "Complete all activities", xpReward: 6 },
    ],
    vocabulary: [
      { word: "Cuaca", translation: "Weather", pronunciation: "CHWAH-chah", emoji: "🌤️" },
      { word: "Panas", translation: "Hot", pronunciation: "PAH-nahs", emoji: "☀️" },
      { word: "Hujan", translation: "Rain / rainy", pronunciation: "HOO-jahn", emoji: "🌧️" },
      { word: "Dingin", translation: "Cold", pronunciation: "DEEN-geen", emoji: "❄️" },
      { word: "Angin", translation: "Wind / windy", pronunciation: "AHN-geen", emoji: "💨" },
    ],
    phrases: [
      { text: "Hari ini panas.", translation: "Today is hot.", pronunciation: "HAH-ree EE-nee PAH-nahs" },
      { text: "Akan hujan.", translation: "It will rain.", pronunciation: "AH-kahn HOO-jahn" },
      { text: "Cuaca bagus.", translation: "The weather is nice.", pronunciation: "CHWAH-chah BAH-goos" },
    ],
    activities: [
      { id: "id-lesson-24-act-1", type: "multiple-choice", question: 'What does "Hujan" mean?', correctAnswer: "Rain", options: ["Rain", "Hot", "Cold", "Wind"] },
      { id: "id-lesson-24-act-2", type: "multiple-choice", question: 'How do you say "hot"?', correctAnswer: "Panas", options: ["Panas", "Dingin", "Hujan", "Angin"] },
      { id: "id-lesson-24-act-3", type: "translate", question: 'Translate: "The weather is nice."', correctAnswer: "Cuaca bagus", hint: "Bagus means good/nice." },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian weather vocabulary", "Cuaca, Panas, Hujan, Dingin, Angin, Hari ini panas, Akan hujan, and Cuaca bagus"),
      introMessage: "你好！印尼天氣又熱又常下雨。今天我們來學天氣詞彙，準備好了嗎？",
      topics: ["weather", "hot", "rain", "seasons"],
    },
  },

  {
    id: "id-lesson-25",
    unitId: "id-unit-5",
    title: "Darurat & Bantuan",
    description: "Emergency phrases and asking for help",
    icon: "🆘",
    xpReward: 15,
    goals: [
      { description: "Learn emergency phrases", xpReward: 8 },
      { description: "Complete all activities", xpReward: 7 },
    ],
    vocabulary: [
      { word: "Tolong!", translation: "Help!", pronunciation: "TOH-long", emoji: "🆘" },
      { word: "Rumah sakit", translation: "Hospital", pronunciation: "ROO-mah SAH-keet", emoji: "🏥" },
      { word: "Polisi", translation: "Police", pronunciation: "poh-LEE-see", emoji: "🚔" },
      { word: "Sakit", translation: "Sick / pain", pronunciation: "SAH-keet", emoji: "🤒" },
      { word: "Bahaya", translation: "Danger", pronunciation: "bah-HAH-yah", emoji: "⚠️" },
    ],
    phrases: [
      { text: "Tolong, saya sakit!", translation: "Help, I am sick!", pronunciation: "TOH-long SAH-yah SAH-keet" },
      { text: "Di mana rumah sakit?", translation: "Where is the hospital?", pronunciation: "dee MAH-nah ROO-mah SAH-keet" },
      { text: "Panggil polisi!", translation: "Call the police!", pronunciation: "PAHNG-geel poh-LEE-see" },
    ],
    activities: [
      { id: "id-lesson-25-act-1", type: "multiple-choice", question: 'What does "Rumah sakit" mean?', correctAnswer: "Hospital", options: ["Hospital", "Police", "Danger", "Help"] },
      { id: "id-lesson-25-act-2", type: "multiple-choice", question: 'How do you say "Help!"?', correctAnswer: "Tolong!", options: ["Tolong!", "Maaf", "Terima kasih", "Baik"] },
      { id: "id-lesson-25-act-3", type: "translate", question: 'Translate: "Where is the hospital?"', correctAnswer: "Di mana rumah sakit?", hint: "Di mana means where." },
      { id: "id-lesson-25-act-4", type: "multiple-choice", question: 'What does "Bahaya" mean?', correctAnswer: "Danger", options: ["Danger", "Sick", "Help", "Police"] },
    ],
    aiTeacherPrompt: {
      systemPrompt: sariPrompt("Indonesian emergency phrases", "Tolong, Rumah sakit, Polisi, Sakit, Bahaya, Tolong saya sakit, Di mana rumah sakit, and Panggil polisi", "phrase"),
      introMessage: "你好！希望永遠用不到，但緊急用語很重要。今天我們來學，準備好了嗎？",
      topics: ["emergency", "help", "hospital", "police"],
    },
  },
];
