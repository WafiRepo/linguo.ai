import "../global.css";
import { AccountStorageGate } from "@/components/AccountStorageGate";

import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { MAX_CONTENT_WIDTH } from "@/lib/layout";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
  });


  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);


  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <AccountStorageGate>
        {/* iPad / desktop: a centred column; on phones it is the full screen. */}
        <View style={styles.page}>
        <View style={styles.column}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="role-select" />
          <Stack.Screen name="language-select" />
          <Stack.Screen name="child-profile-setup" />
          <Stack.Screen name="help" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="practice/[id]" />
          <Stack.Screen name="roleplay/[id]" />
          <Stack.Screen name="learning-material/[id]" />
          <Stack.Screen name="today-plan" />
          <Stack.Screen name="story" />
          <Stack.Screen name="ebooks" />
          <Stack.Screen name="portfolio" />
          <Stack.Screen name="certificates" />
        </Stack>
        </View>
        </View>
        </AccountStorageGate>
      </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#EEEAFB",
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
});
