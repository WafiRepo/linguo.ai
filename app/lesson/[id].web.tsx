import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function LessonWebScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-5 justify-center items-center">
        <Ionicons name="mic-off-outline" size={48} color={colors.neutral.textSecondary} />
        <Text className="font-poppins-semibold text-xl text-text-primary mt-4 text-center">
          Voice lessons are not available on web
        </Text>
        <Text className="font-poppins text-sm text-text-secondary mt-2 text-center">
          Open this lesson on the Android or iOS app to talk with the AI teacher.
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          className="mt-6 bg-primary-purple rounded-2xl px-6 py-3"
        >
          <Text className="font-poppins-semibold text-white">Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
