import { ReactNode, useEffect } from "react";
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { AIPilotNotice } from "@/components/AIPilotNotice";
import { AITestingBanner } from "@/components/AITestingBanner";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ClassTopicCard } from "@/components/ClassTopicCard";
import { colors } from "@/constants/theme";
import { BAGIAN_B_TOPICS, BAGIAN_C_TOPICS, CLASS_MANAGEMENT_TOPICS } from "@/data/classManagement";
import { posthog } from "@/lib/posthog";
import { useLearningStore } from "@/store/learningStore";

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
  const completedClassTopicIds = useLearningStore((s) => s.completedClassTopicIds);
  const startedClassTopicIds = useLearningStore((s) => s.startedClassTopicIds);
  const markClassTopicStarted = useLearningStore((s) => s.markClassTopicStarted);
  const isTopicMarked = (topicId: string) =>
    completedClassTopicIds.includes(topicId) || startedClassTopicIds.includes(topicId);
  const startTopic = (topicId: string, mode: "teach" | "roleplay") => {
    markClassTopicStarted(topicId);
    router.push({
      pathname: "/class-management/[id]",
      params: { id: topicId, mode },
    });
  };

  useEffect(() => {
    posthog.capture("ai_teacher_viewed");
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      <AITestingBanner />
      <View className="px-5 pt-2 pb-3">
        <Text className="h2 text-center">AI Teacher</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ModuleSection
          title="Bagian A: Persiapan Pelajaran"
          description="Latih dialog guru–siswa persis seperti di gambar komik — tidak ada materi lain."
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
          title="Bagian B: Saat Kelas Berlangsung"
          description="Latih dialog guru–siswa persis seperti di gambar komik — tidak ada materi lain."
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
          title="Bagian C: Pengakhiran Kelas"
          description="Latih dialog guru–siswa persis seperti di gambar komik — tidak ada materi lain."
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
