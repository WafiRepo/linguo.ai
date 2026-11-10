import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { accountStorage } from "@/lib/accountStorage";
import { NewSessionResult, PortfolioRole } from "@/types/portfolio";

// Session results waiting to be uploaded to the portfolio database.
// Kept on the phone so a result is not lost when the student is offline;
// lib/portfolio.ts uploads and removes them.
interface PortfolioState {
  pending: NewSessionResult[];
  /** From the server; teachers see "My students" instead of their own portfolio. */
  role: PortfolioRole;
  setRole: (role: PortfolioRole) => void;
  addPending: (session: NewSessionResult) => void;
  removePending: (session: NewSessionResult) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      pending: [],
      role: "student",
      setRole: (role) => set({ role }),
      // A newer version of the same session replaces the queued one.
      addPending: (session) =>
        set((state) => ({
          pending: [...state.pending.filter((item) => item.clientId !== session.clientId), session].slice(-50),
        })),
      removePending: (session) =>
        set((state) => ({ pending: state.pending.filter((item) => item !== session) })),
    }),
    {
      name: "portfolio-storage",
      storage: createJSONStorage(() => accountStorage),
      skipHydration: true,
    },
  ),
);
