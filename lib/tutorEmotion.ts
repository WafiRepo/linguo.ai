export type TutorEmotionCode =
  | "warm"
  | "calm"
  | "energetic"
  | "encouraging"
  | "strict";

export interface TutorEmotionOption {
  code: TutorEmotionCode;
  name: string;
  description: string;
  emoji: string;
}

export const DEFAULT_TUTOR_EMOTION: TutorEmotionCode = "warm";

export const TUTOR_EMOTION_OPTIONS: TutorEmotionOption[] = [
  {
    code: "warm",
    name: "Ramah",
    description: "Hangat dan sabar, seperti guru privat",
    emoji: "😊",
  },
  {
    code: "calm",
    name: "Tenang",
    description: "Suara lembut, tempo pelan",
    emoji: "🧘",
  },
  {
    code: "energetic",
    name: "Antusias",
    description: "Energik dan ceria, suka merayakan progress",
    emoji: "⚡",
  },
  {
    code: "encouraging",
    name: "Motivator",
    description: "Banyak pujian, koreksi lembut",
    emoji: "💪",
  },
  {
    code: "strict",
    name: "Tegas",
    description: "Langsung dan jelas, fokus akurasi",
    emoji: "📚",
  },
];

const EMOTION_PROMPT_RULES: Record<TutorEmotionCode, string> = {
  warm:
    "Speak warmly and patiently. Use gentle encouragement. Stay friendly without being overly casual.",
  calm:
    "Speak softly and at a relaxed pace. Stay calm even if the student struggles. Avoid sounding rushed or loud.",
  energetic:
    "Be upbeat and lively. Show enthusiasm when the student tries. Keep energy high but still stop at each question mark.",
  encouraging:
    "Focus on praise and motivation. Lead with what went well before any correction. Keep corrections brief and kind.",
  strict:
    "Be clear, direct, and structured. Correct mistakes promptly but respectfully. Stay professional and concise.",
};

/** OpenAI Realtime voice names — applied server-side in vision-agent. */
export const TUTOR_EMOTION_OPENAI_VOICE: Record<TutorEmotionCode, string> = {
  warm: "coral",
  calm: "sage",
  energetic: "shimmer",
  encouraging: "coral",
  strict: "ash",
};

export function isTutorEmotionCode(value: string | null | undefined): value is TutorEmotionCode {
  return TUTOR_EMOTION_OPTIONS.some((option) => option.code === value);
}

export function appendEmotionToPrompt(
  systemPrompt: string,
  emotion: TutorEmotionCode,
): string {
  const rule = EMOTION_PROMPT_RULES[emotion];
  return `${systemPrompt.trim()}\n\nEMOTION STYLE (follow in every reply): ${rule}`;
}
