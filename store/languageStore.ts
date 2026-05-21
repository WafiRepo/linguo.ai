import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_TUTOR_EMOTION, TutorEmotionCode } from "@/lib/tutorEmotion";
import { TutorVoiceCode } from "@/lib/instructionLanguage";
import { LanguageCode } from "@/types/learning";

interface LanguageState {
  selectedLanguage: LanguageCode | null;
  tutorVoice: TutorVoiceCode;
  tutorEmotion: TutorEmotionCode;
  setSelectedLanguage: (code: LanguageCode) => void;
  setTutorVoice: (voice: TutorVoiceCode) => void;
  setTutorEmotion: (emotion: TutorEmotionCode) => void;
  clearSelectedLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      selectedLanguage: null,
      tutorVoice: "zh-TW",
      tutorEmotion: DEFAULT_TUTOR_EMOTION,
      setSelectedLanguage: (code) => set({ selectedLanguage: code }),
      setTutorVoice: (voice) => set({ tutorVoice: voice }),
      setTutorEmotion: (emotion) => set({ tutorEmotion: emotion }),
      clearSelectedLanguage: () => set({ selectedLanguage: null }),
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
