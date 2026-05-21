import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodayPlanList } from "@/components/TodayPlanList";
import { colors } from "@/constants/theme";
import { getLessonNumber, getLessonsForLanguage, getNextLesson } from "@/lib/curriculum";
import { getLocalDateKey } from "@/lib/dailyProgress";
import {
  buildTodayPlanItems,
  countCompletedPlanItems,
  createEmptyTodayPlanProgress,
  TodayPlanItem,
} from "@/lib/todayPlan";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";

export default function TodayPlanScreen() {
  const router = useRouter();
  const { selectedLanguage } = useLanguageStore();
  const syncDailyProgress = useLearningStore((s) => s.syncDailyProgress);
  const completedLessonIds = useLearningStore((s) => s.completedLessonIds);
  const getActiveLessonId = useLearningStore((s) => s.getActiveLessonId);
  const todayPlanProgress = useLearningStore((s) => s.todayPlanProgress);
  const dailyGoal = useLearningStore((s) => s.dailyGoal);
  const xpToday = useLearningStore((s) => s.xpToday);

  useEffect(() => {
    syncDailyProgress();
  }, [syncDailyProgress]);

  const continueLesson = useMemo(() => {
    if (!selectedLanguage) return undefined;

    const activeLessonId = getActiveLessonId(selectedLanguage);
    const lessons = getLessonsForLanguage(selectedLanguage);

    if (activeLessonId) {
      return lessons.find((lesson) => lesson.id === activeLessonId);
    }

    return getNextLesson(selectedLanguage, completedLessonIds);
  }, [completedLessonIds, getActiveLessonId, selectedLanguage]);

  const lessonNumber =
    continueLesson && selectedLanguage
      ? getLessonNumber(selectedLanguage, continueLesson.id)
      : 1;

  const today = getLocalDateKey();
  const resolvedPlanProgress = useMemo(() => {
    if (!continueLesson) return undefined;

    if (
      todayPlanProgress?.date === today &&
      todayPlanProgress.lessonId === continueLesson.id
    ) {
      return todayPlanProgress;
    }

    return createEmptyTodayPlanProgress(continueLesson.id, today);
  }, [continueLesson, today, todayPlanProgress]);

  const planItems = useMemo(
    () =>
      buildTodayPlanItems({
        lesson: continueLesson,
        lessonNumber,
        progress: resolvedPlanProgress,
        date: today,
        completedLessonIds,
      }),
    [completedLessonIds, continueLesson, lessonNumber, resolvedPlanProgress, today],
  );

  const completedCount = countCompletedPlanItems(planItems);
  const taskProgress =
    planItems.length > 0 ? (completedCount / planItems.length) * 100 : 0;

  function handleItemPress(item: TodayPlanItem) {
    posthog.capture("today_plan_item_tapped", {
      item_id: item.id,
      route: item.route,
      completed: item.completed,
    });
    router.push(item.route as Href);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center font-poppins-semibold text-[17px] text-text-primary mr-6">
          {"Today's plan"}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View className="bg-white rounded-[20px] border border-border px-4 py-4 mb-4" style={styles.cardShadow}>
          <Text className="font-poppins-semibold text-base text-text-primary">
            {continueLesson?.title ?? "Your learning path"}
          </Text>
          <Text className="font-poppins text-sm text-text-secondary mt-1">
            {completedCount}/{planItems.length} tasks complete today
          </Text>
          <View className="h-2 bg-border rounded mt-3 overflow-hidden">
            <View
              className="h-2 bg-lingua-blue rounded"
              style={{ width: `${Math.round(taskProgress)}%` as `${number}%` }}
            />
          </View>
          <Text className="font-poppins text-xs text-text-secondary mt-2">
            Daily goal: {xpToday}/{dailyGoal} XP
            {xpToday >= dailyGoal ? " · Complete!" : ""}
          </Text>
        </View>

        <TodayPlanList
          items={planItems}
          onItemPress={handleItemPress}
          showXpHint
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});
