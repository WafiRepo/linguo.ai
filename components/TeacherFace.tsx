import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

/**
 * Bu Guru's live face: a pill with two eyes and a mouth. It blinks and looks
 * around on its own, moves its mouth with her voice and shows how she feels
 * with eyes, eyebrows, mouth and little extras (flames, blush, sweat drop…).
 */
export type TeacherMood =
  | "sleepy" // still connecting
  | "neutral"
  | "listening" // the student is talking
  | "thinking" // the student finished, Bu Guru is about to answer
  | "happy" // right answer
  | "onFire" // several right answers in a row: "Semangat!"
  | "wow" // a perfect answer (3 stars)
  | "encourage" // a correction: "almost!"
  | "comfort" // still stuck after a correction: "it's okay"
  | "celebrate"; // every dialogue done

type Eyes = "round" | "happy" | "star" | "closed";
type Brows = "none" | "raised" | "determined" | "worried";
type Mouth = "smile" | "grin" | "o" | "flat";
type Extra = "flames" | "blush" | "sweat" | "dots" | "zzz" | "sparkles";
type Motion = "none" | "hop" | "bounce" | "wiggle";

interface Look {
  eyes: Eyes;
  brows: Brows;
  mouth: Mouth;
  extras: Extra[];
  /** Head tilt in degrees. */
  tilt: number;
  /** Where the eyes look (-1..1), or "wander" to glance around. */
  gaze: [number, number] | "wander";
  motion: Motion;
}

const LOOKS: Record<TeacherMood, Look> = {
  sleepy: { eyes: "closed", brows: "none", mouth: "smile", extras: ["zzz"], tilt: 0, gaze: [0, 0.4], motion: "none" },
  neutral: { eyes: "round", brows: "none", mouth: "smile", extras: [], tilt: 0, gaze: "wander", motion: "none" },
  listening: { eyes: "round", brows: "raised", mouth: "smile", extras: [], tilt: 5, gaze: [0, 0.15], motion: "none" },
  thinking: { eyes: "round", brows: "raised", mouth: "flat", extras: ["dots"], tilt: -4, gaze: [0.7, -0.7], motion: "none" },
  happy: { eyes: "happy", brows: "none", mouth: "grin", extras: ["blush"], tilt: 0, gaze: [0, 0], motion: "hop" },
  onFire: { eyes: "round", brows: "determined", mouth: "grin", extras: ["flames"], tilt: 0, gaze: [0, 0], motion: "wiggle" },
  wow: { eyes: "star", brows: "raised", mouth: "o", extras: ["sparkles"], tilt: 0, gaze: [0, 0], motion: "hop" },
  encourage: { eyes: "round", brows: "worried", mouth: "o", extras: ["sweat"], tilt: -8, gaze: [0.3, -0.2], motion: "none" },
  comfort: { eyes: "happy", brows: "worried", mouth: "smile", extras: ["blush"], tilt: 7, gaze: [0, 0], motion: "none" },
  celebrate: { eyes: "star", brows: "raised", mouth: "grin", extras: ["blush", "sparkles"], tilt: 0, gaze: [0, 0], motion: "bounce" },
};

interface TeacherFaceProps {
  mood: TeacherMood;
  /** Bu Guru is talking right now. */
  speaking: boolean;
  /** Her voice level (0–1) from the call, when the call reports it. */
  audioLevel?: number;
  /** Height of the face in points; everything else scales with it. */
  size?: number;
}

const RED = "#FF4B3A";
const INK = "#0B1020";
const GOLD = "#FFC531";
const FLAME = "#FF6A2B";
const BLUSH = "#FF9AA8";
const SWEAT = "#7CC8FF";

const STAR = "M50 5 L61 38 L96 38 L68 59 L79 93 L50 72 L21 93 L32 59 L4 38 L39 38 Z";
const SPARKLE = "M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0 Z";
const FLAME_OUTER =
  "M30 100 C8 100 0 80 6 62 C10 50 18 46 16 30 C26 38 30 46 30 52 C34 40 40 22 34 0 C52 14 62 40 58 66 C56 86 46 100 30 100 Z";
