import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Image } from "@/components/Image";

import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { useT } from "@/lib/i18n";
import { classTopicRoute, getReviewTopic } from "@/lib/topicProgress";
import { useLearningStore } from "@/store/learningStore";
import { usePortfolioStore } from "@/store/portfolioStore";

/**
 * Today's plan once every topic has the PASS stamp: well done, the
 * certificates, and the topic with the lowest Role Play score to try again.
 */
export function AllTopicsDoneCard() {
  const { t } = useT();
  const router = useRouter();
  const scores = useLearningStore((s) => s.rolePlayBestScores);
  const role = usePortfolioStore((s) => s.role);
  // Teachers have no certificates, so they don't get the button.
  const showCertificates = role !== "teacher" && role !== "admin";
  const reviewTopic = getReviewTopic(scores);
  const bestScore = reviewTopic ? scores[reviewTopic.id] : undefined;
  const onOpenCertificates = () => router.push("/certificates" as Href);
  const onReviewTopic = (topicId: string) => router.push(classTopicRoute(topicId, "roleplay") as Href);

  return (
    <View className="bg-white rounded-[20px] border border-border overflow-hidden" style={styles.cardShadow}>
      <View className="flex-row items-center px-4 pt-4 pb-3">
        <Image source={images.stampPass} className="w-14 h-14" resizeMode="contain" />
        <View className="flex-1 ml-3">
          <Text className="font-poppins-semibold text-[15px] text-text-primary">{t("home.allDoneTitle")}</Text>
          <Text className="font-poppins text-xs text-text-secondary mt-0.5">{t("home.allDoneBody")}</Text>
        </View>
      </View>

      {showCertificates ? (
        <TouchableOpacity
          className="mx-4 mb-4 h-11 rounded-xl bg-lingua-purple items-center justify-center"
          activeOpacity={0.85}
          testID="all-done-certificates"
          onPress={onOpenCertificates}
        >
          <Text className="font-poppins-semibold text-[13px] text-white">{t("home.viewCertificates")}</Text>
        </TouchableOpacity>
      ) : null}

      {reviewTopic ? (
        <>
          <View className="h-px bg-border mx-4" />
          <TouchableOpacity
            className="flex-row items-center px-4 py-[14px]"
            activeOpacity={0.75}
            testID="all-done-review"
            onPress={() => onReviewTopic(reviewTopic.id)}
          >
            <Image source={images[reviewTopic.imageKey]} className="w-11 h-11 rounded-xl" resizeMode="cover" />
            <View className="flex-1 ml-3 mr-2">
              <Text className="font-poppins-medium text-[11px] text-lingua-blue">{t("home.reviewSuggestion")}</Text>
              <Text className="font-poppins-semibold text-sm text-text-primary" numberOfLines={1}>
                {reviewTopic.title} · {reviewTopic.subtitle}
              </Text>
              {bestScore !== undefined ? (
                <Text className="font-poppins text-xs text-text-secondary">
                  {t("home.reviewScore", { score: bestScore })}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
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
});
