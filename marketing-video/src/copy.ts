import { Locale, SceneId } from "./voiceover";

type FeatureCopy = { eyebrow: string; title: string };
type FeatureSceneId = Exclude<SceneId, "intro" | "trust" | "outro">;

// On-screen text for each language. Narration lives in scripts/generate_voiceover.py.
export const COPY: Record<
  Locale,
  {
    promise: string;
    features: Record<FeatureSceneId, FeatureCopy>;
    trust: { eyebrow: string; title: string; points: string[] };
    tagline: string;
  }
> = {
  en: {
    promise: "Learn Indonesian with an AI teacher",
    features: {
      topics: { eyebrow: "AI Teacher", title: "18 classroom comic topics" },
      materials: { eyebrow: "Learning materials", title: "Hear every word clearly" },
      practice: { eyebrow: "Practice", title: "Listen. Repeat. Answer." },
      // Non-breaking space keeps "Bu Guru" on one line.
      roleplay: { eyebrow: "Role Play", title: "Talk live with Bu\u00a0Guru" },
      review: { eyebrow: "After each session", title: "Stars, praise and tips" },
      progress: { eyebrow: "Progress", title: "Daily goals, clear path" },
    },
    trust: {
      eyebrow: "For families and schools",
      title: "Simple, safe and bilingual",
      points: [
        "In English or Traditional Chinese",
        "Only a nickname and grade",
        "No photos, addresses or real names",
      ],
    },
    tagline: "Speak Indonesian with confidence",
  },
  "zh-TW": {
    // The line break keeps a single character from sitting alone on a line.
    promise: "和 AI 老師一起\n學印尼語",
    features: {
      topics: { eyebrow: "AI 老師", title: "18 個課堂漫畫主題" },
      materials: { eyebrow: "學習教材", title: "每個單字都聽得清楚" },
      practice: { eyebrow: "練習", title: "聽、跟著說、回答" },
      roleplay: { eyebrow: "角色扮演", title: "和 Bu\u00a0Guru 即時對話" },
      review: { eyebrow: "每次練習後", title: "星星、鼓勵與建議" },
      progress: { eyebrow: "學習進度", title: "每日目標，進度清楚" },
    },
    trust: {
      eyebrow: "給家長與學校",
      title: "簡單、安全、雙語",
      points: ["支援繁體中文與英文", "只需要暱稱和年級", "不需要照片、地址或真實姓名"],
    },
    tagline: "讓孩子自信說印尼語",
  },
};
