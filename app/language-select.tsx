import { images } from "@/constants/images";
import { DEFAULT_LANGUAGE_CODE, isLanguageAvailable, LANGUAGES } from "@/data/languages";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { Language, LanguageCode } from "@/types/learning";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LanguageSelectScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSwitchMode = mode === "switch";
  const { selectedLanguage, setSelectedLanguage } = useLanguageStore();
  const [selectedCode, setSelectedCode] = useState<string>(
    selectedLanguage ?? DEFAULT_LANGUAGE_CODE
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedLanguage && isLanguageAvailable(selectedLanguage)) {
      setSelectedCode(selectedLanguage);
      return;
    }
    if (LANGUAGES.length === 1) {
      setSelectedCode(LANGUAGES[0].code);
    }
  }, [selectedLanguage]);

  const filtered = LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleConfirm() {
    const languageCode =
      LANGUAGES.find((lang) => lang.code === selectedCode)?.code ??
      LANGUAGES[0]?.code;

    if (!languageCode) return;

    setSelectedLanguage(languageCode as LanguageCode);

    if (isSwitchMode) {
      router.back();
    } else {
      router.replace("/(tabs)" as Href);
    }

    const selectedLang = LANGUAGES.find((lang) => lang.code === languageCode);
    try {
      if (isSwitchMode) {
        posthog.capture("language_changed", {
          language_code: languageCode,
          language_name: selectedLang?.name ?? languageCode,
          previous_language: selectedLanguage,
        });
      } else {
        posthog.capture("language_selected", {
          language_code: languageCode,
          language_name: selectedLang?.name ?? languageCode,
        });
      }
    } catch {
      // Analytics must not block language selection
    }
  }

  const renderItem = ({ item }: { item: Language }) => {
    const isSelected = item.code === selectedCode;
    return (
      <TouchableOpacity
        onPress={() => setSelectedCode(item.code)}
        className={`flex-row items-center py-3.5 px-3.5 bg-white border-[1.5px] rounded-[14px] ${isSelected ? "bg-[rgba(108,78,245,0.08)] border-lingua-purple" : "border-transparent"}`}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.flag }} style={styles.flag} />
        <View className="flex-1 ml-3">
          <Text className="font-poppins-semibold text-base text-text-primary">
            {item.name}
          </Text>
          <Text className="body-sm text-text-secondary">
            {item.learners} learners
          </Text>
        </View>
        {isSelected ? (
          <View className="w-6.5 h-6.5 rounded-full bg-lingua-purple items-center justify-center">
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          {isSwitchMode ? (
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
            {isSwitchMode ? "Change language" : "Choose a language"}
          </Text>
          <View className="w-8" />
        </View>

        {/* Search */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center bg-surface rounded-2xl px-4 py-3">
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Popular label */}
        <Text className="px-4 font-poppins-semibold text-base text-text-primary mb-2">
          Popular
        </Text>

        {/* Language list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-200" />
          )}
        />
      </View>

      {/* Confirm button — kept above decorative earth image */}
      <View style={styles.footer}>
        <TouchableOpacity
          className="bg-lingua-purple rounded-2xl items-center py-4"
          activeOpacity={0.85}
          testID="language-confirm-button"
          onPress={handleConfirm}
        >
          <Text className="font-poppins-semibold text-base text-white">
            {isSwitchMode ? "Save" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>

      <Image
        source={images.earth}
        style={styles.earthImage}
        resizeMode="cover"
        pointerEvents="none"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flag: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#001328",
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#fff",
    zIndex: 2,
  },
  earthImage: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 130,
    zIndex: 0,
  },
});
