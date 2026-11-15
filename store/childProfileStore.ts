import { accountStorage } from "@/lib/accountStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Minimal child profile per F03: nickname + class group only. No address,
// national ID, birth date, photo, or location — none of that is needed for
// learning, and collecting it would be out of scope for this pilot.
export type ChildClassGroup = "1" | "2" | "3" | "4" | "5" | "6";

// Labels are UI text: t(`grade.${group}`).
export const CHILD_CLASS_GROUPS: ChildClassGroup[] = ["1", "2", "3", "4", "5", "6"];

interface ChildProfileState {
  nickname: string | null;
  classGroup: ChildClassGroup | null;
  /** An edit made here that the server has not saved yet. */
  unsynced: boolean;
  /** The guardian filled in or edited the profile on this device. */
  setChildProfile: (nickname: string, classGroup: ChildClassGroup) => void;
  /** The profile saved on the server (the same on every device). */
  loadFromServer: (nickname: string, classGroup: ChildClassGroup) => void;
  markSynced: () => void;
  clearChildProfile: () => void;
}

export const useChildProfileStore = create<ChildProfileState>()(
  persist(
    (set) => ({
      nickname: null,
      classGroup: null,
      unsynced: false,
      setChildProfile: (nickname, classGroup) =>
        set({ nickname: nickname.trim().slice(0, 20) || null, classGroup, unsynced: true }),
      loadFromServer: (nickname, classGroup) => set({ nickname, classGroup, unsynced: false }),
      markSynced: () => set({ unsynced: false }),
      clearChildProfile: () => set({ nickname: null, classGroup: null, unsynced: false }),
    }),
    {
      name: "child-profile-storage",
      storage: createJSONStorage(() => accountStorage),
      skipHydration: true,
    },
  ),
);
