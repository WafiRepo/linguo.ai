import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { colors } from "../theme";

// Small label + big headline at the top of a feature scene.
export const Headline: React.FC<{ eyebrow: string; title: string; fontFamily: string }> = ({
  eyebrow,
  title,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Interactive.Div
        name="Eyebrow"
        style={{
          position: "absolute",
          top: 150,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: colors.purple,
          opacity: interpolate(frame, [0.1 * fps, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {eyebrow}
      </Interactive.Div>
      <Interactive.Div
        name="Title"
        style={{
          position: "absolute",
          top: 210,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily,
          fontWeight: 700,
          fontSize: 84,
          lineHeight: 1.12,
          color: colors.ink,
          opacity: interpolate(frame, [0.2 * fps, 0.7 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.2 * fps, 0.9 * fps], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {title}
      </Interactive.Div>
    </>
  );
};
