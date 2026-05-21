import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { isLanguageAvailable } from "@/data/languages";
import { useLanguageStore } from "@/store/languageStore";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { selectedLanguage } = useLanguageStore();
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

  if (!selectedLanguage || !isLanguageAvailable(selectedLanguage)) {
    return <Redirect href="/language-select" />;
  }

  return <Redirect href="/(tabs)" />;
}
