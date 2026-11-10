import { setAccountStorageWritable } from "@/lib/accountStorage";
import { useChildProfileStore } from "@/store/childProfileStore";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { usePortfolioStore } from "@/store/portfolioStore";

export async function loadLearningAccount(account: string) {
  setAccountStorageWritable(false);
  useLanguageStore.setState(useLanguageStore.getInitialState(), true);
  useLearningStore.setState(useLearningStore.getInitialState(), true);
  useChildProfileStore.setState(useChildProfileStore.getInitialState(), true);
  usePortfolioStore.setState(usePortfolioStore.getInitialState(), true);
  // Do not assign legacy, unowned data to an arbitrary first login.
  useLanguageStore.persist.setOptions({ name: `language-v2:${account}` });
  useLearningStore.persist.setOptions({ name: `learning-v2:${account}` });
  useChildProfileStore.persist.setOptions({ name: `child-profile-v1:${account}` });
  usePortfolioStore.persist.setOptions({ name: `portfolio-v1:${account}` });
  await Promise.all([
    useLanguageStore.persist.rehydrate(),
    useLearningStore.persist.rehydrate(),
    useChildProfileStore.persist.rehydrate(),
    usePortfolioStore.persist.rehydrate(),
  ]);
  if (
    !useLanguageStore.persist.hasHydrated() ||
    !useLearningStore.persist.hasHydrated() ||
    !useChildProfileStore.persist.hasHydrated()
  ) {
    throw new Error("Storage hydration failed");
  }
}

// F15: local data deletion, distinct from deleting the guardian's account
// (Clerk) or requesting vendor-side deletion (Stream/OpenAI) — those need a
// separate, documented request, not just a local wipe.
export function resetCurrentAccountData() {
  setAccountStorageWritable(true);
  useLanguageStore.setState(useLanguageStore.getInitialState(), true);
  useLearningStore.setState(useLearningStore.getInitialState(), true);
  useChildProfileStore.setState(useChildProfileStore.getInitialState(), true);
  usePortfolioStore.setState(usePortfolioStore.getInitialState(), true);
}
