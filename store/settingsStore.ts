import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AppLocale } from "@/lib/i18n";

// Device-level settings. Unlike the per-account stores, these are available
// before sign-in, so the onboarding and auth screens use the chosen language.
interface SettingsState {
  appLocale: AppLocale;
  setAppLocale: (locale: AppLocale) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appLocale: "zh-TW",
      setAppLocale: (locale) => set({ appLocale: locale }),
    }),
    {
      name: "app-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
