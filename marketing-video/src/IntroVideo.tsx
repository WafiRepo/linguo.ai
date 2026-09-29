import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import React from "react";

import { VOICE_DELAY_FRAMES } from "./components/Voiceover";
import { FeatureScene, FeatureSceneProps } from "./scenes/FeatureScene";
import { IntroScene } from "./scenes/IntroScene";
import { OutroScene } from "./scenes/OutroScene";
import { TrustScene } from "./scenes/TrustScene";
import { VIDEO } from "./theme";
import { SceneId, VOICEOVER } from "./voiceover";

export const TRANSITION_FRAMES = 12;
// Breathing room after each line before the next scene starts.
const TAIL_FRAMES = 14;

export const sceneFrames = (id: SceneId): number => {
  const line = VOICEOVER.find((item) => item.id === id);
  return VOICE_DELAY_FRAMES + Math.ceil((line?.seconds ?? 3) * VIDEO.fps) + TAIL_FRAMES;
};

export const FEATURES: FeatureSceneProps[] = [
  { id: "topics", eyebrow: "AI Teacher", title: "18 classroom comic topics", screen: "screens/08-ai-teacher.png" },
  { id: "materials", eyebrow: "Learning materials", title: "Hear every word clearly", screen: "screens/07-vocabulary-playing.png" },
  {
    id: "practice",
    eyebrow: "Practice",
    title: "Listen. Repeat. Answer.",
    clip: { src: "clips/practice-session.mp4", startSeconds: 6, playbackRate: 1.5 },
  },
  {
    id: "roleplay",
    eyebrow: "Role Play",
    // Non-breaking space keeps "Bu Guru" on one line.
    title: "Talk live with Bu Guru",
    clip: { src: "clips/roleplay-session.mp4", startSeconds: 19, playbackRate: 1.5 },
  },
  { id: "review", eyebrow: "After each session", title: "Stars, praise and tips", screen: "screens/11-session-review.png" },
  { id: "progress", eyebrow: "Progress", title: "Daily goals, clear path", screen: "screens/02-home-goal-reached.png" },
];

const SCENE_ORDER: SceneId[] = ["intro", ...FEATURES.map((f) => f.id), "trust", "outro"];

export const INTRO_VIDEO_FRAMES =
  SCENE_ORDER.reduce((sum, id) => sum + sceneFrames(id), 0) - (SCENE_ORDER.length - 1) * TRANSITION_FRAMES;

export const IntroVideo: React.FC = () => {
  const scenes: { id: SceneId; node: React.ReactNode; enter: "fade" | "slide" }[] = [
    { id: "intro", node: <IntroScene />, enter: "fade" },
    ...FEATURES.map((feature) => ({
      id: feature.id,
      node: <FeatureScene {...feature} />,
      enter: "slide" as const,
    })),
    { id: "trust", node: <TrustScene />, enter: "fade" },
    { id: "outro", node: <OutroScene />, enter: "fade" },
  ];

  return (
    <TransitionSeries>
      {scenes.map((scene, index) => (
        <React.Fragment key={scene.id}>
          {index > 0 ? (
            <TransitionSeries.Transition
              presentation={scene.enter === "slide" ? slide({ direction: "from-right" }) : fade()}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />
          ) : null}
          <TransitionSeries.Sequence name={scene.id} durationInFrames={sceneFrames(scene.id)}>
            {scene.node}
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
