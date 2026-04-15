import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const TOPICS = [
  "General Question",
  "Islamic Guidance",
  "Quran Help",
  "Prayer / Salah",
  "New Muslim Support",
  "App Feedback",
  "Other",
];

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [showTopics, setShowTopics] = useState(false);

  const handleSend = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert("Missing fields", "Please fill in your name, email and message.");
      return;
    }
    const subject = encodeURIComponent(`[${topic}] Message from ${name} — Nurul Quran App`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}\n\n---\nSent from Nurul Quran App`
    );
    Linking.openURL(`mailto:support@nurulquran.info?subject=${subject}&body=${body}`)
      .then(() => {
        setSent(true);
        setName("");
        setEmail("");
        setMessage("");
        setTopic(TOPICS[0]);
      })
      .catch(() =>
        Alert.alert(
          "Could not open email app",
          "Please send your message directly to:\nsupport@nurulquran.info"
        )
      );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.avatarCircle}>
            <Feather name="book-open" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Connect to a Scholar</Text>
          <Text style={styles.headerSub}>Nurul Quran — Free Islamic Guidance</Text>
        </View>
      </LinearGradient>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 60 }]}
      >
        {/* Contact info */}
        <View style={styles.infoRow}>
          <Pressable
            onPress={() => Linking.openURL("mailto:support@nurulquran.info")}
            style={[styles.infoChip, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
          >
            <Feather name="mail" size={14} color={colors.teal} />
            <Text style={[styles.infoChipText, { color: colors.teal }]}>support@nurulquran.info</Text>
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL("https://www.nurulquran.info")}
            style={[styles.infoChip, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}
          >
            <Feather name="globe" size={14} color={colors.teal} />
            <Text style={[styles.infoChipText, { color: colors.teal }]}>nurulquran.info</Text>
          </Pressable>
        </View>

        <View style={[styles.creatorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.creatorIcon, { backgroundColor: colors.tealLight }]}>
            <Feather name="user" size={18} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Created & maintained by</Text>
            <Text style={[styles.creatorName, { color: colors.foreground }]}>Mohammed Waseem</Text>
            <Text style={[styles.creatorSub, { color: colors.mutedForeground }]}>
              Nurul Quran is completely free — no subscriptions, no ads
            </Text>
          </View>
        </View>

        {/* Form */}
        <Text style={[styles.formTitle, { color: colors.foreground }]}>Send a Message</Text>
        <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
          Ask a question, seek guidance, or share feedback — we reply to every message InshaAllah.
        </Text>

        {sent ? (
          <View style={[styles.successBox, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}>
            <Feather name="check-circle" size={40} color={colors.teal} style={{ marginBottom: 10 }} />
            <Text style={[styles.successTitle, { color: colors.teal }]}>JazakAllah Khair!</Text>
            <Text style={[styles.successSub, { color: colors.teal }]}>
              Your email app opened with your message ready to send.{"\n"}We will reply soon InshaAllah.
            </Text>
            <Pressable
              onPress={() => setSent(false)}
              style={[styles.resetBtn, { borderColor: colors.teal }]}
            >
              <Text style={[styles.resetText, { color: colors.teal }]}>Send another message</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Your Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Your Email *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Topic</Text>
              <Pressable
                onPress={() => setShowTopics(!showTopics)}
                style={[styles.input, styles.dropdown, { backgroundColor: colors.card, borderColor: showTopics ? colors.teal : colors.border }]}
              >
                <Text style={[styles.dropdownText, { color: colors.foreground }]}>{topic}</Text>
                <Feather name={showTopics ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </Pressable>
              {showTopics && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {TOPICS.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => { setTopic(t); setShowTopics(false); }}
                      style={[styles.dropdownItem, { borderBottomColor: colors.border, backgroundColor: t === topic ? colors.tealLight : "transparent" }]}
                    >
                      <Text style={[styles.dropdownItemText, { color: t === topic ? colors.teal : colors.foreground }]}>{t}</Text>
                      {t === topic && <Feather name="check" size={14} color={colors.teal} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Your Message *</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type your question or message here..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.teal, opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.sendText}>Send to Scholar</Text>
            </Pressable>

            <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
              Messages go directly to support@nurulquran.info
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  back: { marginBottom: 8 },
  headerCenter: { alignItems: "center", gap: 8 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", textAlign: "center" },
  content: { padding: 16, gap: 14 },
  infoRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  infoChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  creatorCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  creatorIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  creatorLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  creatorName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  creatorSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  formTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  formSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: -8 },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  textarea: { height: 130, paddingTop: 12 },
  dropdown: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dropdownList: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden", marginTop: -8 },
  dropdownItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  sendText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  footnote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -6 },
  successBox: { borderWidth: 1.5, borderRadius: 16, padding: 28, alignItems: "center", gap: 8 },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  resetBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1.5 },
  resetText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
