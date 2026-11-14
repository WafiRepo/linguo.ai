import { useWindowDimensions } from "react-native";

// On iPads and in desktop browsers the app sits in a centred column instead
// of stretching across the whole screen. Phones are narrower, so nothing
// changes there.
export const MAX_CONTENT_WIDTH = 720;

/** The width the app's screens really have (the column, not the window). */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH);
}
