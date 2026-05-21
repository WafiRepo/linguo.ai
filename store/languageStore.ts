import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { TutorVoiceCode } from "@/lib/instructionLanguage";
import { LanguageCode } from "@/types/learning";

interface LanguageState {
  selectedLanguage: LanguageCode | null;
  tutorVoice: TutorVoiceCode;
  setSelectedLanguage: (code: LanguageCode) => void;
  setTutorVoice: (voice: TutorVoiceCode) => void;
  clearSelectedLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      selectedLanguage: null,
      tutorVoice: "zh-TW",
      setSelectedLanguage: (code) => set({ selectedLanguage: code }),
      setTutorVoice: (voice) => set({ tutorVoice: voice }),
      clearSelectedLanguage: () => set({ selectedLanguage: null }),
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
