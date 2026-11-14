import { Asset } from "expo-asset";
import { ComponentProps } from "react";
import { Image as RNImage, ImageSourcePropType } from "react-native";

// On web, React Native's Image puts the picture's own size (e.g. 1024x1024)
// in an inline style whenever `style` has no width/height. Inline styles beat
// Tailwind classes, so a `className="w-10 h-10"` logo filled the screen.
// Passing only the address (no size) lets the classes size the image.
function withoutSize(source: ImageSourcePropType | undefined): ImageSourcePropType | undefined {
  if (typeof source === "number") return { uri: Asset.fromModule(source).uri };
  if (source && !Array.isArray(source) && typeof source === "object" && "uri" in source) {
    return { uri: source.uri };
  }
  return source;
}

export function Image({ source, ...props }: ComponentProps<typeof RNImage>) {
  return <RNImage {...props} source={withoutSize(source)} />;
}
