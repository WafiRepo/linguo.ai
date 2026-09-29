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

import { Headline } from "../components/Headline";
import { SoftBackground } from "../components/SoftBackground";
import { Voiceover } from "../components/Voiceover";
import { colors, fontFamily } from "../theme";

const POINTS = [
  "In English or Traditional Chinese",
  "Only a nickname and grade",
  "No photos, addresses or real names",
];

// What parents and schools want to know: language and privacy.
export const TrustScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill name="Trust">
      <SoftBackground />
      <Headline eyebrow="For families and schools" title="Simple, safe and bilingual" />

      {POINTS.map((point, index) => (
        <Interactive.Div
          key={point}
          name={`Point ${index + 1}`}
          style={{
            position: "absolute",
            top: 560 + index * 190,
            left: 90,
            right: 90,
            height: 150,
            borderRadius: 40,
            backgroundColor: "white",
            boxShadow: "0 18px 40px rgba(40, 20, 120, 0.10)",
            display: "flex",
            alignItems: "center",
            gap: 32,
            paddingLeft: 40,
            paddingRight: 40,
            fontFamily,
            fontWeight: 600,
            fontSize: 46,
            color: colors.ink,
            opacity: interpolate(frame, [(0.6 + index * 0.35) * fps, (0.9 + index * 0.35) * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(
              frame,
              [(0.6 + index * 0.35) * fps, (1.2 + index * 0.35) * fps],
              ["60px 0px", "0px 0px"],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
            ),
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.purple,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          {point}
        </Interactive.Div>
      ))}

      <Interactive.Div
        name="Mascot"
        style={{
          position: "absolute",
          top: 1180,
          left: 290,
          width: 500,
          height: 560,
          opacity: interpolate(frame, [1.6 * fps, 2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <CanvasImage src={staticFile("brand/mascot-auth.png")} width={500} height={560} fit="contain" />
      </Interactive.Div>
      <Voiceover id="trust" />
    </AbsoluteFill>
  );
};
