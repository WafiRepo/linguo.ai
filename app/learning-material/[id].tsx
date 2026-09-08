import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VocabularyRow } from "@/components/VocabularyRow";
import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { getLearningMaterial } from "@/data/learningMaterials";

export default function LearningMaterialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const material = getLearningMaterial(id ?? "");

  if (!material) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View className="flex-1 items-center justify-center">
          <Text className="body-md text-text-secondary">Materi tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  const source = images[material.imageKey];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text style={styles.headerTitle} numberOfLines={1}>
            {material.title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {material.subtitle}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Image
          source={source}
          contentFit="contain"
          style={[styles.image, { aspectRatio: material.aspectRatio }]}
        />

        <Text style={styles.sectionTitle}>Dengarkan Kosakata</Text>
        <View style={styles.vocabList}>
          {material.vocabulary.map((item) => (
            <VocabularyRow key={item.word} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  image: {
    width: "100%",
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    color: colors.neutral.textPrimary,
    marginBottom: 10,
  },
  vocabList: {
    gap: 8,
  },
});
