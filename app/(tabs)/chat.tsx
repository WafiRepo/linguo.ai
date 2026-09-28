import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { INDONESIAN_EBOOK_URL } from "@/constants/resources";
import { useT } from "@/lib/i18n";

// Preserve the route so existing links to the fourth tab continue to work.
export default function InformationScreen() {
  const [opening, setOpening] = useState(false);
  const { t } = useT();
  const [error, setError] = useState(false);

  // Opens the official e-book site directly; no guardian step (requirement F04/F19).
  async function openBooks() {
    setOpening(true);
    setError(false);
    try {
      const network = await NetInfo.fetch();
      if (network.isConnected === false || network.isInternetReachable === false) throw new Error("offline");
      await Linking.openURL(INDONESIAN_EBOOK_URL);
    } catch {
      setError(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text accessibilityRole="header" className="text-2xl font-bold text-text-primary">{t("info.title")}</Text>
        <View className="mt-6 rounded-3xl bg-purple-50 p-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-white">
            <Ionicons name="book-outline" size={34} color={colors.primary.purple} />
          </View>
          <Text accessibilityRole="header" className="text-2xl font-bold text-text-primary">{t("info.ebook.title")}</Text>
          <Text className="mt-3 text-base leading-7 text-text-primary">{t("info.ebook.body")}</Text>
        </View>
        <View className="mt-5 rounded-3xl border border-border bg-white p-5">
          <Text className="text-sm font-semibold text-lingua-purple">{t("info.site.org")}</Text>
          <Text accessibilityRole="header" className="mt-2 text-xl font-bold text-text-primary">{t("info.site.name")}</Text>
          <Text className="mt-3 text-base leading-7 text-text-primary">{t("info.site.body")}</Text>
          <View className="mt-5 gap-3 rounded-2xl bg-purple-50 p-4">
            <Text className="text-base leading-7 text-text-primary">{t("info.step1")}</Text>
            <Text className="text-base leading-7 text-text-primary">{t("info.step2")}</Text>
            <Text className="text-base leading-7 text-text-primary">{t("info.step3")}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("info.open")} accessibilityHint={t("info.openHint")} accessibilityState={{ disabled: opening, busy: opening }} disabled={opening} testID="information-open-ebooks" onPress={openBooks} className="mt-5 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-lingua-purple px-4 py-4">
            {opening ? <ActivityIndicator color="#fff" /> : <Ionicons name="open-outline" size={20} color="#fff" />}
            <Text className="text-base font-bold text-white">{opening ? t("info.opening") : error ? t("common.retry") : t("info.open")}</Text>
          </TouchableOpacity>
          {error ? <Text accessibilityRole="alert" selectable className="mt-3 text-base leading-6 text-red-700">{t("info.error")}</Text> : null}
          <Text className="mt-4 text-sm leading-6 text-text-secondary">{t("info.footer")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