const FLAME_INNER = "M30 100 C18 100 14 90 17 80 C20 72 26 70 26 60 C32 66 36 72 38 66 C44 76 44 92 30 100 Z";
const DROP = "M20 0 C26 14 40 26 40 38 C40 48 31 56 20 56 C9 56 0 48 0 38 C0 26 14 14 20 0 Z";

export function TeacherFace({ mood, speaking, audioLevel = 0, size = 64 }: TeacherFaceProps) {
  const look = LOOKS[mood];
  // Every measure comes from the design (a 210-high face), scaled to `size`.
  const s = size / 210;
  const faceW = 500 * s;
  const padX = 70 * s; // room for the sweat drop, dots and sparkles
  const flameH = 120 * s; // room above the face for flames
  const width = faceW + padX * 2;
  const faceLeft = padX;
  const faceTop = flameH;
  const eyeW = 62 * s;
  const eyeH = 86 * s;
  const eyeGap = 170 * s; // centre to centre
  const eyeTop = faceTop + 74 * s;
  const mouthW = 64 * s;
  const mouthH = 30 * s;
  const mouthTop = faceTop + 138 * s;
  const centerX = faceLeft + faceW / 2;
  const eyeLeft = (side: number) => centerX + (side * eyeGap) / 2 - eyeW / 2;

  const blink = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const mouthOpen = useSharedValue(0);
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const browAngle = useSharedValue(0);
  const browLift = useSharedValue(0);

  // Always breathing a little.
  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [bob]);

  // Blinks at random moments while the eyes are open and round.
  useEffect(() => {
    if (look.eyes !== "round") return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 120 }));
        next();
      }, 2200 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(timer);
  }, [look.eyes, blink]);

  // Head, eyes and eyebrows for the mood.
  useEffect(() => {
    tilt.value = withSpring(look.tilt, { damping: 9 });
    blink.value = withTiming(look.eyes === "closed" ? 0.12 : mood === "encourage" ? 0.8 : 1, { duration: 160 });
    const angle = { none: 0, raised: 0, determined: 18, worried: -16 }[look.brows];
    browAngle.value = withSpring(angle, { damping: 10 });
    browLift.value = withSpring(look.brows === "raised" ? 1 : 0, { damping: 10 });

    if (look.gaze !== "wander") {
      lookX.value = withTiming(look.gaze[0], { duration: 220 });
      lookY.value = withTiming(look.gaze[1], { duration: 220 });
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const wander = () => {
      timer = setTimeout(() => {
        lookX.value = withTiming(Math.random() * 1.6 - 0.8, { duration: 260 });
        lookY.value = withTiming(Math.random() * 0.8 - 0.4, { duration: 260 });
        wander();
      }, 1600 + Math.random() * 2400);
    };
    wander();
    return () => clearTimeout(timer);
  }, [mood, look, blink, lookX, lookY, tilt, browAngle, browLift]);

  // Whole-body motion: a hop, a bounce, or an excited wiggle.
  useEffect(() => {
    wiggle.value = look.motion === "wiggle"
      ? withRepeat(withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 90 })), -1, true)
      : withTiming(0, { duration: 120 });
    if (look.motion === "hop") {
      hop.value = withSequence(withTiming(1, { duration: 140 }), withSpring(0, { damping: 6 }));
    } else if (look.motion === "bounce") {
      hop.value = withRepeat(withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 260 })), -1);
    } else {
      hop.value = withTiming(0, { duration: 150 });
    }
  }, [look.motion, mood, hop, wiggle]);

  // The mouth follows her voice: the call's level when it has one, otherwise
  // a natural flap while she speaks.
  useEffect(() => {
    if (!speaking) {
      mouthOpen.value = withTiming(0, { duration: 120 });
      return;
    }
    if (audioLevel > 0.02) {
      mouthOpen.value = withTiming(Math.min(1, 0.25 + audioLevel * 2.2), { duration: 70 });
      return;
    }
    const timer = setInterval(() => {
      mouthOpen.value = withTiming(0.2 + Math.random() * 0.8, { duration: 90 });
    }, 120);
    return () => clearInterval(timer);
  }, [speaking, audioLevel, mouthOpen]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [0, -3 * (size / 64)]) - hop.value * 10 * (size / 64) },
      { rotate: `${tilt.value + wiggle.value * 3}deg` },
      { scale: 1 + hop.value * 0.05 },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 - hop.value * 0.05,
    transform: [{ scaleX: 1 - hop.value * 0.25 + interpolate(bob.value, [0, 1], [0, -0.04]) }],
  }));

  const roundEyeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lookX.value * 14 * s },
      { translateY: lookY.value * 12 * s },
      { scaleY: blink.value },
    ],
  }));

  // A positive angle lowers the inner ends (determined), a negative one
  // raises them (worried). Clockwise lowers the left brow's inner (right) end.
  const leftBrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -browLift.value * 10 * s }, { rotate: `${browAngle.value}deg` }],
  }));
  const rightBrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -browLift.value * 10 * s }, { rotate: `${-browAngle.value}deg` }],
  }));

  // Talking always uses the open-able smile; otherwise the mood's mouth.
  const mouth: Mouth = speaking ? "smile" : look.mouth;
  const grin = mouth === "grin";
  const smileStyle = useAnimatedStyle(() => {
    const open = mouthOpen.value;
    return {
      height: mouthH * (grin ? 1.4 : 1) + open * mouthH * 1.2,
      width: mouthW * (grin ? 1.25 : 1) * (1 - open * 0.25),
      borderTopLeftRadius: open * mouthW * 0.5,
      borderTopRightRadius: open * mouthW * 0.5,
      transform: [{ translateX: lookX.value * 6 * s }],
    };
  });

  const has = (extra: Extra) => look.extras.includes(extra);

  return (
    <View style={{ width, height: flameH + size + 50 * s }} accessibilityRole="image" accessibilityLabel="Bu Guru">
      {/* Shadow on the floor */}
      <Animated.View
        style={[
          styles.shadow,
          { left: centerX - faceW * 0.36, top: faceTop + size + 14 * s, width: faceW * 0.72, height: 26 * s },
          shadowStyle,
        ]}
      />

      <Animated.View style={[StyleSheet.absoluteFill, headStyle]}>
        {has("flames") ? <Flames left={centerX - faceW * 0.36} top={0} width={faceW * 0.72} height={flameH + 30 * s} /> : null}

        <View
          style={[
            styles.face,
            { left: faceLeft, top: faceTop, width: faceW, height: size, borderRadius: size / 2, borderWidth: 28 * s },
          ]}
        />

        {/* Eyes */}
        {[-1, 1].map((side) => (
          <View key={side} style={{ position: "absolute", left: eyeLeft(side), top: eyeTop, width: eyeW, height: eyeH }}>
            {look.eyes === "round" || look.eyes === "closed" ? (
              <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)}>
                <Animated.View
                  style={[styles.ink, { width: eyeW, height: eyeH, borderRadius: eyeW / 2 }, roundEyeStyle]}
                />
              </Animated.View>
            ) : null}
            {look.eyes === "happy" ? (
              <Animated.View
                entering={FadeIn.duration(140)}
                exiting={FadeOut.duration(100)}
                style={[
                  styles.happyEye,
                  {
                    width: eyeW * 1.15,
                    height: eyeW * 1.15,
                    borderRadius: eyeW * 0.6,
                    borderWidth: 15 * s,
                    top: eyeH * 0.18,
                    left: -eyeW * 0.075,
                  },
                ]}
              />
            ) : null}
            {look.eyes === "star" ? (
              <Animated.View
                entering={ZoomIn.springify().damping(9)}
                exiting={FadeOut.duration(100)}
                style={{ position: "absolute", left: -eyeW * 0.35, top: eyeH / 2 - eyeW * 0.85, width: eyeW * 1.7, height: eyeW * 1.7 }}
              >
                <Svg width="100%" height="100%" viewBox="0 0 100 100">
                  <Path d={STAR} fill={GOLD} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
                </Svg>
              </Animated.View>
            ) : null}
          </View>
        ))}

        {/* Eyebrows */}
        {look.brows !== "none" ? (
          <>
            {[-1, 1].map((side) => (
              <Animated.View
                key={side}
                entering={FadeIn.duration(140)}
                exiting={FadeOut.duration(100)}
                style={{
                  position: "absolute",
                  left: eyeLeft(side) - 6 * s,
                  top: eyeTop - 30 * s,
                  width: eyeW + 12 * s,
                  height: 12 * s,
                }}
              >
                <Animated.View
                  style={[
                    styles.ink,
                    { width: eyeW + 12 * s, height: 12 * s, borderRadius: 6 * s },
                    side < 0 ? leftBrowStyle : rightBrowStyle,
                  ]}
                />
              </Animated.View>
            ))}
          </>
        ) : null}

        {/* Blush */}
        {has("blush")
          ? [-1, 1].map((side) => (
              <Animated.View
                key={side}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={{
                  position: "absolute",
                  left: centerX + side * (eyeGap / 2 + 34 * s) - 27 * s,
                  top: eyeTop + eyeH - 4 * s,
                }}
              >
                <View style={[styles.blushShape, { width: 54 * s, height: 24 * s, borderRadius: 12 * s }]} />
              </Animated.View>
            ))
          : null}

        {/* Mouth */}
        {mouth === "smile" || mouth === "grin" ? (
          <Animated.View
            style={[
              styles.ink,
              {
                position: "absolute",
                top: mouthTop,
                left: centerX - (mouthW * (grin ? 1.25 : 1)) / 2,
                borderBottomLeftRadius: mouthW * 0.6,
                borderBottomRightRadius: mouthW * 0.6,
              },
              smileStyle,
            ]}
          />
        ) : null}
        {mouth === "o" ? (
          <Animated.View
            entering={ZoomIn.duration(150)}
            style={[
              styles.ink,
              { position: "absolute", top: mouthTop - 4 * s, left: centerX - 21 * s, width: 42 * s, height: 46 * s, borderRadius: 23 * s },
            ]}
          />
        ) : null}
        {mouth === "flat" ? (
          <Animated.View
            entering={FadeIn.duration(120)}
            style={[
              styles.ink,
              { position: "absolute", top: mouthTop + 8 * s, left: centerX - 24 * s, width: 48 * s, height: 11 * s, borderRadius: 6 * s },
            ]}
          />
        ) : null}

        {has("sweat") ? <SweatDrop left={faceLeft + faceW - 40 * s} top={faceTop - 18 * s} s={s} /> : null}
        {has("dots") ? <ThinkingDots left={faceLeft + faceW - 30 * s} top={faceTop - 70 * s} s={s} /> : null}
        {has("zzz") ? <Zzz left={faceLeft + faceW - 20 * s} top={faceTop - 60 * s} s={s} /> : null}
        {has("sparkles") ? (
          <>
            <Sparkle left={faceLeft - 50 * s} top={faceTop - 40 * s} size={52 * s} delay={0} />
            <Sparkle left={faceLeft + faceW - 10 * s} top={faceTop - 60 * s} size={40 * s} delay={300} />
            <Sparkle left={faceLeft + faceW + 10 * s} top={faceTop + size * 0.6} size={34 * s} delay={600} />
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

/** Flickering flames on top of the head. */
function Flames({ left, top, width, height }: { left: number; top: number; width: number; height: number }) {
  const flames = [
    { x: 0.0, h: 0.62, d: 380 },
    { x: 0.2, h: 0.85, d: 300 },
    { x: 0.4, h: 1.0, d: 340 },
    { x: 0.6, h: 0.82, d: 280 },
    { x: 0.8, h: 0.66, d: 360 },
  ];
  const flameW = width * 0.26;
  return (
    <Animated.View entering={ZoomIn.springify().damping(10)} exiting={FadeOut.duration(150)} style={{ position: "absolute", left, top, width, height }}>
      {flames.map((flame, index) => (
        <Flame
          key={index}
          left={flame.x * width - flameW * 0.1}
          width={flameW}
          height={height * flame.h}
          bottom={0}
          duration={flame.d}
        />
      ))}
    </Animated.View>
  );
}

function Flame({ left, width, height, bottom, duration }: { left: number; width: number; height: number; bottom: number; duration: number }) {
  const flicker = useSharedValue(0);
  useEffect(() => {
    flicker.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [flicker, duration]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.86 + flicker.value * 0.2 }, { scaleX: 1.04 - flicker.value * 0.08 }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left, bottom, width, height, transformOrigin: "bottom" }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none">
        <Path d={FLAME_OUTER} fill={FLAME} />
        <Path d={FLAME_INNER} fill={GOLD} />
      </Svg>
    </Animated.View>
  );
}

function SweatDrop({ left, top, s }: { left: number; top: number; s: number }) {
  const slide = useSharedValue(0);
  useEffect(() => {
    slide.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }), -1, false);
  }, [slide]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - slide.value * 0.6,
    transform: [{ translateY: slide.value * 14 * s }],
  }));
  return (
    <Animated.View entering={ZoomIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left, top }}>
      <Animated.View style={[{ width: 30 * s, height: 42 * s }, style]}>
        <Svg width="100%" height="100%" viewBox="0 0 40 56">
          <Path d={DROP} fill={SWEAT} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function ThinkingDots({ left, top, s }: { left: number; top: number; s: number }) {
  return (
    <Animated.View
      entering={ZoomIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={[styles.bubble, { left, top, paddingHorizontal: 12 * s, height: 46 * s, borderRadius: 23 * s, gap: 7 * s, borderWidth: 4 * s }]}
    >
      {[0, 1, 2].map((index) => (
        <Dot key={index} delay={index * 180} size={11 * s} />
      ))}
    </Animated.View>
  );
}

function Dot({ delay, size }: { delay: number; size: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(delay, withRepeat(withTiming(1, { duration: 420 }), -1, true));
  }, [pulse, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.value * 0.7,
    transform: [{ translateY: -pulse.value * size * 0.4 }],
  }));
  return <Animated.View style={[styles.ink, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

function Zzz({ left, top, s }: { left: number; top: number; s: number }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ position: "absolute", left, top }}>
      <FloatingZ size={34 * s} delay={0} />
      <FloatingZ size={26 * s} delay={700} />
    </Animated.View>
  );
}

