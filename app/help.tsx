import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

type HelpTopic = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

// F16: help in simple language, reachable without typing anything sensitive.
const TOPICS: HelpTopic[] = [
  {
    icon: "mic-outline",
    title: "麥克風沒有聲音",
    body: "請確認手機有開啟麥克風權限。如果還是不行，可以先不用說話，改用文字練習，並告訴老師或家長。",
  },
  {
    icon: "wifi-outline",
    title: "網路連不上",
    body: "請檢查 Wi-Fi 或行動網路是否開啟。沒有網路時，已經下載好的練習還是可以使用；AI 老師需要網路才能開始。",
  },
  {
    icon: "refresh-outline",
    title: "學習進度不見了",
    body: "請不要重新安裝或清除 App 資料，進度可能會消失。如果進度看起來不對，請告訴老師或家長，一起檢查。",
  },
  {
    icon: "people-outline",
    title: "想要找老師或家長幫忙",
    body: "遇到不懂的地方，或是有任何讓你不舒服的內容，都可以直接告訴身邊的老師或家長，不需要自己在 App 裡打字說明。",
  },
];

export default function HelpScreen() {
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
          說明與求助
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {TOPICS.map((topic) => (
          <View
            key={topic.title}
            className="flex-row bg-white rounded-3xl border border-border p-5 mb-4"
          >
            <View className="w-11 h-11 rounded-2xl bg-purple-50 items-center justify-center mr-3">
              <Ionicons name={topic.icon} size={22} color={colors.primary.purple} />
            </View>
            <View className="flex-1">
              <Text className="font-poppins-semibold text-base text-text-primary mb-1">
                {topic.title}
              </Text>
              <Text className="font-poppins text-sm leading-6 text-text-secondary">
                {topic.body}
              </Text>
            </View>
          </View>
        ))}
        <Text className="font-poppins text-xs leading-5 text-text-secondary text-center mt-2">
          這裡只提供一般說明，不會收集你輸入的任何個人資料。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
