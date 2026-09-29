import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { SCREEN_ASPECT } from "../theme";

const SCREEN_WIDTH = 580;
const SCREEN_HEIGHT = Math.round(SCREEN_WIDTH / SCREEN_ASPECT);
const BEZEL = 18;

export const PHONE_SIZE = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  width: SCREEN_WIDTH + BEZEL * 2,
  height: SCREEN_HEIGHT + BEZEL * 2,
};

// A simple phone mockup that rises into place. Children fill the screen.
export const PhoneFrame: React.FC<{ top: number; children: React.ReactNode }> = ({
  top,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Interactive.Div
      name="Phone"
      style={{
        position: "absolute",
        top,
        left: (1080 - PHONE_SIZE.width) / 2,
        width: PHONE_SIZE.width,
        height: PHONE_SIZE.height,
        borderRadius: 78,
        backgroundColor: "#11131a",
        padding: BEZEL,
        boxShadow: "0 40px 90px rgba(40, 20, 120, 0.28)",
        opacity: interpolate(frame, [0, 0.4 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [0, 0.9 * fps], ["0px 160px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <div
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          borderRadius: 62,
          overflow: "hidden",
          backgroundColor: "white",
          position: "relative",
        }}
      >
        {children}
      </div>
    </Interactive.Div>
  );
};
