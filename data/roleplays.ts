import { RoleplayScenario } from "@/types/roleplay";

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: "pasar-buah",
    title: "在水果攤買水果",
    subtitle: "Membeli buah di pasar",
    emoji: "🥭",
    accentColor: "#FFF1DB",
    aiName: "Bu Sari",
    aiRole: "a friendly fruit seller at a traditional Indonesian market",
    setting: "a busy morning at a fruit stall selling mangoes, bananas and oranges",
    openingLine: "Selamat pagi! Mau beli buah apa hari ini?",
    xpReward: 15,
    objectives: [
      {
        id: "greet",
        label: "打招呼",
        goal: "greet the seller",
        targets: ["selamat pagi", "halo", "selamat siang", "pagi bu"],
      },
      {
        id: "ask-price",
        label: "詢問價格",
        goal: "ask how much something costs",
        targets: ["berapa harganya", "harganya berapa", "berapa"],
      },
      {
        id: "buy",
        label: "說出你要買什麼",
        goal: "say which fruit they want to buy",
        targets: ["saya mau", "saya beli", "mau beli", "minta"],
      },
      {
        id: "thanks",
        label: "說謝謝",
        goal: "thank the seller",
        targets: ["terima kasih", "makasih"],
      },
    ],
    hints: [
      { text: "Selamat pagi, Bu!", translation: "早安，阿姨！" },
      { text: "Berapa harganya?", translation: "多少錢？" },
      { text: "Saya mau beli mangga.", translation: "我想買芒果。" },
      { text: "Terima kasih, Bu!", translation: "謝謝阿姨！" },
    ],
  },
  {
    id: "teman-baru",
    title: "認識新朋友",
    subtitle: "Berkenalan dengan teman baru",
    emoji: "👋",
    accentColor: "#E8F1FF",
    aiName: "Dimas",
    aiRole: "a cheerful 10-year-old Indonesian classmate meeting a new student",
    setting: "the school playground during break time",
    openingLine: "Halo! Aku Dimas. Kamu murid baru, ya? Siapa namamu?",
    xpReward: 15,
    objectives: [
      {
        id: "name",
        label: "介紹你的名字",
        goal: "tell Dimas their first name",
        targets: ["nama saya", "namaku", "nama aku"],
      },
      {
        id: "how-are-you",
        label: "問對方好不好",
        goal: "ask how Dimas is doing",
        targets: ["apa kabar"],
      },
      {
        id: "hobby",
        label: "說你喜歡什麼",
        goal: "say something they like",
        targets: ["saya suka", "aku suka"],
      },
      {
        id: "bye",
        label: "說再見",
        goal: "say goodbye",
        targets: ["sampai jumpa", "sampai besok", "dadah", "selamat tinggal"],
      },
    ],
    hints: [
      { text: "Nama saya Lin.", translation: "我的名字是 Lin。" },
      { text: "Apa kabar?", translation: "你好嗎？" },
      { text: "Saya suka main bola.", translation: "我喜歡踢足球。" },
      { text: "Sampai jumpa!", translation: "再見！" },
    ],
  },
  {
    id: "kantin-sekolah",
    title: "在學校餐廳點餐",
    subtitle: "Memesan makanan di kantin",
    emoji: "🍜",
    accentColor: "#E6F8EE",
    aiName: "Pak Budi",
    aiRole: "a kind food seller at an Indonesian school canteen",
    setting: "the school canteen at lunchtime, selling fried rice, noodles, iced tea and juice",
    openingLine: "Halo, Nak! Mau pesan apa hari ini?",
    xpReward: 15,
    objectives: [
      {
        id: "order-food",
        label: "點一份食物",
        goal: "order something to eat",
        targets: ["saya mau", "saya pesan", "mau pesan", "minta"],
      },
      {
        id: "order-drink",
        label: "點一杯飲料",
        goal: "order a drink",
        targets: ["es teh", "jus", "air putih", "minum"],
      },
      {
        id: "ask-total",
        label: "問總共多少錢",
        goal: "ask how much it costs in total",
        targets: ["semuanya berapa", "berapa harganya", "berapa"],
      },
      {
        id: "thanks",
        label: "說謝謝",
        goal: "thank the seller",
        targets: ["terima kasih", "makasih"],
      },
    ],
    hints: [
      { text: "Saya mau nasi goreng.", translation: "我要炒飯。" },
      { text: "Minta es teh, Pak.", translation: "請給我冰茶。" },
      { text: "Semuanya berapa?", translation: "總共多少錢？" },
      { text: "Terima kasih, Pak!", translation: "謝謝叔叔！" },
    ],
  },
];

export function getRoleplayScenario(id: string): RoleplayScenario | undefined {
  return ROLEPLAY_SCENARIOS.find((scenario) => scenario.id === id);
}
