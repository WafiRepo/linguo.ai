import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AIPilotNotice() {
  const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View className="flex-1 items-center justify-center gap-5 px-6">
      <Ionicons name="book-outline" size={56} color="#6c4ef5" />
      <Text accessibilityRole="header" className="text-center text-2xl font-bold text-text-primary">先來看看學習教材吧！</Text>
      <Text className="text-center text-base leading-7 text-text-primary">AI 語音練習還在準備中。目前不會開啟麥克風或相機。你可以先閱讀教材，和老師一起練習。</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.replace("/(tabs)/learn")} className="min-h-14 items-center justify-center rounded-2xl bg-lingua-purple px-6 py-4"><Text className="text-base font-bold text-white">前往學習教材</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;
}
