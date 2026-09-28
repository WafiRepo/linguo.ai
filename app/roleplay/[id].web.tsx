import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

// The Stream voice SDK is native-only; this stand-in keeps the web/server
// export from loading it.
export default function RoleplayWebScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-5 justify-center items-center">
        <Ionicons name="mic-off-outline" size={48} color={colors.neutral.textSecondary} />
        <Text className="font-poppins-semibold text-xl text-text-primary mt-4 text-center">
          網頁版暫不提供語音練習
        </Text>
        <Text className="font-poppins text-sm text-text-secondary mt-2 text-center">
          請在手機 App 上和 AI 老師練習。
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          className="mt-6 bg-lingua-purple rounded-2xl px-6 py-3"
        >
          <Text className="font-poppins-semibold text-white">返回</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
