import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (isRegister && !name.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = isRegister ? "/api/users/register" : "/api/users/login";
      const body = isRegister
        ? { email: email.trim(), password, name: name.trim() }
        : { email: email.trim(), password };

      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message ?? data.error ?? "Something went wrong.");
        return;
      }

      await login(data.token, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        isPremium: data.user.isPremium ?? false,
        subscriptionPlan: data.user.subscriptionPlan,
        subscriptionEnd: data.user.subscriptionEnd,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: topPad + 20 }} />

        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: colors.teal }]}>
            <Feather name="book-open" size={28} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isRegister ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {isRegister
              ? "Join Nurul Quran and begin your journey"
              : "Sign in to continue your Islamic education"}
          </Text>
        </View>

        <View style={styles.form}>
          {isRegister && (
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Full name"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="mail" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.submitBtn,
              { backgroundColor: loading ? colors.mutedForeground : colors.teal },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>{isRegister ? "Create Account" : "Sign In"}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setIsRegister(!isRegister)} style={styles.switchBtn}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              {isRegister ? "Already have an account? " : "Don't have an account? "}
              <Text style={[styles.switchLink, { color: colors.teal }]}>
                {isRegister ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 32 },
  header: { alignItems: "center", gap: 12, marginBottom: 36 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  form: { gap: 14 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  switchBtn: { alignItems: "center", marginTop: 4 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontFamily: "Inter_600SemiBold" },
});
