import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { Headline } from "../components/Headline";
import { PHONE_SIZE, PhoneFrame } from "../components/PhoneFrame";
import { SoftBackground } from "../components/SoftBackground";
import { Voiceover } from "../components/Voiceover";
import { SceneId } from "../voiceover";

export type FeatureSceneProps = {
  id: SceneId;
  eyebrow: string;
  title: string;
  /** A screenshot in public/screens, or a recording in public/clips. */
  screen?: string;
  clip?: { src: string; startSeconds: number; playbackRate: number };
};

// A feature shown on the phone, with its headline above it.
export const FeatureScene: React.FC<FeatureSceneProps> = ({ id, eyebrow, title, screen, clip }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill name="Feature">
      <SoftBackground />
      <Headline eyebrow={eyebrow} title={title} />
      <PhoneFrame top={560}>
        {clip ? (
          <Video
            name="Recording"
            src={staticFile(clip.src)}
            trimBefore={clip.startSeconds * fps}
            playbackRate={clip.playbackRate}
            muted
            objectFit="cover"
            style={{ width: PHONE_SIZE.screenWidth, height: PHONE_SIZE.screenHeight }}
          />
        ) : screen ? (
          <Interactive.Div
            name="Screen"
            style={{
              width: PHONE_SIZE.screenWidth,
              height: PHONE_SIZE.screenHeight,
              // Slow push-in keeps a still screenshot alive.
              scale: interpolate(frame, [0, durationInFrames], [1, 1.05], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <CanvasImage
              src={staticFile(screen)}
              width={PHONE_SIZE.screenWidth}
              height={PHONE_SIZE.screenHeight}
              fit="cover"
            />
          </Interactive.Div>
        ) : null}
      </PhoneFrame>
      <Voiceover id={id} />
    </AbsoluteFill>
  );
};
