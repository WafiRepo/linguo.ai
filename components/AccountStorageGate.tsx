import { useAuth } from "@clerk/expo";
import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { setAccountStorageWritable } from "@/lib/accountStorage";
import { loadLearningAccount } from "@/lib/learningAccount";

// Serialize transitions: an old hydration must finish before another starts.
let switching = Promise.resolve();

export function AccountStorageGate({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
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
      {failed ? <>
        <Text accessibilityRole="alert" className="text-base text-text-primary">無法讀取學習紀錄。請再試一次。</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} className="min-h-14 justify-center rounded-2xl bg-lingua-purple px-6 py-4"><Text className="text-base text-white">再試一次</Text></TouchableOpacity>
      </> : <><ActivityIndicator size="large" color="#6c4ef5" /><Text className="text-base text-text-primary">正在準備學習紀錄…</Text></>}
    </View>;
  }
  return children;
}
