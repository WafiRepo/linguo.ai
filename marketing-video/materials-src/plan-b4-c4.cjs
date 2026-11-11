// Plan for learning materials Bagian VII–XVIII (AI Teacher B·Topik 4–11, C·Topik 1–4).
// Run from marketing-video/materials-src:  node plan-b4-c4.cjs
// It writes: icon/scene prompt files, adds the tasks to batch.json, and prints
// the MATERIAL_PAGES entries and crop_icons.py SHEETS to paste (done once).
const fs = require("fs");
const path = require("path");

const MALE =
  "In this image the teacher is an Indonesian MALE teacher (Pak Guru): short black hair, light-blue batik shirt, " +
  "dark trousers. There is no female teacher.";

// icons: [file-name, word, zh, icon description]; reuse: icon names drawn on an earlier sheet.
const PAGES = [
  {
    id: "bagian-7", numeral: "VII", topic: "b-topik-4", male: true,
    zhTitle: "玩骰子和字卡", idTitle: "Bermain Dadu dan Kartu Kata",
    icons: [
      ["dadu", "dadu", "骰子", "one white six-sided dice showing dots"],
      ["kartu-kata", "kartu kata", "字卡", "a small stack of blank colourful word cards"],
      ["lempar", "lempar", "丟", "a child's hand throwing a dice, small motion lines"],
      ["ambil", "ambil", "拿", "a child's hand picking up one card from a stack"],
      ["jawab", "jawab", "回答", "a child raising a hand happily to answer"],
      ["pertanyaan", "pertanyaan", "問題", "a big friendly question mark in a round bubble"],
      ["angka", "angka", "數字", "a dice face with five dots next to a sparkle"],
      ["tidak-tahu", "tidak tahu", "不知道", "a child shrugging with both palms up, puzzled face"],
    ],
    sentences: [
      ["Ini dadu.", "這是骰子。", "The teacher holds up a big dice and shows it to two curious children."],
      ["Pertama, lempar dadu.", "首先，丟骰子。", "A child throws a dice onto a classroom table while friends watch."],
      ["Kedua, ambil satu kartu kata.", "第二，拿一張字卡。", "A child picks one card from a stack of word cards on the table."],
      ["Ketiga, jawab pertanyaannya.", "第三，回答問題。", "A child holds a card and answers happily; the teacher listens and smiles."],
      ["Angka lima.", "五點。", "Close view of a dice on the table showing five dots, a child pointing at it."],
    ],
  },
  {
    id: "bagian-8", numeral: "VIII", topic: "b-topik-5",
    zhTitle: "確認理解", idTitle: "Memastikan Pemahaman",
    icons: [
      ["jelas", "jelas", "清楚", "a shining light bulb above a clear sparkling eye"],
      ["mengerti", "mengerti", "了解", "a child nodding with a happy face and a small check mark"],
      ["ya", "ya", "是的", "a child nodding yes with a big smile, small nod lines"],
      ["ada", "ada", "有", "a hand holding up one small object, a gentle highlight around it"],
      ["tidak-ada", "tidak ada", "沒有", "an empty open box with nothing inside"],
    ],
    reuse: [["pertanyaan", "pertanyaan", "問題"]],
    sentences: [
      ["Apakah sudah jelas? Ya, sudah jelas.", "清楚了嗎？是的，清楚了。", "The teacher points at the board and asks; the children nod happily."],
      ["Apakah sudah mengerti? Ya, saya mengerti.", "了解了嗎？是的，我了解了。", "A child gives a thumbs up to the teacher who smiles."],
      ["Ada pertanyaan? Tidak ada.", "有問題嗎？沒有。", "The teacher looks at the class with an open hand; the children shake their heads with smiles."],
    ],
  },
  {
    id: "bagian-9", numeral: "IX", topic: "b-topik-6",
    zhTitle: "分組學習", idTitle: "Membagi Kelompok Belajar",
    icons: [
      ["kelompok", "kelompok", "小組", "three children standing together in a small circle"],
      ["bekerja", "bekerja", "活動", "two children working together on a paper at a desk"],
      ["tiga", "tiga (3)", "三", "three raised fingers on a hand"],
      ["orang", "orang", "人", "one simple child figure standing"],
      ["setiap", "setiap", "每個", "three children each holding up a hand, one after another"],
      ["berbicara", "berbicara", "發言", "a child speaking with small sound waves from the mouth"],
      ["lima-menit", "lima menit", "五分鐘", "a round wall clock with a highlighted five-minute section"],
      ["siap", "siap", "準備好", "a child standing up straight with a confident smile and fists up"],
    ],
    sentences: [
      ["Sekarang kita akan bekerja dalam kelompok.", "現在我們要分組活動。", "The teacher gestures to the class while children move their desks together."],
      ["Satu kelompok tiga orang.", "三人一組。", "Three children sit together around one desk as a group."],
      ["Setiap orang harus berbicara.", "每個人都要發言。", "In a group of three, one child speaks while the other two listen."],
      ["Kalian punya lima menit.", "你們有五分鐘。", "The teacher points at a wall clock; groups of children are working."],
      ["Kami siap.", "我們準備好了。", "A group of three children raise their hands together, ready."],
    ],
  },
  {
    id: "bagian-10", numeral: "X", topic: "b-topik-7", male: true,
    zhTitle: "在課堂上自我介紹", idTitle: "Berkenalan di Kelas",
    icons: [
      ["halo", "halo", "你好", "a child waving hello with a big smile"],
      ["nama", "nama", "名字", "a blank name tag sticker"],
      ["saya", "saya", "我", "a child pointing at their own chest"],
      ["contoh", "contoh", "例子", "a small whiteboard with a simple drawing and a pointer"],
      ["sederhana", "sederhana", "簡單", "one simple round shape next to a small check mark"],
      ["memberikan", "memberikan", "給", "one hand giving a card to another hand"],
      ["kami", "kami", "我們", "three children standing side by side pointing at themselves"],
    ],
    reuse: [["mengerti", "mengerti", "了解"]],
    sentences: [
      ["Mari kita lihat contoh.", "我們來看例子。", "The teacher stands by the board and invites the children to look."],
      ["Nama saya Budi.", "我的名字是 Budi。", "The teacher points at himself with a friendly smile, wearing a blank name tag."],
      ["Halo, Pak Budi. Nama saya Andi.", "您好，Budi老師。我的名字是 Andi。", "A boy waves and introduces himself to the teacher."],
      ["Ya, kami mengerti.", "是的，我們了解了。", "The children nod and smile together."],
    ],
  },
  {
    id: "bagian-11", numeral: "XI", topic: "b-topik-8",
    zhTitle: "回答詞彙並獲得稱讚", idTitle: "Menjawab Kosakata dan Mendapat Pujian",
    icons: [
      ["guru", "guru", "老師", "a friendly teacher figure holding a book"],
      ["siswa", "siswa", "學生", "a child with a school backpack"],
      ["coba", "coba", "試試看", "a child thinking with one finger raised, trying"],
      ["sekali-lagi", "sekali lagi", "再一次", "a round circular arrow meaning again"],
      ["betul", "betul", "正確", "a big green check mark"],
      ["jawaban", "jawaban", "答案", "a paper with a check mark on it"],
      ["sangat-bagus", "sangat bagus", "很棒", "a thumbs up with sparkles"],
      ["terima-kasih", "terima kasih", "謝謝", "a child bowing slightly with hands together politely"],
    ],
    sentences: [
      ["Belum tepat. Coba sekali lagi.", "還不正確。再試一次。", "The teacher kindly encourages a thinking child to try again."],
      ["Betul! Jawabanmu benar.", "正確！你的答案正確。", "The teacher smiles widely; the child is happy after answering."],
      ["Sangat bagus!", "很棒！", "The teacher gives a thumbs up to the proud child."],
      ["Terima kasih, Bu Guru.", "謝謝老師。", "The child thanks the teacher politely."],
    ],
  },
  {
    id: "bagian-12", numeral: "XII", topic: "b-topik-9",
    zhTitle: "課堂討論", idTitle: "Diskusi di Kelas",
    icons: [
      ["membaca", "membaca", "閱讀", "a child reading an open book"],
      ["teks", "teks", "文章", "a page with a few grey lines of text-like strokes (no real letters)"],
      ["pendapat", "pendapat", "看法", "a child with a thought bubble containing a small light bulb"],
      ["menarik", "menarik", "有趣", "a child with sparkling excited eyes looking at a book"],
      ["pelajaran", "pelajaran", "課程", "a small classroom board with a book beside it"],
      ["lebih-keras", "lebih keras", "大聲一點", "a child speaking with big sound waves, a volume-up symbol"],
      ["setuju", "setuju", "同意", "two children giving each other a high five"],
      ["teman-teman", "teman-teman", "同學們", "a group of four smiling classmates"],
    ],
    sentences: [
      ["Setelah membaca teks ini, apa pendapatmu?", "讀完這篇文章後，你的看法是什麼？", "The teacher holds a paper and asks a child who is thinking."],
      ["Menurut saya, pelajaran hari ini sangat menarik.", "我覺得今天的課程非常有趣。", "A child stands and shares an opinion with sparkling eyes."],
      ["Bisa bicara lebih keras?", "可以說大聲一點嗎？", "The teacher cups a hand behind her ear, smiling."],
      ["Ya, kami setuju.", "是的，我們同意。", "Classmates nod and raise thumbs up together."],
    ],
  },
  {
    id: "bagian-13", numeral: "XIII", topic: "b-topik-10",
    zhTitle: "寫下主題與重要詞彙", idTitle: "Menulis Tema dan Kosakata Penting",
    icons: [
      ["tulis", "tulis", "寫", "a hand writing with a pencil on paper"],
      ["tema", "tema", "主題", "a notebook page with one big highlighted heading bar (no letters)"],
      ["kosakata", "kosakata", "詞彙", "a few small word cards fanned out"],
      ["penting", "penting", "重要", "a red star sticker"],
      ["selesai", "selesai", "完成", "a notebook with a big check mark"],
    ],
    sentences: [
      ["Tulis temanya.", "寫下主題。", "The teacher points at the board while children write in notebooks."],
      ["Tulis kosakata penting.", "寫下重要詞彙。", "A child writes carefully in a notebook with a star sticker beside it."],
      ["Sudah selesai.", "完成了。", "A child proudly shows a finished notebook page to the teacher."],
    ],
  },
  {
    id: "bagian-14", numeral: "XIV", topic: "b-topik-11",
    zhTitle: "說明家庭主題", idTitle: "Menjelaskan Topik Keluarga",
    icons: [
      ["topik", "topik", "主題", "a small board with a pin and a blank card"],
      ["keluarga", "keluarga", "家庭", "a happy family of father, mother and two children"],
      ["hari-ini", "hari ini", "今天", "a desk calendar page with a sun"],
      ["menjelaskan", "menjelaskan", "說明", "a teacher pointing at a board, explaining"],
      ["belum-paham", "belum paham", "還不懂", "a child with a small question mark above the head"],
      ["lagi", "lagi", "再", "two curved arrows forming a loop"],
      ["ayah", "ayah", "爸爸", "a smiling father"],
      ["ibu", "ibu", "媽媽", "a smiling mother"],
    ],
    sentences: [
      ["Topik hari ini adalah keluarga.", "今天的主題是家庭。", "The teacher shows a picture of a family on the board."],
      ["Saya akan menjelaskan kosakata keluarga.", "我要介紹家庭詞彙。", "The teacher points at small pictures of a father and a mother."],
      ["Jika belum paham, saya akan menjelaskan lagi.", "如果還不懂，我再說明一次。", "The teacher kindly explains again to a puzzled child."],
      ["Terima kasih.", "謝謝。", "The child thanks the teacher with a smile."],
    ],
  },
  {
    id: "bagian-15", numeral: "XV", topic: "c-topik-1", male: true,
    zhTitle: "交代作業", idTitle: "Memberikan Tugas dan PR",
    icons: [
      ["pekerjaan-rumah", "pekerjaan rumah (PR)", "課後作業", "a small house with a notebook and pencil in front"],
      ["minggu-depan", "minggu depan", "下週", "a calendar with an arrow pointing to the next week"],
      ["baca", "baca", "讀", "an open book with small sparkles"],
      ["hafalkan", "hafalkan", "背誦", "a child with closed eyes remembering, a small brain icon"],
      ["latihan", "latihan", "練習", "a worksheet with small boxes and a pencil"],
      ["nomor", "nomor", "題號", "a worksheet with numbered circles (only digits 1 2 3 allowed)"],
      ["kumpulkan", "kumpulkan", "繳交", "a child handing a stack of papers to a teacher's hand"],
      ["jangan-lupa", "jangan lupa", "不要忘記", "a string tied around a finger as a reminder"],
    ],
    sentences: [
      ["Ini pekerjaan rumah untuk minggu depan.", "這是下週的課後作業。", "The teacher hands out homework sheets to the children."],
      ["Bacalah halaman 20 sampai 25.", "請閱讀第20頁到第25頁。", "A child opens a textbook at home to read."],
      ["Hafalkan kosakata baru.", "請背誦新詞彙。", "A child practises word cards at a desk at home."],
      ["Kerjakan latihan nomor 1 sampai 5.", "請完成第一題到第五題。", "A child works on a worksheet with a pencil."],
      ["Jangan lupa mengerjakan PR. Kumpulkan minggu depan.", "不要忘記寫課後作業。下週繳交。", "Children hand in their homework to the teacher."],
    ],
  },
  {
    id: "bagian-16", numeral: "XVI", topic: "c-topik-2",
    zhTitle: "下課用語", idTitle: "Ungkapan Penutupan Kelas",
    icons: [
      ["sampai-di-sini", "sampai di sini", "到這裡", "a closed book with a bookmark"],
      ["sampai-jumpa", "sampai jumpa", "再見", "a child waving goodbye"],
      ["hati-hati", "hati-hati", "小心", "a child looking both ways at a zebra crossing"],
      ["jalan", "jalan", "路", "a short road with a zebra crossing"],
    ],
    reuse: [["minggu-depan", "minggu depan", "下週"], ["terima-kasih", "terima kasih", "謝謝"]],
    sentences: [
      ["Pelajaran hari ini sampai di sini.", "今天的課程到這裡。", "The teacher closes a book at the front of the class; children pack their bags."],
      ["Sampai jumpa minggu depan.", "下週見。", "The children wave goodbye to the teacher at the classroom door."],
      ["Hati-hati di jalan.", "路上小心。", "Children with backpacks walk home safely along a quiet street."],
    ],
  },
  {
    id: "bagian-17", numeral: "XVII", topic: "c-topik-3",
    zhTitle: "下次上課的主題", idTitle: "Topik Pertemuan Berikutnya",
    icons: [
      ["belajar", "belajar", "學習", "a child studying at a desk with a book"],
      ["tentang", "tentang", "關於", "a book with a small family picture on the cover"],
      ["menarik-sekali", "menarik sekali", "很有趣", "a child jumping with joy and sparkles"],
      ["persiapkan", "persiapkan", "準備", "a school backpack being packed with books"],
    ],
    reuse: [["minggu-depan", "minggu depan", "下週"], ["keluarga", "keluarga", "家庭"]],
    sentences: [
      ["Minggu depan kita akan belajar tentang keluarga.", "下週我們要學習家庭主題。", "The teacher shows a family picture and a calendar to the class."],
      ["Menarik sekali.", "很有趣。", "The children look excited with sparkling eyes."],
      ["Tolong persiapkan diri kalian.", "請做好準備。", "A child packs books into a backpack, ready for next week."],
    ],
  },
  {
    id: "bagian-18", numeral: "XVIII", topic: "c-topik-4",
    zhTitle: "學習後的反思", idTitle: "Refleksi Setelah Belajar",
    icons: [
      ["perasaan", "perasaan", "感覺", "a heart with a gentle smiling face"],
      ["senang", "senang", "開心", "a very happy smiling child"],
      ["banyak", "banyak", "很多", "a big pile of colourful word cards"],
      ["baru", "baru", "新的", "a shiny new book with sparkles"],
      ["paling-suka", "paling suka", "最喜歡", "a child hugging a book with hearts around"],
      ["sulit", "sulit", "困難", "a child scratching the head at a hard puzzle"],
      ["pengucapan", "pengucapan", "發音", "a mouth with sound waves coming out"],
      ["berlatih", "berlatih", "練習", "a child practising speaking in front of a small mirror"],
    ],
    sentences: [
      ["Saya senang karena belajar banyak kosakata baru.", "我很開心，因為學到了很多新詞彙。", "A happy child holds up many word cards."],
      ["Saya paling suka kata \"keluarga\".", "我最喜歡「keluarga」這個詞彙。", "A child hugs a card with a family picture."],
      ["Pengucapan beberapa kosakata masih sulit.", "有些詞彙的發音還是很難。", "A child tries to say a word, looking a little puzzled."],
      ["Tidak apa-apa. Teruslah berlatih.", "沒關係，繼續練習。", "The teacher kindly encourages the child, who smiles again."],
    ],
  },
];

