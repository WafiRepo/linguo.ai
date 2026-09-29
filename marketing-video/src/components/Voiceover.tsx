import { Audio } from "@remotion/media";
import React from "react";
import { staticFile } from "remotion";

import { Locale, SceneId } from "../voiceover";

// Each scene's narration starts shortly after the scene comes in.
export const VOICE_DELAY_FRAMES = 8;

export const Voiceover: React.FC<{ locale: Locale; id: SceneId }> = ({ locale, id }) => (
  <Audio from={VOICE_DELAY_FRAMES} src={staticFile(`voiceover/${locale}/${id}.mp3`)} />
);
