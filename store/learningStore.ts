import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_DAILY_GOAL,
  getLocalDateKey,
  getYesterdayDateKey,
} from "@/lib/dailyProgress";
import {
  createEmptyTodayPlanProgress,
  TodayPlanItemId,
  TodayPlanProgress,
} from "@/lib/todayPlan";
import { LanguageCode } from "@/types/learning";

interface LearningState {
  xpToday: number;
  dailyGoal: number;
  streak: number;
  progressDate: string | null;
  lastStreakDate: string | null;
  completedLessonIds: string[];
  todayPlanProgress: TodayPlanProgress | null;
  activeLessonIdsByLanguage: Partial<Record<LanguageCode, string>>;
  syncDailyProgress: () => void;
  addXP: (amount: number) => void;
  completeLesson: (lessonId: string, xpReward?: number) => void;
  markTodayPlanItem: (lessonId: string, itemId: TodayPlanItemId) => void;
  getTodayPlanProgress: (lessonId: string) => TodayPlanProgress;
  setActiveLesson: (languageCode: LanguageCode, lessonId: string) => void;
  getActiveLessonId: (languageCode: LanguageCode) => string | undefined;
}

function ensureTodayPlanProgress(
  current: TodayPlanProgress | null,
  lessonId: string,
  date: string,
): TodayPlanProgress {
  if (current && current.date === date && current.lessonId === lessonId) {
    return current;
  }

  return createEmptyTodayPlanProgress(lessonId, date);
}

function updateStreak(state: LearningState): Partial<LearningState> {
  const today = getLocalDateKey();

  if (state.lastStreakDate === today) {
    return {};
  }

  const yesterday = getYesterdayDateKey();
  const nextStreak =
    state.lastStreakDate === yesterday ? state.streak + 1 : 1;

  return {
    lastStreakDate: today,
    streak: nextStreak,
  };
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      xpToday: 0,
      dailyGoal: DEFAULT_DAILY_GOAL,
      streak: 0,
      progressDate: null,
      lastStreakDate: null,
      completedLessonIds: [],
      todayPlanProgress: null,
      activeLessonIdsByLanguage: {},

      syncDailyProgress: () => {
        const today = getLocalDateKey();
        const state = get();

        if (state.progressDate === today) {
          return;
        }

        const yesterday = getYesterdayDateKey();
        let nextStreak = state.streak;

        if (state.progressDate && state.lastStreakDate !== yesterday) {
          nextStreak = 0;
        }

        set({
          progressDate: today,
          xpToday: 0,
          streak: nextStreak,
          todayPlanProgress: null,
        });
      },

      addXP: (amount) => {
        if (amount <= 0) return;

        get().syncDailyProgress();
        set((state) => ({
          ...updateStreak(state),
          xpToday: state.xpToday + amount,
        }));
      },

      completeLesson: (lessonId, xpReward = 10) => {
        get().syncDailyProgress();
        const alreadyCompleted = get().completedLessonIds.includes(lessonId);

        if (!alreadyCompleted) {
          set((state) => ({
            completedLessonIds: [...state.completedLessonIds, lessonId],
          }));
          get().addXP(xpReward);
        }

        get().markTodayPlanItem(lessonId, "lesson");
      },

      markTodayPlanItem: (lessonId, itemId) => {
        get().syncDailyProgress();

        const today = getLocalDateKey();
        const progress = ensureTodayPlanProgress(
          get().todayPlanProgress,
          lessonId,
          today,
        );

        const nextProgress: TodayPlanProgress = {
          ...progress,
          date: today,
          lessonId,
          lesson: itemId === "lesson" ? true : progress.lesson,
          aiConversation:
            itemId === "ai-conversation" ? true : progress.aiConversation,
          newWords: itemId === "new-words" ? true : progress.newWords,
        };

        if (itemId === "ai-conversation") {
          nextProgress.lesson = true;
        }

        set({ todayPlanProgress: nextProgress });
      },

      getTodayPlanProgress: (lessonId) => {
        get().syncDailyProgress();
        const today = getLocalDateKey();
        return ensureTodayPlanProgress(get().todayPlanProgress, lessonId, today);
      },

      setActiveLesson: (languageCode, lessonId) =>
        set((state) => ({
          activeLessonIdsByLanguage: {
            ...state.activeLessonIdsByLanguage,
            [languageCode]: lessonId,
          },
        })),

      getActiveLessonId: (languageCode) =>
        get().activeLessonIdsByLanguage[languageCode],
    }),
    {
      name: "learning-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.syncDailyProgress();
      },
    },
  ),
);
