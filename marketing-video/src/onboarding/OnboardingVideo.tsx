import React from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { colors, fontFamilyFor } from "../theme";

// A bilingual (Traditional Chinese first, English below) onboarding video,
// 1920x1080, with original background music (scripts/make_onboarding_music.py).

export const ONBOARDING_VIDEO = { width: 1920, height: 1080, fps: 30 };

const FONT = fontFamilyFor("zh-TW");
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const RED = "#c8323d";
const AMBER_BG = "#FDE68A";
const AMBER_TEXT = "#92400E";

// Scene lengths in frames (30 fps).
const SCENES = [
  { id: "intro", frames: 150 },
  { id: "devices", frames: 180 },
  { id: "materials", frames: 210 },
  { id: "practice", frames: 240 },
  { id: "feedback", frames: 240 },
  { id: "roleplay", frames: 180 },
  { id: "report", frames: 165 },
  { id: "outro", frames: 195 },
] as const;
export const ONBOARDING_FRAMES = SCENES.reduce((sum, s) => sum + s.frames, 0);

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 from `start` over `length` frames (eased). */
const rise = (frame: number, start: number, length = 18) =>
  interpolate(frame, [start, start + length], [0, 1], { ...clampOpts, easing: EASE });

// ---------- shared pieces ----------

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #F6F3FF 0%, #FFFFFF 55%, #FFF4E8 100%)" }}>
      {[
        { x: 140, y: 120, r: 220, c: "#E9E3FF" },
        { x: 1700, y: 180, r: 260, c: "#FFE7CC" },
        { x: 1550, y: 930, r: 200, c: "#EDE8FF" },
        { x: 260, y: 900, r: 170, c: "#FFEFD9" },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x - b.r,
            top: b.y - b.r,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: "50%",
            background: b.c,
            translate: `0px ${Math.sin((frame + i * 40) / 45) * 18}px`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Big Chinese line, English below. */
const Caption: React.FC<{ zh: string; en: string; top?: number; start?: number }> = ({
  zh,
  en,
  top = 70,
  start = 4,
}) => {
  const frame = useCurrentFrame();
  const t = rise(frame, start);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
        opacity: t,
        translate: `0px ${(1 - t) * 30}px`,
      }}
    >
      <div style={{ fontSize: 76, fontWeight: 700, color: colors.ink, letterSpacing: 2 }}>{zh}</div>
      <div style={{ fontSize: 38, fontWeight: 500, color: colors.purple, marginTop: 10 }}>{en}</div>
    </div>
  );
};

/** Fades a scene in and out inside its own Sequence. */
const SceneFade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(frame, [0, 12, frames - 12, frames], [0, 1, 1, 0], clampOpts),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 32,
      boxShadow: "0 24px 60px rgba(76, 52, 180, 0.14)",
      fontFamily: FONT,
      ...style,
    }}
  >
    {children}
  </div>
);

/** A small round button with an icon-like glyph (🔊 / 🐢). */
const SoundButton: React.FC<{ glyph: string; active: boolean }> = ({ glyph, active }) => (
  <div
    style={{
      width: 84,
      height: 84,
      borderRadius: 42,
      background: active ? colors.purple : "#F2EFFF",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 40,
      scale: active ? 1.08 : 1,
      boxShadow: active ? "0 0 0 12px rgba(108,78,245,0.15)" : "none",
    }}
  >
    {glyph}
  </div>
);

