import { useSession } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  onCancel: () => void;
  onVerified: () => void | Promise<void>;
}

/** Reverify the account; this is not proof of parental identity or consent. */
export function GuardianVerification({ onCancel, onVerified }: Props) {
  const { session } = useSession();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const pending = useRef(false);
  const initialSessionId = useRef(session?.id);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit() {
    if (pending.current) return;
    if (!session || session.id !== initialSessionId.current) {
      setError("請先由家長登入帳號，再重新開啟此頁面。");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        const verification = await session.startVerification({ level: "first_factor" });
        if (!mounted.current) return;
        const factor = verification.supportedFirstFactors?.find((item) => item.strategy === "email_code");
        if (!factor || factor.strategy !== "email_code") {
          setError("此帳號尚未支援電子郵件驗證，請聯絡學校協助設定。");
          return;
        }
        await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        if (mounted.current) setSent(true);
      } else {
        const verification = await session.attemptFirstFactorVerification({ strategy: "email_code", code: code.trim() });
        if (!mounted.current) return;
        if (verification.status !== "complete") {
          setError("驗證尚未完成，請聯絡學校協助。");
          return;
        }
        await onVerified();
      }
    } catch {
      if (mounted.current) setError(sent ? "驗證碼不正確或已過期。請重試，或關閉後重新寄送。" : "無法寄送驗證碼，請檢查網路後再試一次。");
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function cancel() {
    mounted.current = false;
    onCancel();
  }

  return (
    <Modal visible animationType="slide" onRequestClose={cancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" className="text-2xl font-bold text-text-primary">請家長協助</Text>
            <Text className="mt-4 text-base leading-7 text-text-primary">即將開啟外部教材網站。請由家長驗證目前登入的帳號，再陪孩子一起選書。</Text>
            <Text className="mt-3 text-base leading-7 text-text-secondary">{sent ? "驗證碼已寄到此帳號的電子郵件。請家長輸入驗證碼。" : "點選下方按鈕，將驗證碼寄到此帳號的電子郵件。"}</Text>
            {sent ? <TextInput accessibilityLabel="電子郵件驗證碼" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} editable={!busy} style={{ marginTop: 24, borderWidth: 1, borderColor: "#766C89", borderRadius: 16, padding: 16, fontSize: 22, color: "#221B35" }} placeholder="000000" placeholderTextColor="#766C89" /> : null}
            {error ? <Text accessibilityRole="alert" className="mt-4 text-base text-red-700">{error}</Text> : null}
            <TouchableOpacity accessibilityRole="button" disabled={busy || (sent && code.length !== 6)} accessibilityState={{ disabled: busy || (sent && code.length !== 6), busy }} onPress={submit} className="mt-6 min-h-14 items-center justify-center rounded-2xl bg-lingua-purple p-4">
              <Text className="text-base font-bold text-white">{busy ? "處理中…" : sent ? "驗證並開啟網站" : "寄送驗證碼"}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={cancel} className="mt-3 min-h-14 items-center justify-center rounded-2xl border border-border p-4">
              <Text className="text-base font-semibold text-text-primary">返回學習</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
