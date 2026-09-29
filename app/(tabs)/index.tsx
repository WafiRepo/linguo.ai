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
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { LANGUAGES } from "@/data/languages";
import { comicTeacherName } from "@/lib/comicRoleplay";
import { APP_LOCALE_OPTIONS, useT } from "@/lib/i18n";
import { buildHomeNotifications } from "@/lib/notifications";
import { buildTodayPlanItems, TodayPlanItem } from "@/lib/todayPlan";
import {
  ALL_CLASS_TOPICS,
  classModeKey,
  classTopicRoute,
  getNextClassTopic,
  getWorkedOnTopicIds,
} from "@/lib/topicProgress";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { useSettingsStore } from "@/store/settingsStore";
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
  const { t, locale } = useT();
  const setAppLocale = useSettingsStore((s) => s.setAppLocale);
  const selectedLanguage = useLanguageStore((s) => s.selectedLanguage);
  const syncDailyProgress = useLearningStore((s) => s.syncDailyProgress);
  const xpToday = useLearningStore((s) => s.xpToday);
  const dailyGoal = useLearningStore((s) => s.dailyGoal);
  const completedClassTopicIds = useLearningStore((s) => s.completedClassTopicIds);
  const completedClassModes = useLearningStore((s) => s.completedClassModes);
  const startedClassTopicIds = useLearningStore((s) => s.startedClassTopicIds);
  const markClassTopicStarted = useLearningStore((s) => s.markClassTopicStarted);

  useEffect(() => {
    syncDailyProgress();
  }, [syncDailyProgress]);

  const language = LANGUAGES.find((l) => l.code === selectedLanguage);
  const currentLocaleOption =
    APP_LOCALE_OPTIONS.find((option) => option.code === locale) ??
    APP_LOCALE_OPTIONS[0];
  // Continue learning follows the AI Teacher topics, in the same order: the
  // first one without a check mark there.
  const workedOnTopicIds = getWorkedOnTopicIds({
    completedClassTopicIds,
    startedClassTopicIds,
    completedClassModes,
  });
  const nextTopic = getNextClassTopic(workedOnTopicIds);
  const doneTopicCount = workedOnTopicIds.length;
  const firstName = user?.firstName ?? t("home.studentFallback");
  const greeting = getGreeting(selectedLanguage);
  const xpProgress =
    dailyGoal > 0 ? Math.min((xpToday / dailyGoal) * 100, 100) : 0;
  const canSwitchLanguage = LANGUAGES.length > 1;
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  // `t` is rebuilt each render; `locale` is what it depends on.
  const planItems = useMemo(
    () => buildTodayPlanItems({ topic: nextTopic, completedClassModes, t }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextTopic, completedClassModes, locale],
  );

  const notifications = useMemo(
    () =>
      buildHomeNotifications({
        xpToday,
        dailyGoal,
        nextTopicTitle: nextTopic ? `${nextTopic.title} · ${nextTopic.subtitle}` : undefined,
        t,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xpToday, dailyGoal, nextTopic, locale],
  );
  const showNotificationBadge =
    notifications.length > 0 && !notificationsRead;

  function openRoute(route: string) {
    router.push((CHILD_AI_RELEASE_READY ? route : "/ai-teacher") as Href);
  }

  function handleContinueLearning() {
    posthog.capture("continue_learning_tapped", {
      language_code: selectedLanguage,
      xp_today: xpToday,
      topic_id: nextTopic?.id ?? null,
    });

    if (!nextTopic) {
      router.push("/ai-teacher");
      return;
    }

    // Latihan first, then Role Play.
    const mode = completedClassModes.includes(classModeKey(nextTopic.id, "practice"))
      ? "roleplay"
      : "practice";
    markClassTopicStarted(nextTopic.id);
    openRoute(classTopicRoute(nextTopic.id, mode));
  }

  function handlePlanItemPress(item: TodayPlanItem) {
    posthog.capture("today_plan_item_tapped", {
      item_id: item.id,
      route: item.route,
      completed: item.completed,
      source: "home",
    });
    if (nextTopic) markClassTopicStarted(nextTopic.id);
    openRoute(item.route);
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

  // The flag switches only the app's UI language; the AI teacher's
  // explanation language stays a separate setting in Profile.
  function handleToggleLocale() {
    const next = locale === "zh-TW" ? "en" : "zh-TW";
    setAppLocale(next);
    posthog.capture("app_locale_changed", {
      app_locale: next,
      source: "home_quick_switch",
    });
  }

  function handleSignOut() {
    Alert.alert(t("auth.signOut"), t("auth.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.signOut"),
        style: "destructive",
        onPress: async () => {
          try {
            posthog.capture("sign_out_tapped");
            posthog.reset();
            await signOut();
            router.replace("/onboarding");
          } catch (error) {
            console.error("Sign out failed:", error);
            Alert.alert(t("auth.signOutFailed"), t("common.tryAgain"));
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
          className="w-[34px] h-[34px] rounded-full border border-border"
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
          <Pressable
            testID="app-locale-quick-switch"
            onPress={handleToggleLocale}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && styles.headerIconButtonPressed,
            ]}
            hitSlop={8}
          >
            <Text style={styles.localeEmoji}>{currentLocaleOption.emoji}</Text>
          </Pressable>
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
              {t("home.dailyGoal")}
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
                {t("home.goalReached")}
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
                {t("home.continueLearning")}
              </Text>
              <Text className="font-poppins-bold text-[22px] text-white leading-7">
                {t("home.indonesian")}
              </Text>
              <Text
                className="font-poppins-semibold text-[13px] text-white mt-1"
                numberOfLines={1}
              >
                {nextTopic
                  ? `${nextTopic.title} · ${nextTopic.subtitle}`
                  : t("home.allTopicsDone")}
              </Text>
              <Text
                className="font-poppins text-[11px] text-white/65 mt-0.5"
                numberOfLines={2}
              >
                {t("home.topicProgress", { done: doneTopicCount, total: ALL_CLASS_TOPICS.length })}
                {nextTopic ? ` · ${comicTeacherName(nextTopic)}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-white rounded-xl py-2 px-[22px] self-start"
              activeOpacity={0.85}
              testID="continue-learning-button"
              onPress={handleContinueLearning}
            >
              <Text className="font-poppins-semibold text-[13px] text-lingua-purple">
                {nextTopic ? t("home.continue") : t("home.review")}
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
            {t("home.todayPlan")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            testID="today-plan-view-all"
            onPress={handleViewAllPlan}
          >
            <Text className="font-poppins-medium text-[13px] text-lingua-blue">
              {t("common.viewAll")}
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
  localeEmoji: {
    fontSize: 20,
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