const HERE = __dirname;
const PROMPTS = path.join(HERE, "prompts");
const REF = ["../../assets/learning-materials/bagian-2.jpg"];

const tasks = [];
for (const page of PAGES) {
  const n = page.id.split("-")[1];
  const grid = page.icons.length <= 4 ? 2 : 3;
  const cells = page.icons.map(([, , , desc], i) => `(${i + 1}) ${desc}`);
  while (cells.length < grid * grid) cells.push(`(${cells.length + 1}) leave this cell completely empty white`);
  const rows = [];
  for (let r = 0; r < grid; r++) rows.push(`Row ${r + 1}: ${cells.slice(r * grid, r * grid + grid).join("; ")}.`);
  fs.writeFileSync(
    path.join(PROMPTS, `icons-bag${n}.md`),
    `Create ONE square sheet with a strict ${grid}x${grid} grid of ${grid * grid} separate small icons on a pure white background. ` +
      "Each icon is centered in its own equal cell, with generous white space between cells so they can be cropped apart. " +
      "No grid lines, no borders, no text, no letters.\n\n" + rows.join("\n") + "\n",
  );
  tasks.push({ id: `icons-bag${n}`, promptFiles: ["prompts/style.md", `prompts/icons-bag${n}.md`], image: `raw/icons-bag${n}.png`, ar: "1:1", ref: REF });
  page.sentences.forEach(([, , scene], i) => {
    const id = `s-bag${n}-${i + 1}`;
    fs.writeFileSync(
      path.join(PROMPTS, `${id}.md`),
      `Single wide classroom scene, no text, no speech-bubble words. ${scene}${page.male ? `\n${MALE}` : ""}\n`,
    );
    tasks.push({ id, promptFiles: ["prompts/style.md", `prompts/${id}.md`], image: `raw/${id}.png`, ar: "4:3", ref: REF });
  });
}

