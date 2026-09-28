import { useAuth } from "@clerk/expo";
import { useNetInfo } from "@react-native-community/netinfo";
import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { setAccountStorageWritable } from "@/lib/accountStorage";
import { loadLearningAccount } from "@/lib/learningAccount";
import { useT } from "@/lib/i18n";

// Serialize transitions: an old hydration must finish before another starts.
let switching = Promise.resolve();

export function AccountStorageGate({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const { t } = useT();
  // Login (Clerk) can't load offline, which otherwise looks like an endless spinner.
  const offline = useNetInfo().isConnected === false;
  const account = userId ?? "signed-out";
  const [readyAccount, setReadyAccount] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    setFailed(false);
    setAccountStorageWritable(false);
    switching = switching.catch(() => {}).then(async () => {
      if (!active) return;
      await loadLearningAccount(account);
      if (!active) return;
      setAccountStorageWritable(Boolean(userId));
      setReadyAccount(account);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      setAccountStorageWritable(false);
    };
  }, [isLoaded, account, userId, attempt]);

  if (!isLoaded || readyAccount !== account || failed) {
    return <View className="flex-1 items-center justify-center gap-4 bg-white p-6">
      {offline ? <>
        <Text accessibilityRole="alert" className="text-lg font-poppins-semibold text-text-primary">{t("gate.offline.title")}</Text>
        <Text className="text-center text-base text-text-secondary">{t("gate.offline.body")}</Text>
      </> : failed ? <>
        <Text accessibilityRole="alert" className="text-base text-text-primary">{t("gate.failed")}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} className="min-h-14 justify-center rounded-2xl bg-lingua-purple px-6 py-4"><Text className="text-base text-white">{t("common.retry")}</Text></TouchableOpacity>
      </> : <><ActivityIndicator size="large" color="#6c4ef5" /><Text className="text-base text-text-primary">{t("gate.loading")}</Text></>}
    </View>;
  }
  return children;
}
