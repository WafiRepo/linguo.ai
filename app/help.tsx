import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { TranslationKey, useT } from "@/lib/i18n";

type HelpTopic = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

// F16: help in simple language, reachable without typing anything sensitive.
const TOPICS: HelpTopic[] = [
  {
    icon: "mic-outline",
    titleKey: "help.mic.title",
    bodyKey: "help.mic.body",
  },
  {
    icon: "wifi-outline",
    titleKey: "help.network.title",
    bodyKey: "help.network.body",
  },
  {
    icon: "refresh-outline",
    titleKey: "help.progress.title",
    bodyKey: "help.progress.body",
  },
  {
    icon: "people-outline",
    titleKey: "help.adult.title",
    bodyKey: "help.adult.body",
  },
];

export default function HelpScreen() {
  const { t } = useT();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
      edges={["top", "left", "right"]}
    >
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-8 h-8 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color="#001328" />
        </TouchableOpacity>
        <Text className="flex-1 text-center font-poppins-semibold text-lg text-text-primary">
          {t("help.title")}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {TOPICS.map((topic) => (
          <View
            key={topic.titleKey}
            className="flex-row bg-white rounded-3xl border border-border p-5 mb-4"
          >
            <View className="w-11 h-11 rounded-2xl bg-purple-50 items-center justify-center mr-3">
              <Ionicons name={topic.icon} size={22} color={colors.primary.purple} />
            </View>
            <View className="flex-1">
              <Text className="font-poppins-semibold text-base text-text-primary mb-1">
                {t(topic.titleKey)}
              </Text>
              <Text className="font-poppins text-sm leading-6 text-text-secondary">
                {t(topic.bodyKey)}
              </Text>
            </View>
          </View>
        ))}
        <Text className="font-poppins text-xs leading-5 text-text-secondary text-center mt-2">
          {t("help.footer")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
