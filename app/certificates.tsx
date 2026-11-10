import { useAuth } from "@clerk/expo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { WaveHeader } from "@/components/WaveHeader";
import { PART_TITLES } from "@/constants/curriculumParts";
import { fetchCertificates, printCertificate, shareCertificatePdf } from "@/lib/certificates";
import { isNoAccessError } from "@/lib/api";
import { Translate, useT } from "@/lib/i18n";
import { Certificate, CertificatesResponse, PartCertificateStatus } from "@/types/certificate";

const PURPLE = "#6c4ef5";

// Digital Certificates (revision P2): one per part (A, B, C), earned by
// finishing Latihan and Role Play for every topic in that part.
export default function CertificatesScreen() {
  const router = useRouter();
  // A teacher opens a student's certificates with ?studentId=&name=.
  const { studentId, name } = useLocalSearchParams<{ studentId?: string; name?: string }>();
  const { getToken } = useAuth();
  const { t, locale } = useT();
  const [data, setData] = useState<CertificatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Clerk's getToken changes every render; a ref keeps `load` stable.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCertificates(() => getTokenRef.current(), studentId));
      setFailed(false);
      setNoAccess(false);
    } catch (error) {
      if (isNoAccessError(error)) {
        setNoAccess(true);
        setData(null);
      } else {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(action: "print" | "pdf", certificate: Certificate) {
    setBusy(`${action}:${certificate.part}`);
    try {
      if (action === "print") await printCertificate(certificate);
      else await shareCertificatePdf(certificate);
    } catch {
      Alert.alert(t("certificates.pdfError"));
    } finally {
      setBusy(null);
    }
  }

  const dateFormat = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View className="flex-1 bg-[#faf8ff]">
      <WaveHeader
        title={studentId && name ? `${name} · ${t("certificates.title")}` : t("certificates.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
        backLabel={t("common.back")}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text className="mt-2 font-poppins text-sm leading-6 text-text-secondary">{t("certificates.rule")}</Text>

        {noAccess ? (
          <View className="mt-4 rounded-2xl border border-[#e4dcff] bg-white px-4 py-4">
            <Text className="font-poppins text-sm leading-6 text-text-secondary">{t("common.noAccess")}</Text>
          </View>
        ) : null}

        {failed ? (
          <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-[#fde3c2] bg-[#fffaf3] px-4 py-3">
            <Text className="flex-1 font-poppins text-[13px] leading-5 text-[#92400e]">{t("certificates.loadError")}</Text>
            <TouchableOpacity onPress={load} hitSlop={8}>
              <Text className="font-poppins-semibold text-[13px] text-[#b45309]">{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && !data ? <ActivityIndicator color={PURPLE} className="mt-10" /> : null}

        <View className="mt-4 gap-3">
          {data?.parts.map((status) => (
            <PartCard
              key={status.part}
              status={status}
              title={PART_TITLES[status.part][locale === "zh-TW" ? "zh" : "en"]}
              date={status.certificate ? dateFormat.format(new Date(status.certificate.completedAt)) : ""}
              busy={busy}
              onAction={run}
              t={t}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function PartCard({
  status,
  title,
  date,
  busy,
  onAction,
  t,
}: {
  status: PartCertificateStatus;
  title: string;
  date: string;
  busy: string | null;
  onAction: (action: "print" | "pdf", certificate: Certificate) => void;
  t: Translate;
}) {
  const { certificate } = status;
  const progress = status.topicsTotal ? status.topicsDone / status.topicsTotal : 0;

  return (
    <View
      className={`rounded-[24px] border bg-white p-4 ${certificate ? "border-[#c9b8ff]" : "border-[#e4dcff]"}`}
      style={styles.softShadow}
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 font-poppins-semibold text-base text-text-primary">{title}</Text>
        <Text
          className={`font-poppins-medium text-xs ${certificate ? "text-[#4a32c9]" : "text-text-secondary"}`}
        >
          {certificate ? t("certificates.earned") : t("certificates.locked")}
        </Text>
      </View>

      {certificate ? (
        <>
          <Text className="mt-2 font-poppins text-[13px] text-text-secondary">
            {t("certificates.completedOn", { date })}
          </Text>
          <Text className="font-poppins text-[13px] text-text-secondary">
            {t("certificates.number", { no: certificate.certificateNo })}
          </Text>
          <View className="mt-4 flex-row gap-3">
            <ActionButton
              label={t("certificates.print")}
              loading={busy === `print:${certificate.part}`}
              disabled={!!busy}
              onPress={() => onAction("print", certificate)}
            />
            <ActionButton
              label={t("certificates.download")}
              primary
              loading={busy === `pdf:${certificate.part}`}
              disabled={!!busy}
              onPress={() => onAction("pdf", certificate)}
            />
          </View>
        </>
      ) : (
        <>
          <Text className="mt-2 font-poppins text-[13px] text-text-secondary">
            {t("certificates.progress", { done: status.topicsDone, total: status.topicsTotal })}
          </Text>
          <View className="mt-2 h-2 rounded-full bg-[#ece6ff] overflow-hidden">
            <View className="h-full rounded-full bg-[#6c4ef5]" style={{ width: `${progress * 100}%` }} />
          </View>
        </>
      )}
    </View>
  );
}

function ActionButton({
  label,
  primary = false,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  primary?: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 h-11 items-center justify-center rounded-full ${
        primary ? "bg-[#6c4ef5]" : "border border-[#c9b8ff] bg-white"
      }`}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#fff" : PURPLE} />
      ) : (
        <Text className={`font-poppins-semibold text-sm ${primary ? "text-white" : "text-[#4a32c9]"}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ScrollView contentContainerStyle and shadows stay in StyleSheet.
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 48,
  },
  softShadow: {
    shadowColor: "#6c4ef5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
});
