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
import { BRAND_NAME, colors, fontFamily } from "../theme";

// Closing card: logo, name and tagline.
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="Outro"
      style={{
        background: `radial-gradient(circle at 50% 40%, #8b73ff 0%, ${colors.purple} 45%, ${colors.purpleDark} 100%)`,
        alignItems: "center",
      }}
    >
      <Interactive.Div
        name="Logo"
        style={{
          position: "absolute",
          top: 560,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: interpolate(frame, [0, 0.8 * fps], [0.7, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <CanvasImage src={staticFile("brand/moscot-logo.png")} width={250} height={250} fit="contain" />
      </Interactive.Div>

      <Interactive.Div
        name="Name"
        style={{
          position: "absolute",
          top: 940,
          fontFamily,
          fontWeight: 700,
          fontSize: 132,
          color: "white",
          opacity: interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {BRAND_NAME}
      </Interactive.Div>

      <Interactive.Div
        name="Tagline"
        style={{
          position: "absolute",
          top: 1130,
          left: 90,
          right: 90,
          textAlign: "center",
          fontFamily,
          fontWeight: 500,
          fontSize: 56,
          lineHeight: 1.25,
          color: "rgba(255, 255, 255, 0.92)",
          opacity: interpolate(frame, [0.6 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Speak Indonesian with confidence
      </Interactive.Div>
      <Voiceover id="outro" />
    </AbsoluteFill>
  );
};
