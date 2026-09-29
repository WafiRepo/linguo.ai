import { loadFont as loadNotoSansTC } from "@remotion/google-fonts/NotoSansTC";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

import { Locale } from "./voiceover";

// Same look as the app: Poppins and the Lingua purple. Poppins has no
// Chinese characters, so the zh-TW video falls back to Noto Sans TC for them.
const { fontFamily: poppins } = loadPoppins("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
// CJK fonts are split into many small files, so this is many requests by design.
const { fontFamily: notoSansTC } = loadNotoSansTC("normal", {
  weights: ["500", "700"],
  ignoreTooManyRequestsWarning: true,
});

export const fontFamilyFor = (locale: Locale): string =>
  locale === "zh-TW" ? `${poppins}, ${notoSansTC}` : poppins;

export const BRAND_NAME = "Lingua";

export const colors = {
  purple: "#6c4ef5",
  purpleDark: "#4a32c9",
  lavender: "#F4F2FF",
  ink: "#001328",
  muted: "#5b6472",
  orange: "#ff8a00",
  white: "#ffffff",
};

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
};

// Screens and recordings from the phone are 1080x2246.
export const SCREEN_ASPECT = 1080 / 2246;
