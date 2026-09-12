import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GuardianVerification } from "@/components/GuardianVerification";
import { colors } from "@/constants/theme";
import { INDONESIAN_EBOOK_URL } from "@/constants/resources";

// Preserve the route so existing links to the fourth tab continue to work.
export default function InformationScreen() {
  const [verify, setVerify] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  async function openBooks() {
    setVerify(false);
    setOpening(true);
    setError("");
    try {
      const network = await NetInfo.fetch();
      if (network.isConnected === false || network.isInternetReachable === false) throw new Error("offline");
      await Linking.openURL(INDONESIAN_EBOOK_URL);
    } catch {
      setError("暫時無法開啟電子書。請檢查網路，或請老師、家長協助。");
    } finally {
      setOpening(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text accessibilityRole="header" className="text-2xl font-bold text-text-primary">資訊</Text>
        <View className="mt-6 rounded-3xl bg-purple-50 p-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-white">
            <Ionicons name="book-outline" size={34} color={colors.primary.purple} />
          </View>
          <Text accessibilityRole="header" className="text-2xl font-bold text-text-primary">印尼語電子書</Text>
          <Text className="mt-3 text-base leading-7 text-text-primary">想學更多印尼語嗎？來找找課本和學習資料吧！</Text>
        </View>
        <View className="mt-5 rounded-3xl border border-border bg-white p-5">
          <Text className="text-sm font-semibold text-lingua-purple">教育部國民及學前教育署</Text>
          <Text accessibilityRole="header" className="mt-2 text-xl font-bold text-text-primary">新住民子女教育資訊網</Text>
          <Text className="mt-3 text-base leading-7 text-text-primary">選一本適合自己的印尼語課本。你可以線上閱讀，也可以請老師或家長協助下載。</Text>
          <View className="mt-5 gap-3 rounded-2xl bg-purple-50 p-4">
            <Text className="text-base leading-7 text-text-primary">① 請老師或家長幫忙選書。</Text>
            <Text className="text-base leading-7 text-text-primary">② 點選「線上閱覽」就能看書。</Text>
            <Text className="text-base leading-7 text-text-primary">③ 想下載時，請大人協助點選「離線下載」。</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="尋找印尼語電子書" accessibilityHint="請家長驗證帳號後，開啟外部教材網站" accessibilityState={{ disabled: opening, busy: opening }} disabled={opening} testID="information-open-ebooks" onPress={() => setVerify(true)} className="mt-5 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-lingua-purple px-4 py-4">
            {opening ? <ActivityIndicator color="#fff" /> : <Ionicons name="open-outline" size={20} color="#fff" />}
            <Text className="text-base font-bold text-white">{opening ? "開啟中…" : error ? "再試一次" : "尋找印尼語電子書"}</Text>
          </TouchableOpacity>
          {error ? <Text accessibilityRole="alert" selectable className="mt-3 text-base leading-6 text-red-700">{error}</Text> : null}
          <Text className="mt-4 text-sm leading-6 text-text-secondary">需要網路連線，並將開啟外部網站。網站有自己的隱私權政策。看完後，可以返回這裡繼續學習。</Text>
        </View>
      </ScrollView>
      {verify ? <GuardianVerification onCancel={() => setVerify(false)} onVerified={openBooks} /> : null}
    </SafeAreaView>
  );
}
