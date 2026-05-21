import { colors } from "@/constants/theme";
import { FeedbackLevel, SessionFeedback } from "@/types/learning";

export const INITIAL_SESSION_FEEDBACK: SessionFeedback = {
  speaking: null,
  pronunciation: null,
  grammar: null,
};

export const FEEDBACK_LABELS: Record<FeedbackLevel, string> = {
  needs_work: "Keep trying",
  good: "Good",
  great: "Great",
  excellent: "Excellent",
};

export const FEEDBACK_COLORS: Record<FeedbackLevel, string> = {
  needs_work: colors.semantic.warning,
  good: colors.primary.purple,
  great: colors.primary.blue,
  excellent: colors.semantic.success,
};

export function isFeedbackLevel(value: unknown): value is FeedbackLevel {
  return (
    value === "needs_work" ||
    value === "good" ||
    value === "great" ||
    value === "excellent"
  );
}

export function parseFeedbackUpdate(data: Record<string, unknown>): SessionFeedback | null {
  const speaking = data.speaking;
  const pronunciation = data.pronunciation;
  const grammar = data.grammar;

  if (
    !isFeedbackLevel(speaking) ||
    !isFeedbackLevel(pronunciation) ||
    !isFeedbackLevel(grammar)
  ) {
    return null;
  }

  return { speaking, pronunciation, grammar };
}

export function getFeedbackLabel(level: FeedbackLevel | null): string {
  if (!level) return "Listening...";
  return FEEDBACK_LABELS[level];
}

export function getFeedbackColor(level: FeedbackLevel | null): string {
  if (!level) return colors.neutral.textSecondary;
  return FEEDBACK_COLORS[level];
}
