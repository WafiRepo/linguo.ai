import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import React from "react";

import { VOICE_DELAY_FRAMES } from "./components/Voiceover";
import { COPY } from "./copy";
import { FeatureScene, FeatureSceneProps } from "./scenes/FeatureScene";
import { IntroScene } from "./scenes/IntroScene";
import { OutroScene } from "./scenes/OutroScene";
import { TrustScene } from "./scenes/TrustScene";
import { VIDEO } from "./theme";
import { Locale, SceneId, voiceoverSeconds } from "./voiceover";

export const TRANSITION_FRAMES = 12;
// Breathing room after each line before the next scene starts.
const TAIL_FRAMES = 14;

export const sceneFrames = (locale: Locale, id: SceneId): number =>
  VOICE_DELAY_FRAMES + Math.ceil(voiceoverSeconds(locale, id) * VIDEO.fps) + TAIL_FRAMES;

// Phone media per feature. Paths are inside public/<locale>/; each language
// has its own screenshots and recordings, trimmed to its best moment.
const FEATURE_MEDIA: Record<
  Locale,
  Pick<FeatureSceneProps, "id" | "screen" | "clip">[]
> = {
  en: [
    { id: "topics", screen: "screens/08-ai-teacher.png" },
    { id: "materials", screen: "screens/07-vocabulary-playing.png" },
    { id: "practice", clip: { src: "clips/practice-session.mp4", startSeconds: 6, playbackRate: 1.5 } },
    { id: "roleplay", clip: { src: "clips/roleplay-session.mp4", startSeconds: 19, playbackRate: 1.5 } },
    { id: "review", screen: "screens/11-session-review.png" },
    { id: "progress", screen: "screens/02-home-goal-reached.png" },
  ],
  "zh-TW": [
    { id: "topics", screen: "screens/08-ai-teacher.png" },
    { id: "materials", screen: "screens/07-vocabulary-playing.png" },
    { id: "practice", clip: { src: "clips/practice-session.mp4", startSeconds: 29, playbackRate: 1.5 } },
    { id: "roleplay", clip: { src: "clips/roleplay-session.mp4", startSeconds: 15, playbackRate: 1.5 } },
    { id: "review", screen: "screens/11-session-review.png" },
    { id: "progress", screen: "screens/02-home-goal-reached.png" },
  ],
};

export const featuresFor = (locale: Locale): FeatureSceneProps[] =>
  FEATURE_MEDIA[locale].map((media) => {
    const copy = COPY[locale].features[media.id as keyof (typeof COPY)["en"]["features"]];
    return { locale, ...media, eyebrow: copy.eyebrow, title: copy.title };
  });

const sceneOrder = (locale: Locale): SceneId[] => [
  "intro",
  ...featuresFor(locale).map((f) => f.id),
  "trust",
  "outro",
];

export const introVideoFrames = (locale: Locale): number => {
  const order = sceneOrder(locale);
  return order.reduce((sum, id) => sum + sceneFrames(locale, id), 0) - (order.length - 1) * TRANSITION_FRAMES;
};

export const IntroVideo: React.FC<{ locale: Locale }> = ({ locale }) => {
  const scenes: { id: SceneId; node: React.ReactNode; enter: "fade" | "slide" }[] = [
    { id: "intro", node: <IntroScene locale={locale} />, enter: "fade" },
    ...featuresFor(locale).map((feature) => ({
      id: feature.id,
      node: <FeatureScene {...feature} />,
      enter: "slide" as const,
    })),
    { id: "trust", node: <TrustScene locale={locale} />, enter: "fade" },
    { id: "outro", node: <OutroScene locale={locale} />, enter: "fade" },
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
          <TransitionSeries.Sequence name={scene.id} durationInFrames={sceneFrames(locale, scene.id)}>
            {scene.node}
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
