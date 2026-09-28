import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useT } from "@/lib/i18n";

export function AIPilotNotice() {
  const router = useRouter();
  const { t } = useT();
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View className="flex-1 items-center justify-center gap-5 px-6">
      <Ionicons name="book-outline" size={56} color="#6c4ef5" />
      <Text accessibilityRole="header" className="text-center text-2xl font-bold text-text-primary">{t("pilot.title")}</Text>
      <Text className="text-center text-base leading-7 text-text-primary">{t("pilot.body")}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.replace("/(tabs)/learn")} className="min-h-14 items-center justify-center rounded-2xl bg-lingua-purple px-6 py-4"><Text className="text-base font-bold text-white">{t("pilot.button")}</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;
}
