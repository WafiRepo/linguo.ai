import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { accountStorage } from "@/lib/accountStorage";
import { NewSessionResult } from "@/types/portfolio";

// Session results waiting to be uploaded to the portfolio database.
// Kept on the phone so a result is not lost when the student is offline;
// lib/portfolio.ts uploads and removes them.
interface PortfolioState {
  pending: NewSessionResult[];
  addPending: (session: NewSessionResult) => void;
  removePending: (clientId: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      pending: [],
      addPending: (session) =>
        set((state) => ({ pending: [...state.pending, session].slice(-50) })),
      removePending: (clientId) =>
        set((state) => ({ pending: state.pending.filter((item) => item.clientId !== clientId) })),
    }),
    {
      name: "portfolio-storage",
      storage: createJSONStorage(() => accountStorage),
      skipHydration: true,
    },
  ),
);
