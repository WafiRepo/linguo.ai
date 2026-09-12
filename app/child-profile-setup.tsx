import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import {
  CHILD_CLASS_GROUP_LABELS,
  ChildClassGroup,
  useChildProfileStore,
} from "@/store/childProfileStore";

const CLASS_GROUPS = (
  Object.keys(CHILD_CLASS_GROUP_LABELS) as ChildClassGroup[]
).map((value) => ({ value, label: CHILD_CLASS_GROUP_LABELS[value] }));

// F03: minimal profile only — nickname + class group, filled in by a
// guardian. No email, national ID, birth date, photo, or location.
export default function ChildProfileSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = mode === "edit";
  const { nickname, classGroup, setChildProfile } = useChildProfileStore();
  const [nicknameInput, setNicknameInput] = useState(nickname ?? "");
  const [classGroupInput, setClassGroupInput] = useState<ChildClassGroup | null>(
    classGroup,
  );

  const canSubmit = nicknameInput.trim().length > 0 && classGroupInput !== null;

  function handleSubmit() {
    if (!canSubmit || !classGroupInput) return;
    setChildProfile(nicknameInput, classGroupInput);
    if (isEditMode) {
      router.back();
    } else {
      router.replace("/(tabs)" as Href);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-row items-center px-4 py-3">
          {isEditMode ? (
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={24} color="#001328" />
            </TouchableOpacity>
          ) : (
            <View className="w-8" />
          )}
          <Text className="flex-1 text-center font-poppins-semibold text-lg text-text-primary">
            孩子的學習檔案
          </Text>
          <View className="w-8" />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-poppins text-sm text-text-secondary leading-6">
            請家長協助填寫，僅需暱稱與年級，不需要真實姓名、電話、生日或照片。
          </Text>

          <Text className="font-poppins-semibold text-base text-text-primary mt-6 mb-2">
            暱稱
          </Text>
          <TextInput
            testID="child-profile-nickname"
            value={nicknameInput}
            onChangeText={setNicknameInput}
            maxLength={20}
            placeholder="例如：小美"
            placeholderTextColor="#9ca3af"
            className="bg-surface rounded-2xl px-4 py-4 font-poppins text-base text-text-primary"
          />

          <Text className="font-poppins-semibold text-base text-text-primary mt-6 mb-2">
            年級
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CLASS_GROUPS.map((group) => {
              const selected = classGroupInput === group.value;
              return (
                <TouchableOpacity
                  key={group.value}
                  testID={`child-profile-class-${group.value}`}
                  onPress={() => setClassGroupInput(group.value)}
                  activeOpacity={0.85}
                  className={`rounded-2xl border px-5 py-3 ${
                    selected
                      ? "bg-primary-purple/10 border-primary-purple"
                      : "bg-white border-border"
                  }`}
                >
                  <Text
                    className={`font-poppins-semibold text-sm ${
                      selected ? "text-lingua-purple" : "text-text-primary"
                    }`}
                  >
                    {group.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View className="px-5 pb-5 pt-2">
          <TouchableOpacity
            testID="child-profile-save"
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.85}
            className="rounded-2xl items-center py-4"
            style={{
              backgroundColor: canSubmit
                ? colors.primary.purple
                : colors.neutral.border,
            }}
          >
            <Text className="font-poppins-semibold text-base text-white">
              {isEditMode ? "儲存" : "開始學習"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