// Keep earlier tasks, add the new ones (skip ids already present).
const batchPath = path.join(HERE, "batch.json");
const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
const known = new Set(batch.tasks.map((t) => t.id));
batch.tasks.push(...tasks.filter((t) => !known.has(t.id)));
fs.writeFileSync(batchPath, JSON.stringify(batch, null, 1) + "\n");

// For materials.ts and crop_icons.py
const pages = PAGES.map((page) => {
  const n = page.id.split("-")[1];
  return {
    id: page.id, numeral: page.numeral, zhTitle: page.zhTitle, idTitle: page.idTitle,
    words: [...page.icons.map(([icon, word, zh]) => ({ icon, word, zh })), ...(page.reuse || []).map(([icon, word, zh]) => ({ icon, word, zh }))],
    sentences: page.sentences.map(([id, zh], i) => ({ scene: `s-bag${n}-${i + 1}`, id, zh })),
  };
});
fs.writeFileSync(path.join(HERE, "plan-b4-c4.json"), JSON.stringify(pages, null, 1));
const sheets = PAGES.map((page) => {
  const n = page.id.split("-")[1];
  const grid = page.icons.length <= 4 ? 2 : 3;
  return `    "icons-bag${n}": (${grid}, [${page.icons.map(([icon]) => JSON.stringify(icon)).join(", ")}]),`;
});
fs.writeFileSync(path.join(HERE, "plan-b4-c4-sheets.txt"), sheets.join("\n") + "\n");
console.log(`${tasks.length} image tasks, ${pages.length} pages`);
