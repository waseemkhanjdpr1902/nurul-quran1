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

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert("Missing fields", "Please fill in your name, email and message.");
      return;
    }
    const subject = encodeURIComponent(`Nurul Quran App — Message from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    );
    Linking.openURL(`mailto:support@nurulquran.info?subject=${subject}&body=${body}`)
      .then(() => {
        setSent(true);
        setName("");
        setEmail("");
        setMessage("");
      })
      .catch(() =>
        Alert.alert(
          "Could not open email",
          "Please send your message directly to support@nurulquran.info"
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
        <Text style={styles.appName}>Nurul Quran</Text>
        <Text style={styles.tagline}>Free Islamic Learning App</Text>
      </LinearGradient>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: 60 }]}
      >
        {/* Contact info cards */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.tealLight }]}>
            <Feather name="mail" size={18} color={colors.teal} />
          </View>
          <View>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
            <Pressable onPress={() => Linking.openURL("mailto:support@nurulquran.info")}>
              <Text style={[styles.infoValue, { color: colors.teal }]}>
                support@nurulquran.info
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.tealLight }]}>
            <Feather name="user" size={18} color={colors.teal} />
          </View>
          <View>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Created by</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>Mohammed Waseem</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.tealLight }]}>
            <Feather name="globe" size={18} color={colors.teal} />
          </View>
          <View>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Website</Text>
            <Pressable onPress={() => Linking.openURL("https://www.nurulquran.info")}>
              <Text style={[styles.infoValue, { color: colors.teal }]}>www.nurulquran.info</Text>
            </Pressable>
          </View>
        </View>

        {/* Contact form */}
        <Text style={[styles.formTitle, { color: colors.foreground }]}>Send us a message</Text>

        {sent ? (
          <View style={[styles.successBox, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}>
            <Feather name="check-circle" size={32} color={colors.teal} style={{ marginBottom: 8 }} />
            <Text style={[styles.successText, { color: colors.teal }]}>JazakAllah Khair!</Text>
            <Text style={[styles.successSub, { color: colors.teal }]}>
              Your email app opened. We will reply to you soon InshaAllah.
            </Text>
            <Pressable onPress={() => setSent(false)} style={styles.resetBtn}>
              <Text style={[styles.resetText, { color: colors.teal }]}>Send another message</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Your Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Your Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.teal, opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sendText}>Send Message</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  back: { marginBottom: 16 },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  content: { padding: 16, gap: 12 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  formTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  textarea: { height: 110, paddingTop: 11 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  sendText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  successBox: { borderWidth: 1.5, borderRadius: 16, padding: 24, alignItems: "center" },
  successText: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  successSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  resetBtn: { marginTop: 16 },
  resetText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
});
