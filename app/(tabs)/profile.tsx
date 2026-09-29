import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { LANGUAGES } from "@/data/languages";
import { resetCurrentAccountData } from "@/lib/learningAccount";
import { TUTOR_EMOTION_OPTIONS } from "@/lib/tutorEmotion";
import { TUTOR_VOICE_OPTIONS } from "@/lib/instructionLanguage";
import { useChildProfileStore } from "@/store/childProfileStore";
import { useLanguageStore } from "@/store/languageStore";
import { useT } from "@/lib/i18n";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useT();
  const { selectedLanguage, tutorVoice, tutorEmotion, setTutorVoice, setTutorEmotion } =
    useLanguageStore();
  const { nickname, classGroup } = useChildProfileStore();

  // No guardian re-verification (requirement F04); the delete confirmation
  // dialog below is the remaining guard against an accidental tap.
  function confirmDeleteData() {
    Alert.alert(
      t("profile.deleteData"),
      t("profile.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
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

  const language = LANGUAGES.find((l) => l.code === selectedLanguage);
  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? t("profile.learnerFallback");
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
          {t("profile.title")}
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
          {t("profile.childSection")}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          testID="profile-edit-child-profile"
          onPress={() => router.push("/child-profile-setup?mode=edit" as Href)}
          className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4"
          style={styles.cardShadow}
        >
          <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
            <Ionicons name="happy-outline" size={22} color={colors.primary.purple} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="font-poppins-semibold text-base text-text-primary">
              {nickname ?? t("profile.notSet")}
            </Text>
            <Text className="font-poppins text-sm text-text-secondary mt-0.5">
              {classGroup ? t(`grade.${classGroup}`) : t("profile.noGrade")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View className="px-5">
        {LANGUAGES.length > 1 ? (
          <>
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 uppercase tracking-wide">
              {t("profile.settings")}
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
                  {t("profile.learningLanguage")}
                </Text>
                <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                  {language?.code === "id" ? t("home.indonesian") : language?.name ?? t("profile.notChosen")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </>
        ) : null}

        {selectedLanguage === "id" ? (
          <>
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 mt-6 uppercase tracking-wide">
              {t("profile.tutorVoice")}
            </Text>
            <View className="gap-3">
              {TUTOR_VOICE_OPTIONS.map((option) => {
                const selected = tutorVoice === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    activeOpacity={0.8}
                    testID={`profile-tutor-voice-${option.code}`}
                    onPress={() => setTutorVoice(option.code)}
                    className={`flex-row items-center rounded-[20px] border px-4 py-4 ${
                      selected
                        ? "bg-lingua-purple/5 border-lingua-purple"
                        : "bg-white border-border"
                    }`}
                    style={styles.cardShadow}
                  >
                    <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
                      <Text className="text-xl">{option.emoji}</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-poppins-semibold text-base text-text-primary">
                        {t(`tutorVoice.${option.code}.name`)}
                      </Text>
                      <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                        {t(`tutorVoice.${option.code}.description`)}
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
              {t("profile.tutorStyle")}
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
                      setTutorEmotion(option.code)
                    }
                    className={`flex-row items-center rounded-[20px] border px-4 py-4 ${
                      selected
                        ? "bg-lingua-purple/5 border-lingua-purple"
                        : "bg-white border-border"
                    }`}
                    style={styles.cardShadow}
                  >
                    <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
                      <Text className="text-xl">{option.emoji}</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-poppins-semibold text-base text-text-primary">
                        {t(`tutorEmotion.${option.code}.name`)}
                      </Text>
                      <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                        {t(`tutorEmotion.${option.code}.description`)}
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
          {t("profile.helpSection")}
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
              {t("profile.help")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          testID="profile-delete-data"
          onPress={confirmDeleteData}
          className="flex-row items-center bg-white rounded-[20px] border border-border px-4 py-4"
          style={styles.cardShadow}
        >
          <View className="w-11 h-11 rounded-full bg-surface items-center justify-center">
            <Ionicons name="trash-outline" size={22} color={colors.semantic.error} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="font-poppins-semibold text-base text-text-primary">
              {t("profile.deleteData")}
            </Text>
            <Text className="font-poppins text-sm text-text-secondary mt-0.5">
              {t("profile.deleteDataHint")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      </ScrollView>
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
