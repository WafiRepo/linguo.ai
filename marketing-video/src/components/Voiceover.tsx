import { Audio } from "@remotion/media";
import React from "react";
import { staticFile } from "remotion";

import { SceneId } from "../voiceover";

// Each scene's narration starts shortly after the scene comes in.
export const VOICE_DELAY_FRAMES = 8;

export const Voiceover: React.FC<{ id: SceneId }> = ({ id }) => (
  <Audio from={VOICE_DELAY_FRAMES} src={staticFile(`voiceover/${id}.mp3`)} />
);
