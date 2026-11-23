import { images } from "@/constants/images";
import { posthog } from "@/lib/posthog";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Image } from "@/components/Image";
import { SafeAreaView } from "react-native-safe-area-context";
import { translate } from "@/lib/i18n";

// The first screen, before anyone picks a language: Mandarin first (the
// learners' language), with an English line under each text.
const zh = (key: Parameters<typeof translate>[1]) => translate("zh-TW", key);
const en = (key: Parameters<typeof translate>[1]) => translate("en", key);

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View className="flex-1 px-6">
        {/* Logo header */}
        <View className="flex-row items-center justify-center gap-2 mt-4">
          <Image source={images.mascotLogo} className="w-10 h-10" />
          <Text className="font-poppins-semibold text-xl text-text-primary">
            Bicara AI
          </Text>
        </View>

        {/* Hero heading: Mandarin, then English */}
        <Text className="h1 mt-8">
          {zh("onboarding.heading")}
          <Text className="text-lingua-purple">{zh("home.indonesian")}</Text>
        </Text>
        <Text className="font-poppins-medium text-base text-text-secondary mt-1">
          {en("onboarding.heading").trim()} <Text className="text-lingua-purple">{en("home.indonesian")}</Text>
        </Text>

        {/* Subtitle: Mandarin, then English */}
        <Text className="body-md text-text-secondary mt-3">
          {zh("onboarding.subtitle")}
        </Text>
        <Text className="font-poppins text-xs text-text-secondary mt-1">
          {en("onboarding.subtitle")}
        </Text>

        {/* Mascot illustration with speech bubbles */}
        <View className="flex-1 mt-4">
          <Image
            source={images.mascotWelcome}
            className="flex-1 w-full"
            resizeMode="contain"
          />

          <View
            className="absolute bg-white rounded-2xl px-4 py-2.5 left-0 top-[35%]"
            style={styles.shadow}
          >
            <Text className="font-poppins-medium text-sm text-text-primary">
              Halo!
            </Text>
          </View>

          <View
            className="absolute bg-white rounded-2xl px-4 py-2.5 right-0 top-[10%]"
            style={styles.shadow}
          >
            <Text className="font-poppins-medium text-sm text-text-primary">
              Apa kabar?
            </Text>
          </View>

          <View
            className="absolute bg-white rounded-2xl px-4 py-2.5 right-5 top-[60%]"
            style={styles.shadow}
          >
            <Text className="font-poppins-medium text-sm text-error">
              {zh("onboarding.hello")}
            </Text>
            <Text className="font-poppins text-xs text-error">
              {en("onboarding.hello")}
            </Text>
          </View>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          className="bg-lingua-purple rounded-2xl flex-row items-center justify-center mt-2 mb-6 py-3"
          activeOpacity={0.85}
          testID="get-started-button"
          onPress={() => {
            posthog.capture("onboarding_get_started_tapped");
            router.push("/(auth)/sign-up");
          }}
        >
          <View className="items-center">
            <Text className="font-poppins-semibold text-base text-white">
              {zh("onboarding.start")}
            </Text>
            <Text className="font-poppins text-xs text-white/80">
              {en("onboarding.start")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});
