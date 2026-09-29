import { loadFont } from "@remotion/google-fonts/Poppins";

// Same look as the app: Poppins and the Lingua purple.
export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

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
