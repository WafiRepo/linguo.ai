import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { Voiceover } from "../components/Voiceover";
import { COPY } from "../copy";
import { Locale } from "../voiceover";
import { BRAND_NAME, colors, fontFamilyFor } from "../theme";

// Opening: brand, promise and the fox mascot on Lingua purple.
export const IntroScene: React.FC<{ locale: Locale }> = ({ locale }) => {
  const frame = useCurrentFrame();
  const fontFamily = fontFamilyFor(locale);
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="Intro"
      style={{
        background: `radial-gradient(circle at 50% 70%, #8b73ff 0%, ${colors.purple} 45%, ${colors.purpleDark} 100%)`,
      }}
    >
      <Interactive.Div
        name="Logo"
        style={{
          position: "absolute",
          top: 190,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CanvasImage src={staticFile("brand/moscot-logo.png")} width={96} height={96} fit="contain" />
        </div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 96, color: "white" }}>{BRAND_NAME}</div>
      </Interactive.Div>

      <Interactive.Div
        name="Promise"
        style={{
          position: "absolute",
          top: 400,
          left: 90,
          right: 90,
          textAlign: "center",
          fontFamily,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.1,
          whiteSpace: "pre-line",
          color: "white",
          opacity: interpolate(frame, [0.3 * fps, 0.9 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.3 * fps, 1.1 * fps], ["0px 50px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {COPY[locale].promise}
      </Interactive.Div>

      <Interactive.Div
        name="Mascot"
        style={{
          position: "absolute",
          top: 820,
          left: 140,
          width: 800,
          height: 900,
          scale: interpolate(frame, [0.5 * fps, 1.4 * fps], [0.6, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
          opacity: interpolate(frame, [0.5 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <CanvasImage src={staticFile("brand/mascot-welcome.png")} width={800} height={900} fit="contain" />
      </Interactive.Div>
      <Voiceover locale={locale} id="intro" />
    </AbsoluteFill>
  );
};
