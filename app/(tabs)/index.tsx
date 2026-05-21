import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationsModal } from "@/components/NotificationsModal";
import { TodayPlanList } from "@/components/TodayPlanList";
import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { LANGUAGES } from "@/data/languages";
import { getActiveUnit, getCefrLevelForUnit, getLessonNumber, getLessonsForLanguage, getNextLesson, getUnitForLesson } from "@/lib/curriculum";
import { getLocalDateKey } from "@/lib/dailyProgress";
import { buildHomeNotifications } from "@/lib/notifications";
import {
  buildTodayPlanItems,
  createEmptyTodayPlanProgress,
  TodayPlanItem,
} from "@/lib/todayPlan";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { LanguageCode } from "@/types/learning";

function getGreeting(langCode: LanguageCode | null): string {
  switch (langCode) {
    case "es":
      return "Hola";
    case "fr":
      return "Bonjour";
    case "ja":
      return "こんにちは";
    case "de":
      return "Hallo";
    case "id":
      return "Halo";
    default:
      return "Hello";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { selectedLanguage } = useLanguageStore();
  const syncDailyProgress = useLearningStore((s) => s.syncDailyProgress);
  const todayPlanProgress = useLearningStore((s) => s.todayPlanProgress);
  const { xpToday, dailyGoal, streak, completedLessonIds, getActiveLessonId } =
    useLearningStore();

  useEffect(() => {
    syncDailyProgress();
  }, [syncDailyProgress]);

  const language = LANGUAGES.find((l) => l.code === selectedLanguage);
  const activeUnit = selectedLanguage
    ? getActiveUnit(selectedLanguage, completedLessonIds)
    : undefined;
  const nextLesson = selectedLanguage
    ? getNextLesson(selectedLanguage, completedLessonIds)
    : undefined;
  const activeLessonId = selectedLanguage
    ? getActiveLessonId(selectedLanguage)
    : undefined;
  const continueLesson =
    (activeLessonId
      ? getLessonsForLanguage(selectedLanguage!).find(
          (l) => l.id === activeLessonId,
        )
      : undefined) ?? nextLesson;
  const progressUnit =
    continueLesson && selectedLanguage
      ? getUnitForLesson(selectedLanguage, continueLesson.id)
      : activeUnit;
  const lessonNumber =
    continueLesson && selectedLanguage
      ? getLessonNumber(selectedLanguage, continueLesson.id)
      : 1;
  const progressLabel =
    progressUnit && selectedLanguage
      ? `${getCefrLevelForUnit(progressUnit.order)} · Unit ${progressUnit.order}`
      : "A1 · Unit 1";
  const continueLessonTitle =
    continueLesson?.title ?? "Start your first lesson";
  const continueLessonTopic =
    continueLesson?.description ?? progressUnit?.description ?? "";
  const firstName = user?.firstName ?? "Learner";
  const greeting = getGreeting(selectedLanguage);
  const xpProgress =
    dailyGoal > 0 ? Math.min((xpToday / dailyGoal) * 100, 100) : 0;
  const canSwitchLanguage = LANGUAGES.length > 1;
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
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
    [
      completedLessonIds,
      continueLesson,
      lessonNumber,
      resolvedPlanProgress,
      today,
    ],
  );

  const notifications = useMemo(
    () =>
      buildHomeNotifications({
        xpToday,
        dailyGoal,
        streak,
        nextLessonTitle: continueLesson?.title,
        languageName: language?.name,
      }),
    [xpToday, dailyGoal, streak, continueLesson?.title, language?.name],
  );
  const showNotificationBadge =
    notifications.length > 0 && !notificationsRead;

  function handleContinueLearning() {
    posthog.capture("continue_learning_tapped", {
      language_code: selectedLanguage,
      unit_order: activeUnit?.order ?? 1,
      xp_today: xpToday,
      streak,
      lesson_id: continueLesson?.id ?? null,
    });

    if (continueLesson) {
      router.push(`/lesson/${continueLesson.id}`);
      return;
    }

    router.push("/learn");
  }

  function handlePlanItemPress(item: TodayPlanItem) {
    posthog.capture("today_plan_item_tapped", {
      item_id: item.id,
      route: item.route,
      completed: item.completed,
      source: "home",
    });
    router.push(item.route as Href);
  }

  function handleViewAllPlan() {
    posthog.capture("today_plan_view_all_tapped");
    router.push("/today-plan" as Href);
  }

  function handleOpenNotifications() {
    setNotificationsVisible(true);
    try {
      posthog.capture("notifications_opened", {
        notification_count: notifications.length,
      });
    } catch {
      // Analytics must not block notifications UI
    }
  }

  function handleCloseNotifications() {
    setNotificationsVisible(false);
    setNotificationsRead(true);
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            posthog.capture("sign_out_tapped");
            posthog.reset();
            await signOut();
            router.replace("/onboarding");
          } catch (error) {
            console.error("Sign out failed:", error);
            Alert.alert(
              "Sign out failed",
              "Something went wrong. Please try again.",
            );
          }
        },
      },
    ]);
  }

  const headerContent = (
    <>
      {language ? (
        <Image
          source={{ uri: language.flag }}
          className="w-[34px] h-[34px] rounded-full"
        />
      ) : (
        <View className="w-[34px] h-[34px] rounded-full bg-surface" />
      )}
      <Text
        className="font-poppins-semibold text-base text-text-primary flex-shrink"
        numberOfLines={1}
      >
        {greeting}, {firstName}! 👋
      </Text>
    </>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      {/* Header — outside ScrollView so taps are not blocked */}
      <View style={styles.headerRow}>
        <View
          style={styles.headerLeft}
          pointerEvents="box-none"
        >
          {canSwitchLanguage ? (
            <TouchableOpacity
              activeOpacity={0.7}
              testID="change-language-button"
              onPress={() => router.push("/language-select?mode=switch")}
              style={styles.headerGreeting}
            >
              {headerContent}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerGreeting}>{headerContent}</View>
          )}
        </View>

        <View style={styles.headerActions}>
          <View style={styles.streakWrap}>
            <Image source={images.streakFire} style={styles.streakIcon} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
          <Pressable
            testID="notifications-button"
            onPress={handleOpenNotifications}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && styles.headerIconButtonPressed,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.neutral.textPrimary}
            />
            {showNotificationBadge ? (
              <View style={styles.notificationBadge} pointerEvents="none" />
            ) : null}
          </Pressable>
          <Pressable
            testID="sign-out-button"
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && styles.headerIconButtonPressed,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={colors.neutral.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Daily Goal Card ── */}
        <View className="flex-row items-center bg-[#FFF5E8] rounded-[20px] py-4 pl-5 pr-3 mb-4">
          <View className="flex-1 pr-2">
            <Text className="font-poppins text-xs text-text-secondary mb-1">
              Daily goal
            </Text>
            <Text>
              <Text className="font-poppins-bold text-[28px] text-text-primary leading-[34px]">
                {xpToday}
              </Text>
              <Text className="font-poppins text-sm text-text-secondary leading-[34px]">
                {` / ${dailyGoal} XP`}
              </Text>
            </Text>
            {xpToday >= dailyGoal ? (
              <Text className="font-poppins-medium text-xs text-lingua-blue mt-1">
                Goal reached today!
              </Text>
            ) : null}
            <View className="h-2 bg-border rounded mt-[10px] overflow-hidden">
              <View
                className="h-2 bg-streak rounded"
                style={{ width: `${Math.round(xpProgress)}%` as `${number}%` }}
              />
            </View>
          </View>
          <Image
            source={images.treasure}
            className="w-20 h-20"
            resizeMode="contain"
          />
        </View>

        {/* ── Continue Learning Card ── */}
        <View className="flex-row bg-lingua-purple rounded-[20px] min-h-[160px] mb-6 overflow-hidden">
          <View className="flex-1 py-5 pl-5 pr-2 justify-between">
            <View>
              <Text className="font-poppins text-[11px] text-white/75 mb-0.5">
                Continue learning
              </Text>
              <Text className="font-poppins-bold text-[22px] text-white leading-7">
                {language?.name ?? "Pick a language"}
              </Text>
              <Text
                className="font-poppins-semibold text-[13px] text-white mt-1"
                numberOfLines={1}
              >
                Lesson {lessonNumber} · {continueLessonTitle}
              </Text>
              <Text
                className="font-poppins text-[11px] text-white/65 mt-0.5"
                numberOfLines={2}
              >
                {progressLabel}
                {continueLessonTopic ? ` · ${continueLessonTopic}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-white rounded-xl py-2 px-[22px] self-start"
              activeOpacity={0.85}
              testID="continue-learning-button"
              onPress={handleContinueLearning}
            >
              <Text className="font-poppins-semibold text-[13px] text-lingua-purple">
                Continue
              </Text>
            </TouchableOpacity>
          </View>
          <Image
            source={images.palace}
            className="w-[130px] h-[160px]"
            resizeMode="cover"
          />
        </View>

        {/* ── Today's Plan Header ── */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-poppins-semibold text-[17px] text-text-primary">
            {"Today's plan"}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            testID="today-plan-view-all"
            onPress={handleViewAllPlan}
          >
            <Text className="font-poppins-medium text-[13px] text-lingua-blue">
              View all
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <TodayPlanList items={planItems} onItemPress={handlePlanItemPress} />
        </View>
      </ScrollView>

      <NotificationsModal
        visible={notificationsVisible}
        notifications={notifications}
        onClose={handleCloseNotifications}
        onMarkAllRead={() => setNotificationsRead(true)}
      />
    </SafeAreaView>
  );
}

// ScrollView.contentContainerStyle and shadow (iOS/Android) must stay in StyleSheet
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
    elevation: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerGreeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "100%",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  streakWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  streakIcon: {
    width: 22,
    height: 22,
  },
  streakText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    color: colors.semantic.streak,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headerIconButtonPressed: {
    backgroundColor: colors.neutral.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 100,
  },
  notificationBadge: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.error,
    borderWidth: 1.5,
    borderColor: colors.neutral.background,
  },
});
