import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily } from "@/constants/theme";

const CIRCLE_SIZE = 52;
const TAB_HEIGHT = 64;

type TabConfig = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabConfig[] = [
  { label: "首頁", icon: "home-outline", activeIcon: "home" },
  { label: "學習教材", icon: "book-outline", activeIcon: "book" },
  { label: "AI 老師", icon: "sparkles-outline", activeIcon: "sparkles" },
  { label: "資訊", icon: "information-circle-outline", activeIcon: "information-circle" },
  { label: "我的學習", icon: "person-outline", activeIcon: "person" },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabWidth = width / TABS.length;

  const indicatorX = useSharedValue(
    state.index * tabWidth + (tabWidth - CIRCLE_SIZE) / 2
  );

  useEffect(() => {
    indicatorX.value = withSpring(
      state.index * tabWidth + (tabWidth - CIRCLE_SIZE) / 2,
      { damping: 18, stiffness: 160 }
    );
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 8 }]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {state.routes.map((route, index) => {
        const tab = TABS[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isFocused }}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFocused ? tab.activeIcon : tab.icon}
              size={22}
              color={isFocused ? "#fff" : colors.neutral.textSecondary}
            />
            {!isFocused && (
              <Text style={styles.label} numberOfLines={2}>
                {tab.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.neutral.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  indicator: {
    position: "absolute",
    top: (TAB_HEIGHT - CIRCLE_SIZE) / 2,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.primary.purple,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_HEIGHT,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 3,
    textAlign: "center",
    paddingHorizontal: 2,
  },
});
