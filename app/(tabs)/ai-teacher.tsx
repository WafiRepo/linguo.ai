import { ReactNode, useEffect } from "react";
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { AIPilotNotice } from "@/components/AIPilotNotice";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Href, useRouter } from "expo-router";

import { ClassTopicCard } from "@/components/ClassTopicCard";
import { colors } from "@/constants/theme";
import { BAGIAN_B_TOPICS, BAGIAN_C_TOPICS, CLASS_MANAGEMENT_TOPICS } from "@/data/classManagement";
import { classTopicRoute, ClassTopicMode } from "@/lib/topicProgress";
import { posthog } from "@/lib/posthog";
import { useLearningStore } from "@/store/learningStore";
import { useT } from "@/lib/i18n";

function ModuleSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-8">
      <Text className="font-poppins-semibold text-base text-text-primary mb-1">
        {title}
      </Text>
      <Text className="caption mb-3">{description}</Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

export default function AITeacherScreen() {
  return CHILD_AI_RELEASE_READY ? <AITeacherTopics /> : <AIPilotNotice />;
}

function AITeacherTopics() {
  const router = useRouter();
  const { t } = useT();
  const completedClassTopicIds = useLearningStore((s) => s.completedClassTopicIds);
  const startedClassTopicIds = useLearningStore((s) => s.startedClassTopicIds);
  const markClassTopicStarted = useLearningStore((s) => s.markClassTopicStarted);
  const isTopicMarked = (topicId: string) =>
    completedClassTopicIds.includes(topicId) || startedClassTopicIds.includes(topicId);
  const startTopic = (topicId: string, mode: ClassTopicMode) => {
    markClassTopicStarted(topicId);
    // Both modes run live on the same screen: Role Play is the Speak-style
    // conversation, Latihan the listen → repeat → answer practice.
    router.push(classTopicRoute(topicId, mode) as Href);
  };

  useEffect(() => {
    posthog.capture("ai_teacher_viewed");
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      <View className="px-5 pt-2 pb-3">
        <Text className="h2 text-center">{t("aiTeacher.title")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ModuleSection
          title={t("aiTeacher.sectionA")}
          description={t("aiTeacher.sectionDescription")}
        >
          {CLASS_MANAGEMENT_TOPICS.map((topic) => (
            <ClassTopicCard
              key={topic.id}
              topic={topic}
              isCompleted={isTopicMarked(topic.id)}
              onPress={(mode) => startTopic(topic.id, mode)}
            />
          ))}
        </ModuleSection>

        <ModuleSection
          title={t("aiTeacher.sectionB")}
          description={t("aiTeacher.sectionDescription")}
        >
          {BAGIAN_B_TOPICS.map((topic) => (
            <ClassTopicCard
              key={topic.id}
              topic={topic}
              isCompleted={isTopicMarked(topic.id)}
              onPress={(mode) => startTopic(topic.id, mode)}
            />
          ))}
        </ModuleSection>

        <ModuleSection
          title={t("aiTeacher.sectionC")}
          description={t("aiTeacher.sectionDescription")}
        >
          {BAGIAN_C_TOPICS.map((topic) => (
            <ClassTopicCard
              key={topic.id}
              topic={topic}
              isCompleted={isTopicMarked(topic.id)}
              onPress={(mode) => startTopic(topic.id, mode)}
            />
          ))}
        </ModuleSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
});
