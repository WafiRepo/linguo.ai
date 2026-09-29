import "./index.css";
import { Composition, Folder } from "remotion";

import { featuresFor, introVideoFrames, IntroVideo, sceneFrames } from "./IntroVideo";
import { FeatureScene } from "./scenes/FeatureScene";
import { IntroScene } from "./scenes/IntroScene";
import { OutroScene } from "./scenes/OutroScene";
import { TrustScene } from "./scenes/TrustScene";
import { VIDEO } from "./theme";
import { Locale } from "./voiceover";

const LOCALES: { locale: Locale; suffix: string }[] = [
  { locale: "en", suffix: "" },
  { locale: "zh-TW", suffix: "-zhTW" },
];

// Vertical app introduction for parents, teachers and schools, in English
// (IntroVideo) and Traditional Chinese (IntroVideo-zhTW).
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {LOCALES.map(({ locale, suffix }) => (
        <Folder key={locale} name={`IntroVideo${suffix}-Scenes`}>
          <Composition
            id={`Intro${suffix}`}
            component={IntroScene}
            durationInFrames={sceneFrames(locale, "intro")}
            defaultProps={{ locale }}
            {...VIDEO}
          />
          {featuresFor(locale).map((feature) => (
            <Composition
              key={feature.id}
              id={`Feature-${feature.id}${suffix}`}
              component={FeatureScene}
              durationInFrames={sceneFrames(locale, feature.id)}
              defaultProps={feature}
              {...VIDEO}
            />
          ))}
          <Composition
            id={`Trust${suffix}`}
            component={TrustScene}
            durationInFrames={sceneFrames(locale, "trust")}
            defaultProps={{ locale }}
            {...VIDEO}
          />
          <Composition
            id={`Outro${suffix}`}
            component={OutroScene}
            durationInFrames={sceneFrames(locale, "outro")}
            defaultProps={{ locale }}
            {...VIDEO}
          />
        </Folder>
      ))}
      {LOCALES.map(({ locale, suffix }) => (
        <Composition
          key={locale}
          id={`IntroVideo${suffix}`}
          component={IntroVideo}
          durationInFrames={introVideoFrames(locale)}
          defaultProps={{ locale }}
          {...VIDEO}
        />
      ))}
    </>
  );
};
