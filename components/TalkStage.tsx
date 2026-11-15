import { useEffect, useId, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { StarBurst } from "@/components/StarBurst";
import { TeacherFace, TeacherMood } from "@/components/TeacherFace";
import { playSfx } from "@/lib/sfx";

// Role Play: hold Bu Guru's face to talk, let go and she answers.
// A coloured glow behind her shows who is talking (red: the student,
// warm orange: Bu Guru), voice bars show the student's voice, and the last
// lines of the conversation sit underneath in small text.

interface TalkLine {
  speaker: "agent" | "user";
  text: string;
}

interface TalkStageProps {
  mood: TeacherMood;
  teacherSpeaking: boolean;
  teacherLevel: number;
  studentLevel: number;
  holding: boolean;
  canTalk: boolean;
  /** Empty once the conversation is over: no voice bars or hint then. */
  status: string;
  lines: TalkLine[];
  teacherName: string;
  youLabel: string;
  onPressIn: () => void;
  onPressOut: () => void;
  /** What Bu Guru is saying right now (her mouth follows the vowels). */
  teacherText?: string;
  /** Change it (e.g. +1) to throw a burst of stars: a right answer. */
  starBurst?: number;
  /** Three quick taps on the face: she giggles. */
  onTickle?: () => void;
}

// The face shrinks when a correction card leaves less room (never overlapping
// the transcript or the button below).
const MAX_FACE = 78;
const MIN_FACE = 36;
// TeacherFace is about 1.8x its size tall (room for flames and the shadow).
const FACE_BOX = 380 / 210;
const BAR_COUNT = 9;

export function TalkStage({
  mood,
  teacherSpeaking,
  teacherLevel,
  studentLevel,
  holding,
  canTalk,
  status,
  lines,
  teacherName,
  youLabel,
  onPressIn,
  onPressOut,
  starBurst = 0,
  onTickle,
  teacherText = "",
}: TalkStageProps) {
  const [stageHeight, setStageHeight] = useState(190);

  // Touching the face: a jelly wobble and a "pop", always (also while she
  // talks, it's fun). Three quick taps tickle her.
  const squish = useSharedValue(0);
  const pressStartRef = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const squishStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + squish.value * 0.14 }, { scaleY: 1 - squish.value * 0.14 }],
  }));
  function handlePressIn() {
    pressStartRef.current = Date.now();
    squish.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 4, stiffness: 260 }));
    playSfx("pop", 0.5);
    if (canTalk) onPressIn();
  }
  function handlePressOut() {
    if (canTalk) onPressOut();
    const now = Date.now();
    if (now - pressStartRef.current > TAP_MS) return; // a hold to talk, not a tap
    tapsRef.current = [...tapsRef.current.filter((at) => now - at < TICKLE_WINDOW_MS), now];
    if (tapsRef.current.length >= TICKLE_TAPS) {
      tapsRef.current = [];
      playSfx("boing", 0.6);
      onTickle?.();
    }
  }

  // Web: a long press starts a text selection (or the touch menu), which
  // cancels the press and lets go of the microphone mid-sentence.
  useEffect(() => {
    if (Platform.OS !== "web" || !holding) return;
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("selectstart", block);
    document.addEventListener("contextmenu", block);
    window.getSelection()?.removeAllRanges();
    return () => {
      document.removeEventListener("selectstart", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [holding]);
  const faceSize = Math.max(MIN_FACE, Math.min(MAX_FACE, (stageHeight - 8) / FACE_BOX));
  const glowSize = Math.min(300, stageHeight * 1.5);
  const studentGlow = useSharedValue(0);
  const teacherGlow = useSharedValue(0.15);

  useEffect(() => {
    studentGlow.value = withTiming(holding ? 0.6 + Math.min(studentLevel, 1) * 0.4 : 0, { duration: 140 });
  }, [holding, studentLevel, studentGlow]);
  useEffect(() => {
    teacherGlow.value = withTiming(
      teacherSpeaking ? 0.45 + Math.min(teacherLevel, 1) * 0.5 : holding ? 0 : 0.15,
      { duration: 160 },
    );
  }, [teacherSpeaking, teacherLevel, holding, teacherGlow]);

  const studentGlowStyle = useAnimatedStyle(() => ({
    opacity: studentGlow.value,
    transform: [{ scale: 0.85 + studentGlow.value * 0.25 }],
  }));
  const teacherGlowStyle = useAnimatedStyle(() => ({
    opacity: teacherGlow.value,
    transform: [{ scale: 0.85 + teacherGlow.value * 0.2 }],
  }));

  return (
    <View className="flex-1 items-center" style={NO_SELECT}>
      <View
        style={styles.stage}
        onLayout={(event) => setStageHeight(Math.round(event.nativeEvent.layout.height))}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { width: glowSize, height: glowSize }, teacherGlowStyle]}
        >
          <Glow id="teacher-glow" color="#FFB443" size={glowSize} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { width: glowSize, height: glowSize }, studentGlowStyle]}
        >
          <Glow id="student-glow" color="#FF3B5C" size={glowSize} />
        </Animated.View>
        <StarBurst trigger={starBurst} distance={Math.min(140, stageHeight * 0.8)} />
        <Pressable
          // Never disabled: the face reacts to every touch; talking only
          // starts when canTalk.
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityState={{ disabled: !canTalk }}
          // A finger that drifts a little while talking must not let go.
          pressRetentionOffset={HOLD_SLOP}
          delayLongPress={60000}
          accessibilityRole="button"
          accessibilityLabel={status}
          testID="roleplay-hold-to-talk"
          style={({ pressed }) => [styles.facePress, pressed && canTalk && styles.facePressed]}
        >
          <Animated.View style={squishStyle}>
            <TeacherFace
              mood={mood}
              speaking={teacherSpeaking}
              audioLevel={teacherLevel}
              speechText={teacherText}
              size={faceSize}
              name={teacherName}
            />
          </Animated.View>
        </Pressable>
      </View>

      {status ? (
        <>
          <VoiceBars active={holding} level={studentLevel} />
          <Text className="mt-1 font-poppins-medium text-[13px] text-text-secondary text-center px-6">{status}</Text>
        </>
      ) : null}

      <View className="mt-2 px-8 w-full items-center min-h-[40px]">
        {lines.map((line, index) => (
          <Text
            key={`${index}-${line.text}`}
            className={`text-center font-poppins text-xs leading-[18px] ${
              line.speaker === "agent" ? "text-text-primary" : "text-text-secondary"
            }`}
            numberOfLines={2}
          >
            <Text className={line.speaker === "agent" ? "font-poppins-semibold text-lingua-purple" : "font-poppins-semibold"}>
              {line.speaker === "agent" ? teacherName : youLabel}:{" "}
            </Text>
            {line.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** A soft round glow that fades out to transparent at its edge. */
function Glow({ id, color, size }: { id: string; color: string; size: number }) {
  // Unique per instance: SVG ids are page-wide on web.
  const gradientId = `${id}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.75} />
          <Stop offset="45%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

/** The student's voice while they hold the face: bars that follow its loudness. */
function VoiceBars({ active, level }: { active: boolean; level: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setTick((value) => value + 1), 110);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <View style={styles.bars}>
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        // Taller in the middle; a little random so it feels alive.
        const centre = 1 - Math.abs(index - (BAR_COUNT - 1) / 2) / BAR_COUNT;
        const loud = Math.min(1, level * 2.5);
        const height = active ? 4 + (6 + loud * 18) * centre * (0.6 + Math.random() * 0.4) : 4;
        return (
          <View
            key={index}
            style={[styles.bar, { height, backgroundColor: active ? "#FF3B5C" : "#E5E1F5" }]}
          />
        );
      })}
    </View>
  );
}

// A press shorter than this is a tap; three taps this close together tickle.
const TAP_MS = 300;
const TICKLE_TAPS = 3;
const TICKLE_WINDOW_MS = 1500;

const HOLD_SLOP = { top: 400, bottom: 400, left: 400, right: 400 };

// Web only: no text selection, touch menu or scrolling from the hold.
const NO_SELECT = (
  Platform.OS === "web"
    ? { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none" }
    : {}
) as ViewStyle;

const styles = StyleSheet.create({
  // Takes the room left between the comic and the transcript.
  stage: {
    flex: 1,
    alignSelf: "stretch",
    maxHeight: 200,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
  },
  facePress: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  facePressed: {
    transform: [{ scale: 0.96 }],
  },
  bars: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
