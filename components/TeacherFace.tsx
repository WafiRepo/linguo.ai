import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * Bu Guru's live face: a pill with two eyes and a mouth. It blinks and looks
 * around on its own, moves its mouth with her voice and shows how she feels.
 */
export type TeacherMood =
  | "sleepy" // still connecting
  | "neutral"
  | "listening" // the student is talking
  | "happy" // right answer
  | "encourage" // a correction: "almost!"
  | "celebrate"; // every dialogue done

interface TeacherFaceProps {
  mood: TeacherMood;
  /** Bu Guru is talking right now. */
  speaking: boolean;
  /** Her voice level (0–1) from the call, when the call reports it. */
  audioLevel?: number;
  /** Height in points; the width follows the face's proportions. */
  size?: number;
}

const RED = "#FF4B3A";
const INK = "#0B1020";

export function TeacherFace({ mood, speaking, audioLevel = 0, size = 64 }: TeacherFaceProps) {
  // Every measure comes from the design (a 210-high face), scaled to `size`.
  const s = size / 210;
  const width = 500 * s;
  const eyeW = 62 * s;
  const eyeH = 86 * s;
  const mouthW = 62 * s;
  const mouthH = 30 * s;

  const blink = useSharedValue(1); // eye height factor
  const lookX = useSharedValue(0); // -1..1
  const lookY = useSharedValue(0);
  const mouthOpen = useSharedValue(0); // 0 = smile, 1 = wide open
  const bob = useSharedValue(0); // gentle float
  const hop = useSharedValue(0); // happy jump
  const tilt = useSharedValue(0); // degrees
  const happyEyes = useSharedValue(0); // 0 = round eyes, 1 = ^ ^ eyes

  const happy = mood === "happy" || mood === "celebrate";

  // Always breathing a little.
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [bob]);

  // Blinks at random moments (not while asleep or smiling with ^ ^ eyes).
  useEffect(() => {
    if (mood === "sleepy" || happy) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(
          withTiming(0.08, { duration: 70 }),
          withTiming(1, { duration: 120 }),
        );
        next();
      }, 2200 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(timer);
  }, [mood, happy, blink]);

  // Where the eyes look and how open they are, per mood.
  useEffect(() => {
    happyEyes.value = withTiming(happy ? 1 : 0, { duration: 160 });
    tilt.value = withSpring(mood === "encourage" ? -8 : 0, { damping: 9 });
    if (mood === "sleepy") {
      blink.value = withTiming(0.15, { duration: 300 });
      lookX.value = withTiming(0);
      lookY.value = withTiming(0.4);
      return;
    }
    blink.value = withTiming(mood === "encourage" ? 0.8 : 1, { duration: 150 });
    if (mood === "listening") {
      // Eyes on the student.
      lookX.value = withTiming(0, { duration: 200 });
      lookY.value = withTiming(0.1, { duration: 200 });
      return;
    }
    if (mood === "encourage") {
      lookX.value = withTiming(0.3, { duration: 200 });
      lookY.value = withTiming(-0.2, { duration: 200 });
      return;
    }
    // Neutral: glance around now and then.
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
  }, [mood, happy, blink, lookX, lookY, tilt, happyEyes]);

  // A hop for a right answer, bouncing for the celebration.
  useEffect(() => {
    if (mood === "happy") {
      hop.value = withSequence(withTiming(1, { duration: 140 }), withSpring(0, { damping: 6 }));
    } else if (mood === "celebrate") {
      hop.value = withRepeat(
        withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 260 })),
        -1,
      );
    } else {
      hop.value = withTiming(0, { duration: 150 });
    }
  }, [mood, hop]);

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

  const faceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [0, -3 * (size / 64)]) - hop.value * 10 * (size / 64) },
      { rotate: `${tilt.value}deg` },
      { scale: 1 + hop.value * 0.05 },
    ],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    opacity: 1 - happyEyes.value,
    transform: [
      { translateX: lookX.value * 14 * s },
      { translateY: lookY.value * 12 * s },
      { scaleY: blink.value },
    ],
  }));

  const happyEyeStyle = useAnimatedStyle(() => ({
    opacity: happyEyes.value,
    transform: [{ translateY: (1 - happyEyes.value) * 6 * s }],
  }));

  const mouthStyle = useAnimatedStyle(() => {
    const open = mouthOpen.value;
    return {
      // From a small smile to a wide, round open mouth.
      height: mouthH * (happy ? 1.35 : 1) + open * mouthH * 1.3,
      width: mouthW * (1 - open * 0.25),
      borderTopLeftRadius: open * mouthW * 0.5,
      borderTopRightRadius: open * mouthW * 0.5,
      transform: [{ translateX: lookX.value * 6 * s }],
    };
  });

  const eyeGap = 230 * s; // centre to centre
  const eyeTop = 70 * s;
  const mouthTop = 150 * s;

  return (
    <Animated.View
      style={[
        styles.face,
        { width, height: size, borderRadius: size / 2, borderWidth: 28 * s },
        faceStyle,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Bu Guru"
    >
      {[-1, 1].map((side) => (
        <View
          key={side}
          style={{
            position: "absolute",
            left: width / 2 + (side * eyeGap) / 2 - eyeW / 2 - 28 * s,
            top: eyeTop - 28 * s,
            width: eyeW,
            height: eyeH,
          }}
        >
          <Animated.View
            style={[styles.eye, { width: eyeW, height: eyeH, borderRadius: eyeW / 2 }, eyeStyle]}
          />
          {/* ^ ^ eyes when she smiles */}
          <Animated.View
            style={[
              styles.happyEye,
              {
                width: eyeW * 1.1,
                height: eyeW * 1.1,
                borderRadius: eyeW * 0.55,
                borderWidth: 14 * s,
                top: eyeH * 0.2,
                left: -eyeW * 0.05,
              },
              happyEyeStyle,
            ]}
          />
        </View>
      ))}
      <Animated.View
        style={[
          styles.mouth,
          {
            top: mouthTop - 28 * s,
            alignSelf: "center",
            borderBottomLeftRadius: mouthW / 2,
            borderBottomRightRadius: mouthW / 2,
          },
          mouthStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: "#fff",
    borderColor: RED,
    shadowColor: RED,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  eye: {
    backgroundColor: INK,
  },
  happyEye: {
    position: "absolute",
    borderColor: INK,
    borderBottomColor: "transparent",
    borderLeftColor: INK,
    borderRightColor: INK,
  },
  mouth: {
    position: "absolute",
    backgroundColor: INK,
  },
});
