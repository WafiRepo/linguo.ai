import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodayPlanList } from "@/components/TodayPlanList";
import { colors } from "@/constants/theme";
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { useT } from "@/lib/i18n";
import {
  buildTodayPlanItems,
  countCompletedPlanItems,
  TodayPlanItem,
} from "@/lib/todayPlan";
import { getNextClassTopic } from "@/lib/topicProgress";
import { posthog } from "@/lib/posthog";
import { useLearningStore } from "@/store/learningStore";

export default function TodayPlanScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const syncDailyProgress = useLearningStore((s) => s.syncDailyProgress);
  const completedClassTopicIds = useLearningStore((s) => s.completedClassTopicIds);
  const completedClassModes = useLearningStore((s) => s.completedClassModes);
  const markClassTopicStarted = useLearningStore((s) => s.markClassTopicStarted);
  const dailyGoal = useLearningStore((s) => s.dailyGoal);
  const xpToday = useLearningStore((s) => s.xpToday);

  useEffect(() => {
    syncDailyProgress();
  }, [syncDailyProgress]);

  const nextTopic = getNextClassTopic(completedClassTopicIds);

  // `t` is rebuilt each render; `locale` is what it depends on.
  const planItems = useMemo(
    () => buildTodayPlanItems({ topic: nextTopic, completedClassModes, t }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextTopic, completedClassModes, locale],
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
    if (nextTopic) markClassTopicStarted(nextTopic.id);
    router.push((CHILD_AI_RELEASE_READY ? item.route : "/ai-teacher") as Href);
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
          {t("todayPlan.title")}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View className="bg-white rounded-[20px] border border-border px-4 py-4 mb-4" style={styles.cardShadow}>
          <Text className="font-poppins-semibold text-base text-text-primary">
            {nextTopic ? `${nextTopic.title} · ${nextTopic.subtitle}` : t("home.allTopicsDone")}
          </Text>
          <Text className="font-poppins text-sm text-text-secondary mt-1">
            {t("todayPlan.tasksDone", { done: completedCount, total: planItems.length })}
          </Text>
          <View className="h-2 bg-border rounded mt-3 overflow-hidden">
            <View
              className="h-2 bg-lingua-blue rounded"
              style={{ width: `${Math.round(taskProgress)}%` as `${number}%` }}
            />
          </View>
          <Text className="font-poppins text-xs text-text-secondary mt-2">
            {t("todayPlan.dailyGoal", { xp: xpToday, goal: dailyGoal })}
            {xpToday >= dailyGoal ? ` · ${t("todayPlan.complete")}` : ""}
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
