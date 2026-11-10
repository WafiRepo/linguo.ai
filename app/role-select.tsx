import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { ApiError } from "@/lib/api";
import { TranslationKey, useT } from "@/lib/i18n";
import { chooseRole, fetchRole } from "@/lib/role";
import { usePortfolioStore } from "@/store/portfolioStore";

type Choice = "student" | "teacher";

const OPTIONS: { value: Choice; icon: keyof typeof Ionicons.glyphMap; title: TranslationKey; body: TranslationKey }[] = [
  { value: "student", icon: "school-outline", title: "role.student", body: "role.studentBody" },
  { value: "teacher", icon: "people-outline", title: "role.teacher", body: "role.teacherBody" },
];

// Shown once after sign-up / first sign-in on this device: Student or Teacher.
// Teachers need the school's teacher code, checked on the server.
export default function RoleSelectScreen() {
  const { t } = useT();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const { setRole, setRoleChosen } = usePortfolioStore();

  const [checking, setChecking] = useState(true);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  // An account that is already a teacher (e.g. on a new phone) skips this step.
  useEffect(() => {
    fetchRole(() => getTokenRef.current())
      .then((role) => {
        if (role === "teacher" || role === "admin") {
          setRole(role);
          setRoleChosen(true);
          router.replace("/" as Href);
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [setRole, setRoleChosen]);

  const canSubmit = choice === "student" || (choice === "teacher" && code.trim().length > 0);

  async function handleSubmit() {
    if (!choice || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const role = await chooseRole(() => getTokenRef.current(), choice, choice === "teacher" ? code : undefined);
      setRole(role);
      setRoleChosen(true);
      router.replace("/" as Href);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? "role.wrongCode" : "common.tryAgain");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text className="mt-6 font-poppins-semibold text-[26px] leading-9 text-text-primary">{t("role.title")}</Text>
          <Text className="mt-2 font-poppins text-sm leading-6 text-text-secondary">{t("role.subtitle")}</Text>

          <View className="mt-6 gap-3">
            {OPTIONS.map((option) => {
              const selected = choice === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  testID={`role-${option.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  activeOpacity={0.85}
                  onPress={() => {
                    setChoice(option.value);
                    setError(null);
                  }}
                  className={`flex-row items-center rounded-[20px] border px-4 py-4 ${
                    selected ? "bg-lingua-purple/10 border-lingua-purple" : "bg-white border-border"
                  }`}
                >
                  <View className="w-12 h-12 rounded-full bg-surface items-center justify-center">
                    <Ionicons name={option.icon} size={24} color={colors.primary.purple} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-poppins-semibold text-base text-text-primary">{t(option.title)}</Text>
                    <Text className="mt-0.5 font-poppins text-sm leading-5 text-text-secondary">{t(option.body)}</Text>
                  </View>
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={selected ? colors.primary.purple : "#c4c4cc"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {choice === "teacher" ? (
            <>
              <Text className="mt-6 mb-2 font-poppins-semibold text-base text-text-primary">{t("role.codeLabel")}</Text>
              <TextInput
                testID="role-teacher-code"
                value={code}
                onChangeText={(value) => {
                  setCode(value);
                  setError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={40}
                placeholder={t("role.codePlaceholder")}
                placeholderTextColor="#9ca3af"
                className="bg-surface rounded-2xl px-4 py-4 font-poppins text-base text-text-primary"
              />
            </>
          ) : null}

          {error ? <Text className="mt-3 font-poppins text-sm leading-5 text-[#dc2626]">{t(error)}</Text> : null}
        </ScrollView>

        <View className="px-5 pb-5 pt-2">
          <TouchableOpacity
            testID="role-continue"
            disabled={!canSubmit || saving}
            onPress={handleSubmit}
            activeOpacity={0.85}
            className="rounded-2xl items-center py-4"
            style={{ backgroundColor: canSubmit ? colors.primary.purple : colors.neutral.border }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-poppins-semibold text-base text-white">{t("common.continue")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
