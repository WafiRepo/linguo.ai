import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { WaveHeader } from "@/components/WaveHeader";
import { colors } from "@/constants/theme";
import { TranslationKey, useT } from "@/lib/i18n";

type InfoCard = {
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  highlighted?: boolean;
  testID: string;
};

const CARDS: InfoCard[] = [
  {
    route: "/story" as Href,
    icon: "people",
    titleKey: "story.title",
    bodyKey: "info.story.body",
    highlighted: true,
    testID: "information-open-story",
  },
  {
    route: "/ebooks" as Href,
    icon: "book-outline",
    titleKey: "info.ebook.title",
    bodyKey: "info.ebook.subtitle",
    testID: "information-open-ebooks",
  },
];

// Preserve the route so existing links to the fourth tab continue to work.
export default function InformationScreen() {
  const router = useRouter();
  const { t } = useT();

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <WaveHeader title={t("info.title")} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.testID}
            accessibilityRole="button"
            activeOpacity={0.85}
            testID={card.testID}
            onPress={() => router.push(card.route)}
            className={`flex-row items-center rounded-[24px] px-5 py-6 ${
              card.highlighted ? "bg-[#f1ecff]" : "bg-white border border-[#e4dcff]"
            }`}
            style={styles.softShadow}
          >
            <View
              className={`w-14 h-14 rounded-full items-center justify-center ${
                card.highlighted ? "" : "bg-[#ece6ff]"
              }`}
            >
              <Ionicons name={card.icon} size={32} color={colors.primary.purple} />
            </View>
            <View className="flex-1 ml-4 mr-2">
              <Text className="font-poppins-bold text-xl leading-7 text-text-primary">{t(card.titleKey)}</Text>
              <Text className="font-poppins text-sm leading-5 text-text-secondary mt-1">{t(card.bodyKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary.purple} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ScrollView contentContainerStyle and shadows must stay in StyleSheet.
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 16,
  },
  softShadow: {
    shadowColor: "#6c4ef5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
});
