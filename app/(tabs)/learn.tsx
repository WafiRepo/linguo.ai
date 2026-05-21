import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LessonCard } from "@/components/LessonCard";
import { PracticeCard } from "@/components/PracticeCard";
import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { LESSONS } from "@/data/lessons";
import { getUnitsForLanguage } from "@/data/units";
import { getLessonsForLanguage, getNextLesson } from "@/lib/curriculum";
import {
  buildMixedPracticeActivities,
  getPracticeActivitiesForLesson,
  getUnlockedLessons,
} from "@/lib/practice";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { Lesson } from "@/types/learning";

type LearnTab = "lessons" | "practice";

export default function LearnScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LearnTab>("lessons");
  const { selectedLanguage } = useLanguageStore();
  const completedLessonIds = useLearningStore((s) => s.completedLessonIds);
  const activeLessonIdsByLanguage = useLearningStore(
    (s) => s.activeLessonIdsByLanguage,
  );

  const units = selectedLanguage ? getUnitsForLanguage(selectedLanguage) : [];
  const unit = units[0];
  const allLessons = selectedLanguage
    ? getLessonsForLanguage(selectedLanguage)
    : [];

  const completedCount = allLessons.filter((l) =>
    completedLessonIds.includes(l.id),
  ).length;

  const activeLessonId =
    (selectedLanguage
      ? activeLessonIdsByLanguage[selectedLanguage]
      : undefined) ??
    (selectedLanguage
      ? getNextLesson(selectedLanguage, completedLessonIds)?.id
      : undefined);

  const unlockedLessons = selectedLanguage
    ? getUnlockedLessons(selectedLanguage, activeLessonId)
    : [];
  const mixedQuestionCount = buildMixedPracticeActivities(unlockedLessons, 10).length;

  function startMixedPractice() {
    posthog.capture("practice_started", {
      practice_id: "mixed",
      language: selectedLanguage,
      question_count: mixedQuestionCount,
    });
    router.push("/practice/mixed");
  }

  function startLessonPractice(lesson: Lesson) {
    posthog.capture("practice_started", {
      practice_id: lesson.id,
      language: selectedLanguage,
      question_count: getPracticeActivitiesForLesson(lesson).length,
    });
    router.push(`/practice/${lesson.id}`);
  }

  if (!selectedLanguage || units.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.neutral.background }}
      >
        <View className="flex-1 items-center justify-center px-8">
          <Text className="h3 text-center mb-2">No language selected</Text>
          <Text className="body-md text-text-secondary text-center mb-4">
            Pick a language to start learning.
          </Text>
          <TouchableOpacity
            className="bg-lingua-purple rounded-2xl px-6 py-3"
            activeOpacity={0.85}
            onPress={() => router.push("/language-select?mode=switch")}
          >
            <Text className="font-poppins-semibold text-base text-white">
              Choose language
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => router.navigate("/")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.neutral.textPrimary}
            />
          </TouchableOpacity>

          <Text
            className="flex-1 text-center font-poppins-semibold text-base text-text-primary"
            numberOfLines={1}
          >
            {unit?.title ?? "Learn"}
          </Text>

          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="bookmark-outline"
              size={22}
              color={colors.neutral.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <Text className="caption text-center">
          {units.length} units · {completedCount}/{allLessons.length} lessons
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={images.palace}
            contentFit="contain"
            style={styles.heroImage}
          />
          <RNImage
            source={images.mascotWelcome}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        {/* Lessons / Practice tabs */}
        <View className="flex-row border-b border-border mb-5">
          <TouchableOpacity
            className="pb-3 mr-6"
            style={
              activeTab === "lessons"
                ? styles.tabActive
                : styles.tabInactive
            }
            onPress={() => setActiveTab("lessons")}
          >
            <Text
              className={`font-poppins-semibold text-sm ${
                activeTab === "lessons" ? "text-lingua-purple" : "text-text-secondary"
              }`}
            >
              Lessons
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="pb-3"
            style={
              activeTab === "practice"
                ? styles.tabActive
                : styles.tabInactive
            }
            onPress={() => setActiveTab("practice")}
          >
            <Text
              className={`font-poppins-semibold text-sm ${
                activeTab === "practice" ? "text-lingua-purple" : "text-text-secondary"
              }`}
            >
              Practice
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "lessons" ? (
          units.map((currentUnit) => {
          const unitLessons = currentUnit.lessonIds
            .map((id) => LESSONS.find((l) => l.id === id))
            .filter(Boolean) as Lesson[];

          return (
            <View key={currentUnit.id} className="mb-6">
              <Text className="font-poppins-semibold text-base text-text-primary mb-1">
                Unit {currentUnit.order}: {currentUnit.title}
              </Text>
              <Text className="caption mb-3">{currentUnit.description}</Text>
              <View className="gap-3">
                {unitLessons.map((lesson) => {
                  const globalIndex = allLessons.findIndex(
                    (item) => item.id === lesson.id,
                  );

                  return (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      index={globalIndex}
                      isCompleted={completedLessonIds.includes(lesson.id)}
                      isInProgress={
                        !completedLessonIds.includes(lesson.id) &&
                        lesson.id === activeLessonId
                      }
                      onPress={() => router.push(`/lesson/${lesson.id}`)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })
        ) : (
          <View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.mixedCard}
              onPress={startMixedPractice}
            >
              <View style={styles.mixedIconWrap}>
                <Ionicons name="shuffle" size={22} color={colors.primary.purple} />
              </View>
              <View className="flex-1">
                <Text className="font-poppins-semibold text-base text-text-primary">
                  Mixed review
                </Text>
                <Text className="caption mt-0.5">
                  {mixedQuestionCount} random questions from unlocked lessons
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.primary.purple}
              />
            </TouchableOpacity>

            <Text className="font-poppins-semibold text-base text-text-primary mt-6 mb-3">
              Practice by lesson
            </Text>
            <View className="gap-3">
              {allLessons.map((lesson, index) => {
                const isUnlocked = unlockedLessons.some(
                  (item) => item.id === lesson.id,
                );
                const activityCount = getPracticeActivitiesForLesson(lesson).length;

                return (
                  <PracticeCard
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    activityCount={activityCount}
                    locked={!isUnlocked}
                    onPress={() => startLessonPractice(lesson)}
                  />
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  heroContainer: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#ffffff",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  mascotImage: {
    position: "absolute",
    bottom: 0,
    right: 16,
    width: 110,
    height: 110,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.purple,
  },
  tabInactive: {
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  mixedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    gap: 12,
  },
  mixedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
