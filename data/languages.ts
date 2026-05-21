import { Language, LanguageCode } from "@/types/learning";

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "id";

export const LANGUAGES: Language[] = [
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "https://flagcdn.com/w320/id.png",
    color: "#FF3B30",
    learners: "5.2M",
  },
  // Hidden for now — uncomment to re-enable other languages
  // {
  //   code: "es",
  //   name: "Spanish",
  //   nativeName: "Español",
  //   flag: "https://flagcdn.com/w320/es.png",
  //   color: "#FF9500",
  //   learners: "28.4M",
  // },
  // {
  //   code: "fr",
  //   name: "French",
  //   nativeName: "Français",
  //   flag: "https://flagcdn.com/w320/fr.png",
  //   color: "#4D88FF",
  //   learners: "19.4M",
  // },
  // {
  //   code: "ja",
  //   name: "Japanese",
  //   nativeName: "日本語",
  //   flag: "https://flagcdn.com/w320/jp.png",
  //   color: "#FF3B30",
  //   learners: "12.7M",
  // },
  // {
  //   code: "de",
  //   name: "German",
  //   nativeName: "Deutsch",
  //   flag: "https://flagcdn.com/w320/de.png",
  //   color: "#FFCC00",
  //   learners: "8.1M",
  // },
];

export function isLanguageAvailable(code: string | null | undefined): boolean {
  return LANGUAGES.some((lang) => lang.code === code);
}
