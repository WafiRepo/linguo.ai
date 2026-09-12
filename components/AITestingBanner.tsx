import { Text, View } from "react-native";

import { AI_TESTING_ACTIVE } from "@/constants/releaseSafety";

// Shown wherever CHILD_AI_RELEASE_READY is gating a live AI screen, so a
// build unlocked via the dev/testing escape hatches (constants/releaseSafety.ts)
// can never be mistaken for one that passed the P0 AI safety checklist.
export function AITestingBanner() {
  if (!AI_TESTING_ACTIVE) return null;

  return (
    <View style={{ backgroundColor: "#b91c1c", paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text
        style={{ color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" }}
        accessibilityRole="alert"
      >
        測試版：AI 安全審查尚未完成，請勿提供給學生使用
      </Text>
    </View>
  );
}
