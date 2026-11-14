import { accountStorage } from "@/lib/accountStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_DAILY_GOAL, getLocalDateKey } from "@/lib/dailyProgress";
import { classModeKey, ClassTopicMode } from "@/lib/topicProgress";
import { LanguageCode } from "@/types/learning";

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
  /** Adds stamps saved on the server (earned on another device). */
  mergePassedRolePlayTopics: (topicIds: string[]) => void;
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

      mergePassedRolePlayTopics: (topicIds) => {
        const current = get().passedRolePlayTopicIds;
        const added = topicIds.filter((id) => !current.includes(id));
        if (added.length) set({ passedRolePlayTopicIds: [...current, ...added] });
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
