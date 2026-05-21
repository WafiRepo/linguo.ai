import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { LESSONS } from "@/data/lessons";
import {
  buildMixedPracticeActivities,
  calculatePracticeXp,
  getPracticeActivitiesForLesson,
  getUnlockedLessons,
  isPracticeAnswerCorrect,
} from "@/lib/practice";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { Activity } from "@/types/learning";

type AnswerState = "idle" | "correct" | "wrong";

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedLanguage } = useLanguageStore();
  const activeLessonIdsByLanguage = useLearningStore(
    (s) => s.activeLessonIdsByLanguage,
  );
  const addXP = useLearningStore((s) => s.addXP);

  const activeLessonId = selectedLanguage
    ? activeLessonIdsByLanguage[selectedLanguage]
    : undefined;

  const { title, activities } = useMemo(() => {
    if (!selectedLanguage) {
      return { title: "Practice", activities: [] as Activity[] };
    }

    if (id === "mixed") {
      const unlockedLessons = getUnlockedLessons(
        selectedLanguage,
        activeLessonId,
      );
      return {
        title: "Mixed review",
        activities: buildMixedPracticeActivities(unlockedLessons, 10),
      };
    }

    const lesson = LESSONS.find((item) => item.id === id);
    if (!lesson) {
      return { title: "Practice", activities: [] as Activity[] };
    }

    return {
      title: lesson.title,
      activities: getPracticeActivitiesForLesson(lesson),
    };
  }, [activeLessonId, id, selectedLanguage]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [correctCount, setCorrectCount] = useState(0);
  const correctCountRef = useRef(0);
  const [finished, setFinished] = useState(false);

  const currentActivity = activities[currentIndex];
  const progress =
    activities.length > 0 ? ((currentIndex + 1) / activities.length) * 100 : 0;

  function handleClose() {
    router.back();
  }

  function handleCheckAnswer() {
    if (!currentActivity || answerState !== "idle") return;

    const given =
      currentActivity.type === "multiple-choice"
        ? (selectedOption ?? "")
        : typedAnswer;

    const isCorrect = isPracticeAnswerCorrect(
      given,
      currentActivity.correctAnswer,
    );
    setAnswerState(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
    }
  }

  function handleContinue() {
    if (!currentActivity) return;

    const isLast = currentIndex >= activities.length - 1;
    if (isLast) {
      const xpEarned = calculatePracticeXp(
        correctCountRef.current,
        activities.length,
      );
      addXP(xpEarned);
      setFinished(true);
      posthog.capture("practice_completed", {
        practice_id: id,
        language: selectedLanguage,
        correct_count: correctCountRef.current,
        total_count: activities.length,
        xp_earned: xpEarned,
      });
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedOption(null);
    setTypedAnswer("");
    setAnswerState("idle");
  }

  if (!selectedLanguage || activities.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="h3 text-center mb-2">No practice available</Text>
          <Text className="body-md text-text-secondary text-center mb-4">
            Start a lesson first, then come back to practice.
          </Text>
          <TouchableOpacity
            className="bg-lingua-purple rounded-2xl px-6 py-3"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-poppins-semibold text-base text-white">
              Go to Learn
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const xpEarned = calculatePracticeXp(correctCount, activities.length);

    return (
      <SafeAreaView style={styles.safeArea}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🎉</Text>
          <Text className="h2 text-center mb-2">Practice complete!</Text>
          <Text className="body-md text-text-secondary text-center mb-1">
            {correctCount}/{activities.length} correct
          </Text>
          <Text className="font-poppins-semibold text-lg text-lingua-purple mb-6">
            +{xpEarned} XP
          </Text>
          <TouchableOpacity
            className="bg-lingua-purple rounded-2xl px-8 py-3 mb-3 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-poppins-semibold text-base text-white text-center">
              Back to Learn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-2xl px-8 py-3 w-full border border-border"
            onPress={() => {
              correctCountRef.current = 0;
              setCurrentIndex(0);
              setSelectedOption(null);
              setTypedAnswer("");
              setAnswerState("idle");
              setCorrectCount(0);
              setFinished(false);
            }}
          >
            <Text className="font-poppins-semibold text-base text-text-primary text-center">
              Practice again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5 pt-2 pb-4">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
            <View className="flex-1 mx-3">
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
            </View>
            <Text className="caption">
              {currentIndex + 1}/{activities.length}
            </Text>
          </View>

          <Text className="caption mb-1">{title}</Text>
          <Text className="font-poppins-semibold text-lg text-text-primary">
            {currentActivity.question}
          </Text>
        </View>

        <View className="flex-1 px-5">
          {currentActivity.type === "multiple-choice" ? (
            <View className="gap-3">
              {(currentActivity.options ?? []).map((option) => {
                const isSelected = selectedOption === option;
                const isCorrectOption =
                  option === currentActivity.correctAnswer;
                let optionStyle = styles.optionDefault;

                if (answerState !== "idle") {
                  if (isCorrectOption) optionStyle = styles.optionCorrect;
                  else if (isSelected) optionStyle = styles.optionWrong;
                } else if (isSelected) {
                  optionStyle = styles.optionSelected;
                }

                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.85}
                    disabled={answerState !== "idle"}
                    style={[styles.option, optionStyle]}
                    onPress={() => setSelectedOption(option)}
                  >
                    <Text className="font-poppins-medium text-sm text-text-primary">
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View>
              <TextInput
                value={typedAnswer}
                onChangeText={setTypedAnswer}
                editable={answerState === "idle"}
                placeholder="Type your answer"
                placeholderTextColor={colors.neutral.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
              {answerState === "wrong" && currentActivity.hint ? (
                <Text className="caption mt-2">Hint: {currentActivity.hint}</Text>
              ) : null}
              {answerState !== "idle" ? (
                <Text
                  className="font-poppins-medium text-sm mt-3"
                  style={{
                    color:
                      answerState === "correct"
                        ? colors.semantic.success
                        : colors.semantic.error,
                  }}
                >
                  {answerState === "correct"
                    ? "Correct!"
                    : `Answer: ${currentActivity.correctAnswer}`}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View className="px-5 pb-5">
          {answerState === "idle" ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (currentActivity.type === "multiple-choice"
                  ? !selectedOption
                  : !typedAnswer.trim()) && styles.primaryButtonDisabled,
              ]}
              disabled={
                currentActivity.type === "multiple-choice"
                  ? !selectedOption
                  : !typedAnswer.trim()
              }
              onPress={handleCheckAnswer}
            >
              <Text className="font-poppins-semibold text-base text-white">
                Check
              </Text>
            </TouchableOpacity>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleContinue}>
              <Text className="font-poppins-semibold text-base text-white">
                {currentIndex >= activities.length - 1 ? "Finish" : "Continue"}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  flex: {
    flex: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.neutral.border,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary.purple,
  },
  option: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  optionDefault: {
    borderColor: colors.neutral.border,
  },
  optionSelected: {
    borderColor: colors.primary.purple,
    backgroundColor: "#EDE9FE",
  },
  optionCorrect: {
    borderColor: colors.semantic.success,
    backgroundColor: "#DCFCE7",
  },
  optionWrong: {
    borderColor: colors.semantic.error,
    backgroundColor: "#FEE2E2",
  },
  textInput: {
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    color: colors.neutral.textPrimary,
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: colors.primary.purple,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
});
