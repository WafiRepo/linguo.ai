import { en, TranslationKey } from "@/constants/locales/en";
import { zhTW } from "@/constants/locales/zh-TW";
import { useSettingsStore } from "@/store/settingsStore";

// App UI language. Lesson material (Indonesian comics, vocabulary) is never
// translated here — only the app's own labels and messages.
export type AppLocale = "zh-TW" | "en";

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

const DICTIONARIES: Record<AppLocale, Record<TranslationKey, string>> = {
  "zh-TW": zhTW,
  en,
};

export const APP_LOCALE_OPTIONS: { code: AppLocale; emoji: string }[] = [
  { code: "zh-TW", emoji: "🇹🇼" },
  { code: "en", emoji: "🇺🇸" },
];

export function translate(locale: AppLocale, key: TranslationKey, params?: TranslateParams): string {
  const text = DICTIONARIES[locale][key] ?? en[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Current app language plus a `t()` bound to it; re-renders when it changes. */
export function useT(): { t: Translate; locale: AppLocale } {
  const locale = useSettingsStore((s) => s.appLocale);
  const t: Translate = (key, params) => translate(locale, key, params);
  return { t, locale };
}

export type { TranslationKey };
