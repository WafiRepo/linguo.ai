import "./index.css";
import { Composition, Folder } from "remotion";

import { FEATURES, INTRO_VIDEO_FRAMES, IntroVideo, sceneFrames } from "./IntroVideo";
import { FeatureScene } from "./scenes/FeatureScene";
import { IntroScene } from "./scenes/IntroScene";
import { OutroScene } from "./scenes/OutroScene";
import { TrustScene } from "./scenes/TrustScene";
import { VIDEO } from "./theme";

// Vertical app introduction for parents, teachers and schools.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="IntroVideo-Scenes">
        <Composition id="Intro" component={IntroScene} durationInFrames={sceneFrames("intro")} {...VIDEO} />
        {FEATURES.map((feature) => (
          <Composition
            key={feature.id}
            id={`Feature-${feature.id}`}
            component={FeatureScene}
            durationInFrames={sceneFrames(feature.id)}
            defaultProps={feature}
            {...VIDEO}
          />
        ))}
        <Composition id="Trust" component={TrustScene} durationInFrames={sceneFrames("trust")} {...VIDEO} />
        <Composition id="Outro" component={OutroScene} durationInFrames={sceneFrames("outro")} {...VIDEO} />
      </Folder>
      <Composition id="IntroVideo" component={IntroVideo} durationInFrames={INTRO_VIDEO_FRAMES} {...VIDEO} />
    </>
  );
};
