import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[colors.tealDark, colors.teal]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.avatar}>
          <Feather name="user" size={36} color="#fff" />
        </View>
        <Text style={styles.appName}>Nurul Quran</Text>
        <Text style={styles.tagline}>Free Islamic Learning · No Subscriptions</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
        {[
          { icon: "info", label: "About", value: "A completely free Islamic learning app — no ads, no subscriptions, no paywalls." },
          { icon: "mail", label: "Contact", value: "support@nurulquran.info" },
          { icon: "heart", label: "Created by", value: "Mohammed Waseem" },
          { icon: "shield", label: "Privacy", value: "No personal data collected or shared." },
        ].map((item) => (
          <View key={item.label} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name={item.icon as any} size={18} color={colors.teal} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingBottom: 24, paddingHorizontal: 20 },
  back: { alignSelf: "flex-start", marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", textAlign: "center" },
  content: { padding: 16, gap: 12 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  cardValue: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
