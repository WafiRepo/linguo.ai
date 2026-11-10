import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface WaveHeaderProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
}

// Purple header with a soft wave at the bottom (Info and story screens).
// It draws behind the status bar, so screens use it instead of a top safe area.
export function WaveHeader({ title, onBack, backLabel = "Back" }: WaveHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <View>
        <Svg
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <Defs>
            <LinearGradient id="waveHeader" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#8b6cf6" />
              <Stop offset="1" stopColor="#6c4ef5" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#waveHeader)" />
        </Svg>
        <View className="flex-row items-center px-5 pb-2" style={{ paddingTop: insets.top + 12 }}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={onBack}
              hitSlop={12}
              className="mr-2"
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            className={`flex-1 font-poppins-semibold text-white ${onBack ? "text-xl text-center mr-9" : "text-3xl"}`}
          >
            {title}
          </Text>
        </View>
      </View>
      <Svg width="100%" height={34} viewBox="0 0 400 34" preserveAspectRatio="none">
        <Path d="M0 0 H400 V12 C330 38 250 4 170 18 C100 30 50 32 0 20 Z" fill="#7b5cf5" />
      </Svg>
    </View>
  );
}
