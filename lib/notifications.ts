import { colors } from "@/constants/theme";
import { AppNotification } from "@/components/NotificationsModal";

type BuildNotificationsParams = {
  xpToday: number;
  dailyGoal: number;
  streak: number;
  nextLessonTitle?: string;
  languageName?: string;
};

export function buildHomeNotifications({
  xpToday,
  dailyGoal,
  streak,
  nextLessonTitle,
  languageName,
}: BuildNotificationsParams): AppNotification[] {
  const items: AppNotification[] = [];

  const xpRemaining = Math.max(dailyGoal - xpToday, 0);
  if (xpRemaining > 0) {
    items.push({
      id: "daily-goal",
      title: "Daily goal reminder",
      message: `Earn ${xpRemaining} more XP to reach your ${dailyGoal} XP goal today.`,
      icon: "trophy-outline",
      iconBg: "#FFF5E8",
      iconColor: colors.semantic.warning,
    });
  } else {
    items.push({
      id: "daily-goal-complete",
      title: "Daily goal complete",
      message: "Great job! You hit your XP goal for today.",
      icon: "checkmark-circle-outline",
      iconBg: "#ECFDF5",
      iconColor: colors.semantic.success,
    });
  }

  items.push({
    id: "streak",
    title: "Keep your streak alive",
    message:
      streak > 0
        ? `You're on a ${streak}-day streak. Complete a lesson today to keep it going.`
        : "Start a lesson today to begin your learning streak.",
    icon: "flame-outline",
    iconBg: "#FFF5E8",
    iconColor: colors.semantic.warning,
  });

  if (nextLessonTitle) {
    items.push({
      id: "next-lesson",
      title: "Continue learning",
      message: languageName
        ? `Pick up ${nextLessonTitle} in your ${languageName} course.`
        : `Pick up ${nextLessonTitle} when you're ready.`,
      icon: "book-outline",
      iconBg: "#EDE9FE",
      iconColor: colors.primary.purple,
    });
  }

  return items;
}
