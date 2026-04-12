import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const UPI_ID = "nurulquran@upi";
const APP_URL = "https://www.nurulquran.info";

const DONATION_AMOUNTS = [50, 100, 200, 500];

const UPI_APPS = [
  { name: "GPay", scheme: "tez://", icon: "credit-card" },
  { name: "PhonePe", scheme: "phonepe://", icon: "smartphone" },
  { name: "Paytm", scheme: "paytmmp://", icon: "dollar-sign" },
  { name: "BHIM", scheme: "upi://", icon: "hash" },
];

function openUpi(amount: number) {
  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=Nurul%20Quran&am=${amount}&cu=INR&tn=Donation%20for%20Nurul%20Quran`;
  Linking.openURL(upiUrl).catch(() =>
    Alert.alert("UPI not available", `Please send your donation directly to UPI ID:\n\n${UPI_ID}`)
  );
}

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Learn Islam for free — Quran, courses, Arabic & halal stocks on Nurul Quran: ${APP_URL}`,
        url: APP_URL,
        title: "Nurul Quran",
      });
    } catch {}
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.hero, { paddingTop: topPad + 20 }]}
      >
        <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="heart" size={32} color="#C8A04A" />
        </View>
        <Text style={styles.heroTitle}>Support Nurul Quran</Text>
        <Text style={styles.heroSub}>
          The app is completely free. If it has benefited you, consider making a small donation.
        </Text>
      </LinearGradient>

      {/* Free notice */}
      <View style={[styles.freeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="check-circle" size={18} color={colors.teal} />
        <Text style={[styles.freeText, { color: colors.foreground }]}>
          All courses, lectures, Quran & halal stocks are{" "}
          <Text style={{ color: colors.teal, fontFamily: "Inter_700Bold" }}>
            completely free
          </Text>{" "}
          — no subscription needed.
        </Text>
      </View>

      {/* Donate via UPI */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Donate via UPI</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          Choose an amount and open your preferred UPI app
        </Text>

        <View style={styles.amountGrid}>
          {DONATION_AMOUNTS.map((amt) => (
            <Pressable
              key={amt}
              onPress={() => openUpi(amt)}
              style={({ pressed }) => [
                styles.amountBtn,
                {
                  backgroundColor: pressed ? colors.teal : colors.card,
                  borderColor: colors.teal,
                },
              ]}
            >
              {({ pressed }) => (
                <>
                  <Text style={[styles.amountText, { color: pressed ? "#fff" : colors.teal }]}>
                    ₹{amt}
                  </Text>
                  <Text style={[styles.amountLabel, { color: pressed ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                    donate
                  </Text>
                </>
              )}
            </Pressable>
          ))}
        </View>

        {/* UPI ID display */}
        <View style={[styles.upiBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.upiText, { color: colors.mutedForeground }]}>
            Or send directly to UPI ID:{" "}
            <Text style={{ color: colors.teal, fontFamily: "Inter_600SemiBold" }}>{UPI_ID}</Text>
          </Text>
        </View>
      </View>

      {/* Share */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Spread the Word</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          Share Nurul Quran with your family and community — every share helps more Muslims learn.
        </Text>
        <Pressable
          onPress={handleShare}
          style={[styles.shareBtn, { backgroundColor: colors.teal }]}
        >
          <Feather name="share-2" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>Share the App</Text>
        </Pressable>
      </View>

      {/* Dua */}
      <View style={[styles.duaCard, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}>
        <Text style={[styles.duaArabic, { color: colors.teal }]}>🤲</Text>
        <Text style={[styles.duaText, { color: colors.foreground }]}>
          Make du'a for this project. Your du'a is the most valuable support you can give.
        </Text>
        <Text style={[styles.duaNote, { color: colors.mutedForeground }]}>
          JazakAllah Khair for using Nurul Quran.
        </Text>
      </View>

      <View style={{ height: Platform.OS === "web" ? 34 + 84 : 84 + 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  freeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    margin: 20,
    marginBottom: 4,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  freeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  amountBtn: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  amountText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  amountLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  upiBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  upiText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  shareBtn: {
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  shareBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  duaCard: {
    margin: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  duaArabic: {
    fontSize: 32,
  },
  duaText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 22,
  },
  duaNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
