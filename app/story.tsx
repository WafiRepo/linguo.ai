import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useContentWidth } from "@/lib/layout";

import { Image } from "@/components/Image";

import { WaveHeader } from "@/components/WaveHeader";
import { images } from "@/constants/images";
import { Bilingual, PartnerOrg, STORY, TeamMember } from "@/data/teamStory";
import { useT } from "@/lib/i18n";

const PURPLE = "#6c4ef5";

// "The Story Behind the App": why the app exists, the team, and partners.
export default function StoryScreen() {
  const router = useRouter();
  // The hero card spans the screen minus its 20px side margins.
  const heroWidth = useContentWidth() - 40;
  const { t, locale } = useT();
  const zh = locale === "zh-TW";
  const pick = (text: Bilingual) => (zh ? text.zh : text.en);

  return (
    <View className="flex-1 bg-[#faf8ff]">
      <WaveHeader title={t("story.title")} onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/chat"))} backLabel={t("common.back")} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="mx-5 rounded-[28px] bg-[#ece2fc] overflow-hidden pt-6">
          <Text className="font-poppins-bold text-[32px] leading-[38px] text-[#5b3bf6] text-center px-4">
            {pick(STORY.title)}
          </Text>
          <Text className="font-poppins-medium text-base text-[#6c4ef5] text-center mt-2">
            Cerita di Balik Aplikasi
          </Text>
          <Image
            source={images.storyHero}
            style={[styles.hero, { width: heroWidth, height: (heroWidth * 9) / 16 }]}
            resizeMode="cover"
          />
        </View>
        <View className="mx-10 -mt-7 rounded-[24px] bg-[#e4dcff] px-5 py-4" style={styles.softShadow}>
          <Text className="font-poppins-semibold text-[15px] leading-6 text-[#4a32c9] text-center">
            {pick(STORY.tagline)}
          </Text>
        </View>

        {/* Our story */}
        <SectionTitle icon="leaf" zhLabel="我們的故事" enLabel="Our Story" zh={zh} />
        <Text className="mx-5 mt-3 font-poppins-medium text-[15px] text-[#5b3bf6]">{pick(STORY.ourStoryLead)}</Text>
        {STORY.ourStory.map((paragraph) => (
          <Text key={paragraph.en} className="mx-5 mt-3 font-poppins text-[15px] leading-7 text-text-primary">
            {pick(paragraph)}
          </Text>
        ))}

        {/* Team */}
        <SectionTitle icon="people" zhLabel="認識研發團隊" enLabel="Meet Our Team" zh={zh} />
        <Text className="mx-5 mt-3 font-poppins-medium text-[15px] text-[#5b3bf6]">{pick(STORY.teamLead)}</Text>
        <View className="mx-5 mt-4 gap-4">
          {STORY.team.map((member) => (
            <MemberCard key={member.name} member={member} zh={zh} />
          ))}
        </View>

        {/* Partners */}
        <SectionTitle icon="home" zhLabel="計畫執行單位" enLabel="Project Implementation" zh={zh} />
        <PartnerCard org={STORY.implementation} zh={zh} />
        <SectionTitle icon="heart" zhLabel="經費支持單位" enLabel="Funding Support" zh={zh} />
        <PartnerCard org={STORY.funding} zh={zh} />

        {/* Closing */}
        <View className="items-center mt-10 px-8">
          <Ionicons name="heart" size={44} color="#a78bfa" />
          <Text className="font-poppins-bold text-[26px] leading-8 text-[#4a32c9] text-center mt-3">
            {pick(STORY.closingTitle)}
          </Text>
          <Text className="font-poppins text-[15px] text-text-primary text-center mt-3">{pick(STORY.closing)}</Text>
          <Text className="font-poppins text-sm leading-6 text-[#6c4ef5] text-center mt-2">{STORY.thanksId}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({
  icon,
  zhLabel,
  enLabel,
  zh,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  zhLabel: string;
  enLabel: string;
  zh: boolean;
}) {
  return (
    <View className="mx-5 mt-8 flex-row items-center gap-3 rounded-2xl bg-[#ece6ff] px-4 py-3">
      <Ionicons name={icon} size={28} color={PURPLE} />
      <Text className="flex-1 font-poppins-bold text-xl text-[#4a32c9]">{zh ? zhLabel : enLabel}</Text>
    </View>
  );
}

function Chip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    // max-w-full + shrink: a long role wraps inside the card instead of running past it.
    <View className="max-w-full rounded-lg bg-[#ece6ff] px-2 py-1">
      <Text className={`shrink text-[13px] leading-5 text-[#4a32c9] ${strong ? "font-poppins-semibold" : "font-poppins"}`}>
        {children}
      </Text>
    </View>
  );
}

function MemberCard({ member, zh }: { member: TeamMember; zh: boolean }) {
  return (
    <View className="rounded-[24px] border border-[#e4dcff] bg-white p-4" style={styles.softShadow}>
      <View className="flex-row gap-4">
        {member.photo ? (
          <Image source={member.photo} className="w-[92px] h-[92px] rounded-full" />
        ) : (
          <View className="w-[92px] h-[92px] rounded-full bg-[#ece6ff] items-center justify-center">
            <Text className="font-poppins-bold text-[28px] text-[#6c4ef5]">{member.initials}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="font-poppins-bold text-lg text-text-primary">{member.name}</Text>
          <View className="flex-row flex-wrap gap-1.5 mt-1.5">
            {member.roles.map((role, index) => (
              <Chip key={role.en} strong={index === 0}>
                {zh ? role.zh : role.en}
              </Chip>
            ))}
          </View>
          {member.school ? (
            <View className="flex-row gap-2 mt-2">
              <Ionicons name="school-outline" size={18} color="#1f1f2e" style={{ marginTop: 2 }} />
              <Text className="flex-1 font-poppins text-[13px] leading-5 text-text-primary">
                {zh ? member.school.zh : member.school.en}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View className="mt-3 rounded-2xl bg-[#f4f1ff] px-4 py-3">
        <Text className="font-poppins text-sm leading-6 text-text-primary">{zh ? member.quote.zh : member.quote.en}</Text>
      </View>
    </View>
  );
}

function PartnerCard({ org, zh }: { org: PartnerOrg; zh: boolean }) {
  return (
    <View className="mx-5 mt-3 rounded-[24px] border border-[#e4dcff] bg-white p-4" style={styles.softShadow}>
      {org.logo ? (
        <Image source={org.logo} className="h-[84px] w-full mb-3" resizeMode="contain" />
      ) : null}
      <View className="flex-row gap-3">
        {org.logo ? null : <Ionicons name="leaf" size={40} color="#7cc96b" />}
        <View className="flex-1">
          <Text className="font-poppins-bold text-lg text-text-primary">{zh ? org.zhName : org.enName}</Text>
        </View>
      </View>
      <Text className="font-poppins text-sm leading-6 text-text-primary mt-3">{zh ? org.about.zh : org.about.en}</Text>
      {org.links?.length ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {org.links.map((link) => (
            <Pressable
              key={link.url}
              onPress={() => Linking.openURL(link.url)}
              className="flex-row items-center gap-2 rounded-full bg-[#ece6ff] px-4 py-2 active:opacity-70"
              accessibilityRole="link"
            >
              <Ionicons name={link.icon} size={20} color={link.icon === "logo-youtube" ? "#ff0000" : "#1877f2"} />
              <Text className="font-poppins-semibold text-sm text-[#4a32c9]">{link.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ScrollView contentContainerStyle, shadows and the image ratio stay in StyleSheet.
const styles = StyleSheet.create({
  hero: {
    marginTop: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 48,
  },
  softShadow: {
    shadowColor: "#6c4ef5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
});
