import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { AppLocale } from "@/lib/i18n";

// Small round flag for the app-language button. Drawn as SVG because Windows
// browsers can't show flag emoji (they show the letters "US" / "TW").
export function LocaleFlag({ locale, size = 24 }: { locale: AppLocale; size?: number }) {
  const clipId = `flag-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx="12" cy="12" r="12" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>{locale === "en" ? <UsFlag /> : <TaiwanFlag />}</G>
      </Svg>
    </View>
  );
}

function UsFlag() {
  const stripes = Array.from({ length: 7 }, (_, index) => (
    <Rect key={index} x="0" y={index * 3.7} width="24" height="1.85" fill="#B22234" />
  ));
  return (
    <>
      <Rect x="0" y="0" width="24" height="24" fill="#fff" />
      {stripes}
      <Rect x="0" y="0" width="11" height="12.9" fill="#3C3B6E" />
      {[2.2, 5.5, 8.8].map((x) =>
        [2.4, 6.4, 10.4].map((y) => <Circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="#fff" />),
      )}
    </>
  );
}

function TaiwanFlag() {
  // Red field, blue canton with the white sun (simplified to a star-like sun).
  const rays = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI) / 6;
    const x = 6 + Math.cos(angle) * 4.4;
    const y = 6 + Math.sin(angle) * 4.4;
    const left = 6 + Math.cos(angle + 0.26) * 2.6;
    const leftY = 6 + Math.sin(angle + 0.26) * 2.6;
    const right = 6 + Math.cos(angle - 0.26) * 2.6;
    const rightY = 6 + Math.sin(angle - 0.26) * 2.6;
    return <Path key={index} d={`M${x} ${y} L${left} ${leftY} L${right} ${rightY} Z`} fill="#fff" />;
  });
  return (
    <>
      <Rect x="0" y="0" width="24" height="24" fill="#FE0000" />
      <Rect x="0" y="0" width="12" height="12" fill="#000095" />
      {rays}
      <Circle cx="6" cy="6" r="2.4" fill="#000095" />
      <Circle cx="6" cy="6" r="2" fill="#fff" />
    </>
  );
}
