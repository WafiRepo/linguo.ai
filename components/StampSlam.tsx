import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { StarBurst } from "@/components/StarBurst";
import { images } from "@/constants/images";
import { playSfx } from "@/lib/sfx";

// The PASS stamp: it drops from above, lands with a "DUK!" (sound, a little
// shake, a haptic bump), throws stars, and a happy fanfare plays.

export function StampSlam({ size = 64 }: { size?: number }) {
  const drop = useSharedValue(0); // 0: high above, 1: landed
  const shake = useSharedValue(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const landed = () => {
      playSfx("stamp", 0.9);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setBurst((value) => value + 1);
      setTimeout(() => playSfx("tada", 0.6), 180);
    };
    drop.value = withDelay(
      350,
      withTiming(1, { duration: 320 }, (finished) => {
        if (!finished) return;
        runOnJS(landed)();
        shake.value = withSequence(
          withTiming(1, { duration: 50 }),
          withTiming(-1, { duration: 50 }),
          withTiming(0.6, { duration: 50 }),
          withSpring(0, { damping: 6 }),
        );
      }),
    );
  }, [drop, shake]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: drop.value === 0 ? 0 : 1,
    transform: [
      { translateX: shake.value * 4 },
      { scale: 2.6 - drop.value * 1.6 },
      { rotate: `${-28 + drop.value * 20}deg` },
    ],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <StarBurst trigger={burst} distance={size * 1.3} count={10} />
      <Animated.View style={stampStyle}>
        <Image source={images.stampPass} contentFit="contain" style={{ width: size, height: size }} />
      </Animated.View>
    </View>
  );
}
