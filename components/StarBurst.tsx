import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

// A burst of stars flying out from the middle: a right answer, the PASS stamp.
// Change `trigger` (e.g. +1) to fire it again; 0 shows nothing.

const COLORS = ["#FFC531", "#FF6B9A", "#7C5CFF", "#3DD68C", "#FF8A3D"];

interface StarBurstProps {
  trigger: number;
  /** How far the stars fly, in points. */
  distance?: number;
  count?: number;
}

export function StarBurst({ trigger, distance = 110, count = 12 }: StarBurstProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!trigger) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [trigger, progress]);

  if (!trigger) return null;
  return (
    <View pointerEvents="none" style={styles.center}>
      {Array.from({ length: count }, (_, index) => (
        <Star key={index} index={index} count={count} distance={distance} progress={progress} />
      ))}
    </View>
  );
}

function Star({
  index,
  count,
  distance,
  progress,
}: {
  index: number;
  count: number;
  distance: number;
  progress: SharedValue<number>;
}) {
  // Evenly around the circle, every other star a little further and bigger.
  const angle = (index / count) * Math.PI * 2 + (index % 2 ? 0.2 : 0);
  const reach = distance * (index % 2 ? 1 : 0.75);
  const size = index % 2 ? 22 : 16;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p === 0 ? 0 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
      transform: [
        { translateX: Math.cos(angle) * reach * p },
        // A little upward float, like confetti.
        { translateY: Math.sin(angle) * reach * p - 20 * p },
        { scale: 0.4 + p * 0.8 },
        { rotate: `${p * 180 * (index % 2 ? 1 : -1)}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.star, style]}>
      <Ionicons name="star" size={size} color={COLORS[index % COLORS.length]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Zero-size anchor in the middle of the parent; the stars fly out from it.
  center: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  star: {
    position: "absolute",
  },
});
