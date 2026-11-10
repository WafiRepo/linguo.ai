import { useAuth } from "@clerk/expo";
import { type Href, Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { isLanguageAvailable } from "@/data/languages";
import { useChildProfileStore } from "@/store/childProfileStore";
import { useLanguageStore } from "@/store/languageStore";
import { usePortfolioStore } from "@/store/portfolioStore";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { selectedLanguage } = useLanguageStore();
  const { nickname, classGroup } = useChildProfileStore();
  const { role, roleChosen } = usePortfolioStore();
  const isStaff = role === "teacher" || role === "admin";
  const [languageHydrated, setLanguageHydrated] = useState(
    useLanguageStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (languageHydrated) return;
    return useLanguageStore.persist.onFinishHydration(() => {
      const current = useLanguageStore.getState().selectedLanguage;
      if (current && !isLanguageAvailable(current)) {
        useLanguageStore.getState().clearSelectedLanguage();
      }
      setLanguageHydrated(true);
    });
  }, [languageHydrated]);

  if (!isLoaded || !languageHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6c4ef5" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  // Student or Teacher, chosen once after sign-up.
  if (!roleChosen) {
    return <Redirect href={"/role-select" as Href} />;
  }

  if (!selectedLanguage || !isLanguageAvailable(selectedLanguage)) {
    return <Redirect href="/language-select" />;
  }

  // Teachers don't need a child profile (nickname + grade).
  if (!isStaff && (!nickname || !classGroup)) {
    return <Redirect href={"/child-profile-setup" as Href} />;
  }

  return <Redirect href="/(tabs)" />;
}