/** The red "hold to talk" face from the app, with a voice wave under it. */
const TalkFace: React.FC<{ talking: boolean; size?: number }> = ({ talking, size = 220 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <div
        style={{
          width: size,
          height: size * 0.48,
          borderRadius: size * 0.24,
          border: `${size * 0.055}px solid #ff4d4f`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.16,
          boxShadow: talking ? "0 0 60px rgba(255,77,79,0.45)" : "0 0 30px rgba(255,180,67,0.35)",
        }}
      >
        {[0, 1].map((i) => (
          <div key={i} style={{ width: size * 0.07, height: size * 0.14, borderRadius: size * 0.04, background: "#121826" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", height: 70 }}>
        {Array.from({ length: 17 }).map((_, i) => {
          const h = talking ? 14 + Math.abs(Math.sin(frame / 3.5 + i * 0.9)) * 52 * (1 - Math.abs(i - 8) / 10) : 10;
          return <div key={i} style={{ width: 9, height: h, borderRadius: 5, background: talking ? "#ff4d4f" : "#d9d4f5" }} />;
        })}
      </div>
    </div>
  );
};

// ---------- scenes ----------

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = rise(frame, 6, 22);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 70 }}>
        <CanvasImage
          src={staticFile("onboarding/mascot-welcome.png")}
          style={{
            width: 520,
            height: 520,
            scale: interpolate(pop, [0, 1], [0.6, 1]),
            opacity: pop,
            rotate: `${Math.sin(frame / 10) * 3}deg`,
          }}
        />
        <div>
          <div style={{ opacity: rise(frame, 18), fontSize: 64, fontWeight: 700, color: colors.purple }}>Bicara AI</div>
          <div style={{ opacity: rise(frame, 28), fontSize: 120, fontWeight: 700, color: colors.ink, lineHeight: 1.15 }}>
            一起開心學
            <br />
            <span style={{ color: colors.purple }}>印尼語</span>
          </div>
          <div style={{ opacity: rise(frame, 40), fontSize: 46, fontWeight: 600, color: colors.muted, marginTop: 18 }}>
            Have fun learning <span style={{ color: colors.purple }}>Indonesian</span>
          </div>
          <div style={{ opacity: rise(frame, 58), fontSize: 36, color: colors.ink, marginTop: 34 }}>
            AI 老師陪孩子聽、說、練習
            <div style={{ fontSize: 28, color: colors.muted, marginTop: 6 }}>
              An AI teacher helps children listen, speak and practise
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A screen image inside a dark rounded device bezel. */
const Device: React.FC<{ src: string; left: number; top: number; width: number; height: number; bezel: number; radius: number; style?: React.CSSProperties }> = ({
  src, left, top, width, height, bezel, radius, style,
}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      padding: bezel,
      borderRadius: radius,
      background: "#1f2433",
      boxShadow: "0 30px 60px rgba(60,40,150,0.28)",
      ...style,
    }}
  >
    <CanvasImage src={staticFile(src)} style={{ width, height, borderRadius: radius - bezel, display: "block" }} />
  </div>
);

const DevicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = (start: number) => rise(frame, start, 24);
  return (
    <AbsoluteFill>
      <Caption zh="手機、平板、電腦都能用" en="On phone, tablet and computer" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, height: 700 }}>
        <Device
          src="onboarding/pc.png"
          left={520}
          top={10}
          width={860}
          height={535}
          bezel={18}
          radius={26}
          style={{ opacity: slide(10), translate: `0px ${(1 - slide(10)) * 80}px` }}
        />
        <Device
          src="onboarding/tablet.png"
          left={1340}
          top={150}
          width={340}
          height={473}
          bezel={16}
          radius={34}
          style={{ opacity: slide(26), translate: `${(1 - slide(26)) * 120}px 0px` }}
        />
        <Device
          src="onboarding/phone.png"
          left={290}
          top={150}
          width={240}
          height={494}
          bezel={12}
          radius={40}
          style={{ opacity: slide(40), translate: `${(1 - slide(40)) * -120}px 0px` }}
        />
      </div>
    </AbsoluteFill>
  );
};

const WORDS = [
  { word: "guru", syllables: "gu · ru", zh: "老師" },
  { word: "belajar", syllables: "bê · la · jar", zh: "學習" },
  { word: "terima kasih", syllables: "tê · ri · ma  ka · sih", zh: "謝謝" },
];

const MaterialsScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption zh="學單字：正常速度和慢速發音" en="Learn every word, at normal speed and slowly" />
      <div style={{ position: "absolute", top: 285, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        {WORDS.map((w, i) => {
          const t = rise(frame, 16 + i * 14, 20);
          // Which button "plays": normal then slow, word after word.
          const local = frame - (60 + i * 40);
          return (
            <Card
              key={w.word}
              style={{
                width: 1100,
                padding: "22px 44px",
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: t,
                translate: `${(1 - t) * 80}px 0px`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 50, fontWeight: 700, color: colors.ink }}>{w.word}</div>
                <div style={{ fontSize: 32, color: colors.purple, marginTop: 4 }}>{w.syllables}</div>
                <div style={{ fontSize: 30, color: colors.muted, marginTop: 4 }}>{w.zh}</div>
              </div>
              <SoundButton glyph="🐢" active={local > 20 && local < 38} />
              <SoundButton glyph="🔊" active={local > 0 && local < 18} />
            </Card>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const STEPS = [
  { zh: "聽", en: "Listen" },
  { zh: "跟讀", en: "Repeat" },
  { zh: "自己回答", en: "Answer" },
];

const PracticeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const active = frame < 80 ? 0 : frame < 150 ? 1 : 2;
  return (
    <AbsoluteFill>
      <Caption zh="看漫畫練習：聽、跟讀、自己回答" en="Practise comic dialogues: listen, repeat, answer" />
      <div style={{ position: "absolute", top: 300, left: 170, display: "flex", gap: 80, alignItems: "center" }}>
        <Card style={{ padding: 22, opacity: rise(frame, 10, 20) }}>
          <CanvasImage
            src={staticFile(active === 0 ? "onboarding/comic-panel-1.png" : "onboarding/comic-panel-2.png")}
            style={{ width: 760, height: 448, borderRadius: 20 }}
          />
          <div style={{ display: "flex", gap: 16, marginTop: 22 }}>
            {STEPS.map((s, i) => (
              <div
                key={s.zh}
                style={{
                  padding: "12px 26px",
                  borderRadius: 40,
                  background: i === active ? colors.purple : "#F2EFFF",
                  color: i === active ? "#fff" : colors.muted,
                  fontSize: 30,
                  fontWeight: 600,
                }}
              >
                {s.zh} · {s.en}
              </div>
            ))}
          </div>
        </Card>
        <div style={{ opacity: rise(frame, 30, 20), display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <TalkFace talking={active > 0 && Math.floor(frame / 30) % 2 === 0} />
          <div style={{ fontSize: 36, fontWeight: 700, color: colors.ink, fontFamily: FONT }}>按住老師說話</div>
          <div style={{ fontSize: 28, color: colors.muted, fontFamily: FONT }}>Hold the teacher to talk</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FeedbackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const hop = Math.max(0, Math.sin(((frame - 70) / 22) * Math.PI)) * (frame > 70 ? 1 : 0);
  return (
    <AbsoluteFill>
      <Caption zh="AI 聽你的發音，指出要改的音" en="The AI listens and shows which sound to fix" />
      <div style={{ position: "absolute", top: 320, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 70, alignItems: "center" }}>
        <Card
          style={{
            width: 980,
            padding: "40px 50px",
            background: "#FFFBEB",
            border: "3px solid #FDE68A",
            opacity: rise(frame, 12, 20),
            translate: `0px ${(1 - rise(frame, 12, 20)) * 60}px`,
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 700, color: colors.ink }}>再試一次 · Try again</div>
          <div style={{ fontSize: 34, color: colors.muted, marginTop: 18 }}>
            你說 You said： <span style={{ color: colors.ink }}>Baik, Bu Gulu</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#B45309", marginTop: 14, opacity: rise(frame, 45) }}>
            🔊 Guru：r 唸成 l 了
          </div>
          <div style={{ fontSize: 30, color: colors.muted, marginTop: 24 }}>正確說法 Correct line</div>
          <div style={{ fontSize: 58, fontWeight: 700, color: colors.ink, marginTop: 6, display: "flex", gap: 18 }}>
            <span>Baik, Bu</span>
            <span
              style={{
                background: AMBER_BG,
                color: AMBER_TEXT,
                borderRadius: 12,
                padding: "0 14px",
                translate: `0px ${-hop * 14}px`,
                scale: 1 + hop * 0.08,
              }}
            >
              Guru.
            </span>
          </div>
          <div style={{ fontSize: 30, color: colors.muted, marginTop: 8 }}>好的，老師。</div>
        </Card>
        <div style={{ opacity: rise(frame, 90, 20), width: 420, fontFamily: FONT }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: colors.ink, lineHeight: 1.4 }}>
            老師示範正常速度和慢速，再說一次
          </div>
          <div style={{ fontSize: 26, color: colors.muted, marginTop: 10, lineHeight: 1.4 }}>
            The teacher says it normally and slowly, then you try again
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Bubble: React.FC<{ who: string; text: string; zh: string; right?: boolean; start: number }> = ({
  who,
  text,
  zh,
  right,
  start,
}) => {
  const frame = useCurrentFrame();
  const t = rise(frame, start, 18);
  return (
    <div style={{ display: "flex", justifyContent: right ? "flex-end" : "flex-start", opacity: t, scale: interpolate(t, [0, 1], [0.9, 1]) }}>
      <Card
        style={{
          maxWidth: 900,
          padding: "26px 40px",
          background: right ? colors.purple : "#fff",
          borderRadius: right ? "36px 36px 8px 36px" : "36px 36px 36px 8px",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, color: right ? "#E4DDFF" : colors.purple }}>{who}</div>
        <div style={{ fontSize: 50, fontWeight: 700, color: right ? "#fff" : colors.ink }}>{text}</div>
        <div style={{ fontSize: 28, color: right ? "#E4DDFF" : colors.muted }}>{zh}</div>
      </Card>
    </div>
  );
};

const RoleplayScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption zh="角色扮演：和老師用印尼語對話" en="Role play: talk with the teacher in Indonesian" />
      <div style={{ position: "absolute", top: 320, left: 260, right: 260, display: "flex", flexDirection: "column", gap: 34 }}>
        <Bubble who="Bu Guru 老師" text="Selamat pagi, anak-anak." zh="大家早安。" start={14} />
        <Bubble who="Siswa 學生" text="Selamat pagi, Bu Guru!" zh="老師早安！" right start={60} />
        <div style={{ textAlign: "center", fontSize: 64, fontWeight: 700, color: colors.ink, fontFamily: FONT, opacity: rise(frame, 100, 14), scale: interpolate(rise(frame, 100, 14), [0, 1], [0.5, 1]) }}>
          ⭐ 很好！ Great!
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ReportScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption zh="學習報告：知道下一步練什麼" en="A report shows what to practise next" />
      <div style={{ position: "absolute", top: 320, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 50 }}>
        <Card style={{ width: 520, padding: 40, opacity: rise(frame, 10, 18) }}>
          {[
            ["對話 1 · Dialogue 1", "★★★"],
            ["對話 2 · Dialogue 2", "★★☆"],
            ["對話 3 · Dialogue 3", "★★★"],
          ].map(([label, stars], i) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 34, padding: "14px 0", opacity: rise(frame, 18 + i * 10) }}>
              <span style={{ color: colors.ink }}>{label}</span>
              <span style={{ color: "#E0A100" }}>{stars}</span>
            </div>
          ))}
        </Card>
        <Card style={{ width: 640, padding: 40, opacity: rise(frame, 40, 18) }}>
          <div style={{ fontSize: 30, color: colors.muted }}>你說 You said</div>
          <div style={{ fontSize: 40, color: colors.ink }}>Saya masih inggat</div>
          <div style={{ fontSize: 30, color: colors.muted, marginTop: 14 }}>更好的說法 Better</div>
          <div style={{ fontSize: 44, fontWeight: 700, color: colors.ink }}>
            Saya masih <span style={{ background: AMBER_BG, color: AMBER_TEXT, borderRadius: 10, padding: "0 10px" }}>ingat</span>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 22, alignItems: "center" }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: colors.purple }}>ingat</span>
            <SoundButton glyph="🔊" active={frame > 80 && frame < 100} />
            <SoundButton glyph="🐢" active={frame > 105 && frame < 125} />
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 110, alignItems: "center" }}>
        <div style={{ opacity: rise(frame, 6, 20) }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: colors.ink }}>立即試用</div>
          <div style={{ fontSize: 44, fontWeight: 600, color: colors.purple, marginTop: 8 }}>Try it now</div>
          <div style={{ fontSize: 52, fontWeight: 700, color: RED, marginTop: 40 }}>ai-berbicara.expo.app</div>
          <div style={{ fontSize: 30, color: colors.muted, marginTop: 16 }}>掃描 QR code · Scan the QR code</div>
        </div>
        <Card style={{ padding: 30, opacity: rise(frame, 18, 20), scale: interpolate(rise(frame, 18, 20), [0, 1], [0.8, 1]) }}>
          <CanvasImage src={staticFile("onboarding/qr.png")} style={{ width: 400, height: 400 }} />
        </Card>
        <CanvasImage
          src={staticFile("onboarding/mascot-auth.png")}
          style={{ width: 320, height: 320, opacity: rise(frame, 30, 20), rotate: `${Math.sin(frame / 9) * 4}deg` }}
        />
      </div>
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 60, opacity: rise(frame, 50, 20) }}>
        <div style={{ fontSize: 28, color: colors.muted }}>合作單位 Partners</div>
        <CanvasImage src={staticFile("onboarding/hlag.jpg")} style={{ width: 300, height: 132 }} />
        <CanvasImage src={staticFile("onboarding/asean.png")} style={{ width: 460, height: 95 }} />
      </div>
    </AbsoluteFill>
  );
};

const SCENE_COMPONENTS: Record<(typeof SCENES)[number]["id"], React.FC> = {
  intro: IntroScene,
  devices: DevicesScene,
  materials: MaterialsScene,
  practice: PracticeScene,
  feedback: FeedbackScene,
  roleplay: RoleplayScene,
  report: ReportScene,
  outro: OutroScene,
};

export const OnboardingVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  let start = 0;
  return (
    <AbsoluteFill>
      <Background />
      {SCENES.map((scene) => {
        const Component = SCENE_COMPONENTS[scene.id];
        const from = start;
        start += scene.frames;
        return (
          <Sequence key={scene.id} name={scene.id} from={from} durationInFrames={scene.frames}>
            <SceneFade frames={scene.frames}>
              <Component />
            </SceneFade>
          </Sequence>
        );
      })}
      <Audio
        src={staticFile("onboarding/music.mp3")}
        volume={(f) => interpolate(f, [0, fps, ONBOARDING_FRAMES - 2 * fps, ONBOARDING_FRAMES], [0, 0.7, 0.7, 0], clampOpts)}
      />
    </AbsoluteFill>
  );
};
