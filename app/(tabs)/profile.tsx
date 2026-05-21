import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { LANGUAGES } from "@/data/languages";
import {
  TUTOR_EMOTION_OPTIONS,
  TutorEmotionCode,
} from "@/lib/tutorEmotion";
import {
  TUTOR_VOICE_OPTIONS,
  TutorVoiceCode,
} from "@/lib/instructionLanguage";
import { useLanguageStore } from "@/store/languageStore";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { selectedLanguage, tutorVoice, tutorEmotion, setTutorVoice, setTutorEmotion } =
    useLanguageStore();

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
      <View className="px-5 pt-2 pb-4">
        <Text className="font-poppins-semibold text-[22px] text-text-primary">
          Profile
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

      <View className="px-5">
        {LANGUAGES.length > 1 ? (
          <>
            <Text className="font-poppins-semibold text-sm text-text-secondary mb-2 uppercase tracking-wide">
              Learning
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
                  Learning language
                </Text>
                <Text className="font-poppins text-sm text-text-secondary mt-0.5">
                  {language?.name ?? "Not selected"}
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
