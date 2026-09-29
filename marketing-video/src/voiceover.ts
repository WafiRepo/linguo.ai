import { VOICEOVER_EN } from "./voiceover-en";
import { VOICEOVER_ZH_TW } from "./voiceover-zh-TW";

// The video is rendered once per language.
export type Locale = "en" | "zh-TW";

export const VOICEOVER = {
  en: VOICEOVER_EN,
  "zh-TW": VOICEOVER_ZH_TW,
};

export type SceneId = (typeof VOICEOVER_EN)[number]["id"];

export const voiceoverSeconds = (locale: Locale, id: SceneId): number =>
  VOICEOVER[locale].find((line) => line.id === id)?.seconds ?? 3;
