import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { LanguageCode } from "@/types/learning";

interface LearningState {
  xpToday: number;
  dailyGoal: number;
  streak: number;
  completedLessonIds: string[];
  /** Last opened lesson per language — drives the "In progress" badge on Learn. */
  activeLessonIdsByLanguage: Partial<Record<LanguageCode, string>>;
  addXP: (amount: number) => void;
  completeLesson: (lessonId: string) => void;
  setActiveLesson: (languageCode: LanguageCode, lessonId: string) => void;
  getActiveLessonId: (languageCode: LanguageCode) => string | undefined;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      xpToday: 15,
      dailyGoal: 20,
      streak: 12,
      completedLessonIds: [],
      activeLessonIdsByLanguage: {},
      addXP: (amount) =>
        set((state) => ({
          xpToday: Math.min(state.xpToday + amount, state.dailyGoal),
        })),
      completeLesson: (lessonId) =>
        set((state) => ({
          completedLessonIds: state.completedLessonIds.includes(lessonId)
            ? state.completedLessonIds
            : [...state.completedLessonIds, lessonId],
        })),
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
    }
  )
);
