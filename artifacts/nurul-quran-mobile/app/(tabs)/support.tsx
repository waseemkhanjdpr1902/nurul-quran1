import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface RazorpayConfig {
  configured: boolean;
  key_id?: string;
}

const FEATURES = [
  { icon: "layers", text: "All 12 Islamic courses unlocked" },
  { icon: "play-circle", text: "All 18 Arabic learning lessons" },
  { icon: "book-open", text: "Quran with Tafseer Ibn Katheer" },
  { icon: "trending-up", text: "Full Halal Stock Screener (30+ stocks)" },
  { icon: "shield", text: "Ad-free experience" },
  { icon: "mail", text: "Priority email support" },
  { icon: "zap", text: "Early access to new content" },
];

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, refreshUser } = useAuth();
  const [config, setConfig] = useState<RazorpayConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const API = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  useEffect(() => {
    fetch(`${API}/api/payments/razorpay/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ configured: false }))
      .finally(() => setConfigLoading(false));
  }, []);

  const handleSubscribe = async () => {
    if (!user || !token) {
      router.push("/auth/login");
      return;
    }

    if (!config?.configured || !config.key_id) {
      Alert.alert("Payment Unavailable", "Payment gateway is not configured. Please try again later.");
      return;
    }

    setPayLoading(true);
    try {
      const amount = selectedPlan === "annual" ? 799900 : 99900;
      const receipt = `${selectedPlan}_${Date.now()}`;

      const orderRes = await fetch(`${API}/api/payments/razorpay/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, currency: "INR", receipt }),
      });

      if (!orderRes.ok) {
        Alert.alert("Error", "Failed to create payment order. Please try again.");
        return;
      }

      const order = await orderRes.json();

      // Build Razorpay payment URL for in-app browser
      const params = new URLSearchParams({
        key: config.key_id,
        amount: String(amount),
        currency: "INR",
        order_id: order.id,
        name: "Nurul Quran",
        description: `${selectedPlan === "annual" ? "Annual" : "Monthly"} Premium`,
        prefill_email: (user as any).email ?? "",
        callback_url: `${API}/api/payments/razorpay/mobile-callback`,
        cancel_url: `${API}/api/payments/razorpay/mobile-cancel`,
      });

      const paymentUrl = `${API}/api/payments/razorpay/checkout?${params.toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(paymentUrl, `${API}/api/payments/razorpay/mobile`);

      if (result.type === "success") {
        await refreshUser();
        Alert.alert("JazakAllah Khair! 🤲", "Your premium subscription is now active.");
      } else if (result.type === "cancel" || result.type === "dismiss") {
        Alert.alert("Payment Cancelled", "You can subscribe any time from the Premium tab.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setPayLoading(false);
    }
  };

  const subEnd = user?.subscriptionEnd ? new Date(user.subscriptionEnd).toLocaleDateString() : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.hero, { paddingTop: topPad + 20 }]}
      >
        <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="star" size={32} color="#C8A04A" />
        </View>
        <Text style={styles.heroTitle}>Nurul Quran Premium</Text>
        <Text style={styles.heroSub}>
          Unlock the complete Islamic education experience
        </Text>
      </LinearGradient>

      {/* Active subscription banner */}
      {user?.isPremium && (
        <View style={[styles.activeBanner, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
          <Feather name="check-circle" size={18} color="#2E7D32" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.activeTitle, { color: "#1B5E20" }]}>Premium Active ✓</Text>
            {subEnd && (
              <Text style={[styles.activeSub, { color: "#388E3C" }]}>Renews on {subEnd}</Text>
            )}
          </View>
        </View>
      )}

      {/* Plan selector */}
      {!user?.isPremium && (
        <View style={styles.plansSection}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Choose Your Plan</Text>
          <View style={styles.plans}>
            <Pressable
              onPress={() => setSelectedPlan("annual")}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedPlan === "annual" ? colors.teal : colors.border,
                  borderWidth: selectedPlan === "annual" ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.popularBadge, { backgroundColor: colors.teal }]}>
                <Text style={styles.popularText}>BEST VALUE</Text>
              </View>
              <View style={styles.planTop}>
                <View style={{ flex: 1, paddingTop: 24 }}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>Annual</Text>
                  <Text style={[styles.planSub, { color: colors.mutedForeground }]}>₹666/mo · Save 33%</Text>
                </View>
                <View style={styles.planPriceBox}>
                  <Text style={[styles.planPrice, { color: colors.teal }]}>₹7,999</Text>
                  <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/yr</Text>
                </View>
              </View>
              {selectedPlan === "annual" && (
                <View style={[styles.checkDot, { backgroundColor: colors.teal }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => setSelectedPlan("monthly")}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedPlan === "monthly" ? colors.teal : colors.border,
                  borderWidth: selectedPlan === "monthly" ? 2 : 1,
                },
              ]}
            >
              <View style={styles.planTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                  <Text style={[styles.planSub, { color: colors.mutedForeground }]}>Billed monthly</Text>
                </View>
                <View style={styles.planPriceBox}>
                  <Text style={[styles.planPrice, { color: colors.teal }]}>₹999</Text>
                  <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/mo</Text>
                </View>
              </View>
              {selectedPlan === "monthly" && (
                <View style={[styles.checkDot, { backgroundColor: colors.teal }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Features */}
      <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.featuresTitle, { color: colors.foreground }]}>What's Included</Text>
        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.tealLight }]}>
              <Feather name={f.icon as any} size={14} color={colors.teal} />
            </View>
            <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Subscribe CTA */}
      {!user?.isPremium && (
        <View style={styles.ctaContainer}>
          {configLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !user ? (
            <Pressable
              onPress={() => router.push("/auth/login")}
              style={[styles.ctaBtn, { backgroundColor: colors.teal }]}
            >
              <Feather name="log-in" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>Login to Subscribe</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubscribe}
              disabled={payLoading}
              style={[
                styles.ctaBtn,
                { backgroundColor: payLoading ? colors.mutedForeground : colors.teal },
              ]}
            >
              {payLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="zap" size={18} color="#fff" />
                  <Text style={styles.ctaBtnText}>
                    Subscribe {selectedPlan === "annual" ? "Annually — ₹7,999" : "Monthly — ₹999"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
          <View style={styles.trustRow}>
            <Feather name="lock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              Secure payment via Razorpay · Cancel anytime
            </Text>
          </View>
        </View>
      )}

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
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  activeSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  plansSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  plans: {
    flexDirection: "row",
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    position: "relative",
    overflow: "hidden",
    minHeight: 100,
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: "center",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  popularText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  planName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  planSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  planPriceBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  planPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  checkDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  featuresCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  featuresTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },

  ctaContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 4,
  },
  ctaBtn: {
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
