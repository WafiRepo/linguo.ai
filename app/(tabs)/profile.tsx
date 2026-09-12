import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GuardianVerification } from "@/components/GuardianVerification";
import { colors } from "@/constants/theme";
import { LANGUAGES } from "@/data/languages";
import { resetCurrentAccountData } from "@/lib/learningAccount";
import {
  TUTOR_EMOTION_OPTIONS,
  TutorEmotionCode,
} from "@/lib/tutorEmotion";
import {
  TUTOR_VOICE_OPTIONS,
  TutorVoiceCode,
} from "@/lib/instructionLanguage";
import { CHILD_CLASS_GROUP_LABELS, useChildProfileStore } from "@/store/childProfileStore";
import { useLanguageStore } from "@/store/languageStore";

type GuardianAction = "edit-profile" | "delete-data";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { selectedLanguage, tutorVoice, tutorEmotion, setTutorVoice, setTutorEmotion } =
    useLanguageStore();
  const { nickname, classGroup } = useChildProfileStore();
  const [guardianAction, setGuardianAction] = useState<GuardianAction | null>(null);

  function confirmDeleteData() {
    Alert.alert(
      "刪除本機學習紀錄",
      "這會刪除這個帳號在這台裝置上的學習進度、暱稱與年級。無法復原。這只會刪除本機資料，不會刪除家長帳號或雲端服務紀錄。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: () => {
            // Also resets the language selection, so send the guardian back
            // through the normal setup flow (index.tsx redirects from there
            // based on whatever state remains) rather than assuming they
            // only need the child-profile step.
            resetCurrentAccountData();
            router.replace("/" as Href);
          },
        },
      ],
    );
  }

  function handleGuardianVerified() {
    const action = guardianAction;
    setGuardianAction(null);
    if (action === "edit-profile") {
      router.push("/child-profile-setup?mode=edit" as Href);
    } else if (action === "delete-data") {
      confirmDeleteData();
    }
  }

  const language = LANGUAGES.find((l) => l.code === selectedLanguage);
  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "Learner";
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-5 pt-2 pb-4">
        <Text className="font-poppins-semibold text-[22px] text-text-primary">
          我的學習
        </Text>
      </View>

      <View className="px-5 mb-6">
        <View
          className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4"
          style={styles.cardShadow}
        >
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              className="w-14 h-14 rounded-full"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-surface items-center justify-center">
              <Ionicons name="person" size={28} color={colors.neutral.textSecondary} />
            </View>
          )}
          <View className="flex-1 ml-3">
            <Text className="font-poppins-semibold text-base text-text-primary">
              {displayName}
            </Text>
            {email ? (
              <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                {email}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View className="px-5 mb-6">
        <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 uppercase tracking-wide">
          孩子的學習檔案
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          testID="profile-edit-child-profile"
          onPress={() => setGuardianAction("edit-profile")}
          className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4"
          style={styles.cardShadow}
        >
          <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
            <Ionicons name="happy-outline" size={22} color={colors.primary.purple} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="font-poppins-semibold text-base text-text-primary">
              {nickname ?? "尚未設定"}
            </Text>
            <Text className="font-poppins text-sm text-text-secondary mt-0.5">
              {classGroup ? CHILD_CLASS_GROUP_LABELS[classGroup] : "尚未選擇年級"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="font-poppins text-xs text-text-secondary mt-2 px-1">
          修改暱稱或年級需要家長重新驗證。
        </Text>
      </View>

      <View className="px-5">
        {LANGUAGES.length > 1 ? (
          <>
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 uppercase tracking-wide">
              學習設定
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              testID="profile-change-language"
              onPress={() => router.push("/language-select?mode=switch")}
              className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4"
              style={styles.cardShadow}
            >
              {language ? (
                <Image source={{ uri: language.flag }} style={styles.flag} />
              ) : (
                <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
                  <Ionicons
                    name="language"
                    size={22}
                    color={colors.primary.purple}
                  />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="font-poppins-semibold text-base text-text-primary">
                  學習語言
                </Text>
                <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                  {language?.code === "id" ? "印尼語" : language?.name ?? "尚未選擇"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </>
        ) : null}

        {selectedLanguage === "id" ? (
          <>
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 mt-6 uppercase tracking-wide">
              AI Tutor Voice
            </Text>
            <View className="gap-3">
              {TUTOR_VOICE_OPTIONS.map((option) => {
                const selected = tutorVoice === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    activeOpacity={0.8}
                    testID={`profile-tutor-voice-${option.code}`}
                    onPress={() => setTutorVoice(option.code as TutorVoiceCode)}
                    className={`flex-row items-center rounded-[20px] border px-4 py-4 ${
                      selected
                        ? "bg-primary-purple/5 border-primary-purple"
                        : "bg-white border-border"
                    }`}
                    style={styles.cardShadow}
                  >
                    <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
                      <Text className="text-xl">{option.emoji}</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-poppins-semibold text-base text-text-primary">
                        {option.name}
                      </Text>
                      <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                        {option.description}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary.purple}
                      />
                    ) : (
                      <View className="w-[22px] h-[22px] rounded-full border-2 border-border" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {selectedLanguage === "id" ? (
          <>
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 mt-6 uppercase tracking-wide">
              Gaya Guru AI
            </Text>
            <View className="gap-3">
              {TUTOR_EMOTION_OPTIONS.map((option) => {
                const selected = tutorEmotion === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    activeOpacity={0.8}
                    testID={`profile-tutor-emotion-${option.code}`}
                    onPress={() =>
                      setTutorEmotion(option.code as TutorEmotionCode)
                    }
                    className={`flex-row items-center rounded-[20px] border px-4 py-4 ${
                      selected
                        ? "bg-primary-purple/5 border-primary-purple"
                        : "bg-white border-border"
                    }`}
                    style={styles.cardShadow}
                  >
                    <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
                      <Text className="text-xl">{option.emoji}</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-poppins-semibold text-base text-text-primary">
                        {option.name}
                      </Text>
                      <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                        {option.description}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary.purple}
                      />
                    ) : (
                      <View className="w-[22px] h-[22px] rounded-full border-2 border-border" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      <View className="px-5 mt-6">
        <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 uppercase tracking-wide">
          說明與隱私
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          testID="profile-help"
          onPress={() => router.push("/help" as Href)}
          className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4 mb-3"
          style={styles.cardShadow}
        >
          <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
            <Ionicons name="help-buoy-outline" size={22} color={colors.primary.purple} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="font-poppins-semibold text-base text-text-primary">
              說明與求助
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          testID="profile-delete-data"
          onPress={() => setGuardianAction("delete-data")}
          className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4"
          style={styles.cardShadow}
        >
          <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
            <Ionicons name="trash-outline" size={22} color={colors.semantic.error} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="font-poppins-semibold text-base text-text-primary">
              刪除本機學習紀錄
            </Text>
            <Text className="font-poppins text-sm text-text-secondary mt-0.5">
              需要家長驗證。只刪除這台裝置上的資料。
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {guardianAction ? (
        <GuardianVerification
          onCancel={() => setGuardianAction(null)}
          onVerified={handleGuardianVerified}
        />
      ) : null}
    </SafeAreaView>
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
  flag: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
});
