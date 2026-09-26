import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants/theme";
import { RoleplayScenario } from "@/types/roleplay";

interface RoleplayCardProps {
  scenario: RoleplayScenario;
  completed: boolean;
  onPress: () => void;
}

export function RoleplayCard({ scenario, completed, onPress }: RoleplayCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      testID={`roleplay-card-${scenario.id}`}
      className="w-[168px] min-h-[176px] rounded-[20px] p-4 mr-3 justify-between"
      style={{ backgroundColor: scenario.accentColor }}
    >
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <View className="w-12 h-12 rounded-full bg-white items-center justify-center">
            <Text className="text-2xl">{scenario.emoji}</Text>
          </View>
          {completed ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.primary.green} />
          ) : null}
        </View>
        <Text
          className="font-poppins-semibold text-sm leading-5 text-text-primary"
          numberOfLines={2}
        >
          {scenario.title}
        </Text>
        <Text
          className="font-poppins text-[11px] text-text-secondary mt-0.5"
          numberOfLines={1}
        >
          {scenario.subtitle}
        </Text>
      </View>

      <View className="flex-row items-center mt-3">
        <Ionicons name="mic" size={14} color={colors.primary.purple} />
        <Text className="font-poppins-semibold text-xs text-lingua-purple ml-1">
          和 {scenario.aiName} 對話
        </Text>
      </View>
    </TouchableOpacity>
  );
}
