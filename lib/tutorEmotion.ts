import type { InstructionLanguageCode } from "@/lib/instructionLanguage";

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

const EMOTION_PROMPT_RULES_EN: Record<TutorEmotionCode, string> = {
  warm:
    "Speak warmly and patiently in English only. Use gentle encouragement. Stay friendly without being overly casual.",
  calm:
    "Speak softly and at a relaxed pace in English only. Stay calm even if the student struggles. Avoid sounding rushed or loud.",
  energetic:
    "Be upbeat and lively in English only. Show enthusiasm when the student tries. Keep energy high but still stop at each question mark.",
  encouraging:
    "Focus on praise and motivation in English only. Lead with what went well before any correction. Keep corrections brief and kind.",
  strict:
    "Be clear, direct, and structured in English only. Correct mistakes promptly but respectfully. Stay professional and concise.",
};

const EMOTION_PROMPT_RULES_ZH: Record<TutorEmotionCode, string> = {
  warm: "用繁體中文（台灣）溫暖、耐心地說話，給予溫和的鼓勵，保持友善。",
  calm: "用繁體中文（台灣）輕柔、從容地說話，即使學生卡住了也保持平靜，不要急促或大聲。",
  energetic:
    "用繁體中文（台灣）活潑、有精神地說話，學生嘗試時給予熱忱，但仍要在問號處停止。",
  encouraging:
    "用繁體中文（台灣）著重稱讚與動機，先肯定再簡短糾正，語氣要溫和。",
  strict: "用繁體中文（台灣）清楚、直接、有條理地說話，及時糾正但保持尊重。",
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

function emotionRuleForLanguage(
  emotion: TutorEmotionCode,
  tutorVoice: InstructionLanguageCode,
): string {
  if (tutorVoice === "zh-TW") {
    return EMOTION_PROMPT_RULES_ZH[emotion];
  }
  return EMOTION_PROMPT_RULES_EN[emotion];
}

export function appendEmotionToPrompt(
  systemPrompt: string,
  emotion: TutorEmotionCode,
  tutorVoice: InstructionLanguageCode = "zh-TW",
): string {
  const rule = emotionRuleForLanguage(emotion, tutorVoice);
  return `${systemPrompt.trim()}\n\nEMOTION STYLE (follow in every reply, in your instruction language only): ${rule}`;
}
