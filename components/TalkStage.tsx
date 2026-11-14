import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { TeacherFace, TeacherMood } from "@/components/TeacherFace";

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
}: TalkStageProps) {
  const [stageHeight, setStageHeight] = useState(190);
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
    <View className="flex-1 items-center">
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
        <Pressable
          onPressIn={canTalk ? onPressIn : undefined}
          onPressOut={canTalk ? onPressOut : undefined}
          disabled={!canTalk}
          accessibilityRole="button"
          accessibilityLabel={status}
          testID="roleplay-hold-to-talk"
          style={({ pressed }) => [styles.facePress, pressed && canTalk && styles.facePressed]}
        >
          <TeacherFace mood={mood} speaking={teacherSpeaking} audioLevel={teacherLevel} size={faceSize} />
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
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.75} />
          <Stop offset="45%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
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
