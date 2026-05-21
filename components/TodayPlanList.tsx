import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants/theme";
import { TodayPlanItem } from "@/lib/todayPlan";

interface TodayPlanListProps {
  items: TodayPlanItem[];
  onItemPress: (item: TodayPlanItem) => void;
  showXpHint?: boolean;
}

export function TodayPlanList({
  items,
  onItemPress,
  showXpHint = false,
}: TodayPlanListProps) {
  return (
    <View
      className="bg-white rounded-[20px] border border-border overflow-hidden"
      style={styles.cardShadow}
    >
      {items.map((item, index) => (
        <View key={item.id}>
          {index > 0 ? <View className="h-px bg-border mx-4" /> : null}
          <TouchableOpacity
            activeOpacity={0.75}
            testID={`today-plan-item-${item.id}`}
            onPress={() => onItemPress(item)}
            className="flex-row items-center px-4 py-[14px]"
          >
            <View
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: item.iconBg }}
            >
              <Ionicons name={item.icon} size={20} color={item.iconColor} />
            </View>
            <View className="flex-1 ml-3 mr-2">
              <Text className="font-poppins-semibold text-sm text-text-primary mb-0.5">
                {item.title}
              </Text>
              <Text className="font-poppins text-xs text-text-secondary">
                {item.subtitle}
              </Text>
              {showXpHint ? (
                <Text className="font-poppins-medium text-[11px] text-lingua-blue mt-1">
                  {item.xpHint}
                </Text>
              ) : null}
            </View>
            {item.completed ? (
              <View className="w-[26px] h-[26px] rounded-full bg-lingua-blue items-center justify-center">
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.neutral.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});
