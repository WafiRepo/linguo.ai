import { accountStorage } from "@/lib/accountStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_DAILY_GOAL, getLocalDateKey } from "@/lib/dailyProgress";
import { classModeKey, ClassTopicMode } from "@/lib/topicProgress";
import { LanguageCode } from "@/types/learning";

/** Progress worked out from the saved sessions in the Learning Portfolio. */
export interface ServerProgress {
  passedTopicIds: string[];
  completedModes: string[];
  bestScores: Record<string, number>;
  /** XP earned today (first completions only), by this device's date. */
  xpToday: number;
}

interface LearningState {
  xpToday: number;
  dailyGoal: number;
  progressDate: string | null;
  completedLessonIds: string[];
  /** AI Teacher topics where both Latihan and Role Play are done. */
  completedClassTopicIds: string[];
  /** Finished AI Teacher sessions, as `${topicId}:${mode}`. */
  completedClassModes: string[];
  startedClassTopicIds: string[];
  /** Topics whose Role Play was finished with a passing score (PASS stamp). */
  passedRolePlayTopicIds: string[];
  /** Best Role Play score (0–100) per topic, to suggest what to practise again. */
  rolePlayBestScores: Record<string, number>;
  activeLessonIdsByLanguage: Partial<Record<LanguageCode, string>>;
  syncDailyProgress: () => void;
  addXP: (amount: number) => void;
  completeLesson: (lessonId: string, xpReward?: number) => void;
  completeClassTopic: (topicId: string, mode: ClassTopicMode, xpReward?: number) => void;
  markClassTopicStarted: (topicId: string) => void;
  markRolePlayPassed: (topicId: string) => void;
  /** Adds what the Learning Portfolio knows (work done on another device). */
  mergeServerProgress: (progress: ServerProgress) => void;
  recordRolePlayScore: (topicId: string, score: number) => void;
  setActiveLesson: (languageCode: LanguageCode, lessonId: string) => void;
  getActiveLessonId: (languageCode: LanguageCode) => string | undefined;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      xpToday: 0,
      dailyGoal: DEFAULT_DAILY_GOAL,
      progressDate: null,
      completedLessonIds: [],
      completedClassTopicIds: [],
      completedClassModes: [],
      startedClassTopicIds: [],
      passedRolePlayTopicIds: [],
      rolePlayBestScores: {},
      activeLessonIdsByLanguage: {},

      syncDailyProgress: () => {
        const today = getLocalDateKey();
        if (get().progressDate === today) {
          return;
        }
        set({ progressDate: today, xpToday: 0 });
      },

      addXP: (amount) => {
        if (amount <= 0) return;

        get().syncDailyProgress();
        set((state) => ({ xpToday: state.xpToday + amount }));
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
      },

      completeClassTopic: (topicId, mode, xpReward = 10) => {
        get().syncDailyProgress();
        const key = classModeKey(topicId, mode);
        if (get().completedClassModes.includes(key)) return;

        const completedClassModes = [...get().completedClassModes, key];
        const otherMode: ClassTopicMode = mode === "practice" ? "roleplay" : "practice";
        const topicDone =
          completedClassModes.includes(classModeKey(topicId, otherMode)) &&
          !get().completedClassTopicIds.includes(topicId);

        set((state) => ({
          completedClassModes,
          completedClassTopicIds: topicDone
            ? [...state.completedClassTopicIds, topicId]
            : state.completedClassTopicIds,
        }));
        get().addXP(xpReward);
      },

      markClassTopicStarted: (topicId) => {
        const alreadyStarted = get().startedClassTopicIds.includes(topicId);
        if (!alreadyStarted) {
          set((state) => ({
            startedClassTopicIds: [...state.startedClassTopicIds, topicId],
          }));
        }
      },

      markRolePlayPassed: (topicId) => {
        if (get().passedRolePlayTopicIds.includes(topicId)) return;
        set((state) => ({
          passedRolePlayTopicIds: [...state.passedRolePlayTopicIds, topicId],
        }));
      },

      // Only ever adds: work done here but not uploaded yet is kept.
      mergeServerProgress: (progress) => {
        get().syncDailyProgress();
        const state = get();
        const union = (local: string[], server: string[]) => [
          ...local,
          ...server.filter((id) => !local.includes(id)),
        ];
        const bestScores = { ...state.rolePlayBestScores };
        for (const [topicId, score] of Object.entries(progress.bestScores)) {
          bestScores[topicId] = Math.max(bestScores[topicId] ?? 0, score);
        }
        set({
          passedRolePlayTopicIds: union(state.passedRolePlayTopicIds, progress.passedTopicIds),
          completedClassModes: union(state.completedClassModes, progress.completedModes),
          rolePlayBestScores: bestScores,
          // The larger one: XP from sessions not uploaded yet stays counted.
          xpToday: Math.max(state.xpToday, progress.xpToday),
        });
      },

      recordRolePlayScore: (topicId, score) => {
        const best = get().rolePlayBestScores[topicId];
        if (best !== undefined && best >= score) return;
        set((state) => ({ rolePlayBestScores: { ...state.rolePlayBestScores, [topicId]: score } }));
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
      storage: createJSONStorage(() => accountStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.syncDailyProgress();
      },
    },
  ),
);