function FloatingZ({ size, delay }: { size: number; delay: number }) {
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1400 }), -1, false));
  }, [rise, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(rise.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
    transform: [{ translateY: -rise.value * size }, { translateX: rise.value * size * 0.6 }],
  }));
  return (
    <Animated.Text style={[{ position: "absolute", fontSize: size, fontWeight: "800", color: "#8E86B5" }, style]}>
      z
    </Animated.Text>
  );
}

function Sparkle({ left, top, size, delay }: { left: number; top: number; size: number; delay: number }) {
  const twinkle = useSharedValue(0);
  useEffect(() => {
    twinkle.value = withDelay(delay, withRepeat(withTiming(1, { duration: 520 }), -1, true));
  }, [twinkle, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + twinkle.value * 0.6,
    transform: [{ scale: 0.6 + twinkle.value * 0.5 }, { rotate: `${twinkle.value * 30}deg` }],
  }));
  return (
    <Animated.View entering={ZoomIn.duration(200)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left, top }}>
      <Animated.View style={[{ width: size, height: size }, style]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Path d={SPARKLE} fill={GOLD} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: "absolute",
    backgroundColor: "#fff",
    borderColor: RED,
    shadowColor: RED,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ink: {
    backgroundColor: INK,
  },
  happyEye: {
    position: "absolute",
    borderColor: INK,
    borderBottomColor: "transparent",
  },
  blushShape: {
    backgroundColor: BLUSH,
    opacity: 0.7,
  },
  shadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#000",
  },
  bubble: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#E4DCFF",
  },
});
