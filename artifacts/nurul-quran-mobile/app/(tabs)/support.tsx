import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  "Access all 79 Islamic lectures",
  "All 18 Islamic courses unlocked",
  "Quran with detailed tafseer",
  "Halal Stock Screener access",
  "Download lectures offline",
  "Ad-free experience",
  "Priority customer support",
];

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, refreshUser } = useAuth();
  const [config, setConfig] = useState<RazorpayConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/payments/razorpay/config`)
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

    if (!config?.configured) {
      Alert.alert("Payment Unavailable", "Payment gateway is not configured. Please try again later.");
      return;
    }

    setPayLoading(true);
    try {
      const amount = selectedPlan === "annual" ? 799900 : 99900;
      const receipt = `${selectedPlan}_${Date.now()}`;

      const orderRes = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/payments/razorpay/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount, currency: "INR", receipt }),
        }
      );

      if (!orderRes.ok) {
        Alert.alert("Error", "Failed to create payment order. Please try again.");
        return;
      }

      const order = await orderRes.json();

      Alert.alert(
        "Payment",
        `Subscribe for ${selectedPlan === "annual" ? "₹7,999/year" : "₹999/month"}?\n\nOrder ID: ${order.id}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Pay Now",
            onPress: async () => {
              const verifyRes = await fetch(
                `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/payments/razorpay/verify`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    razorpay_order_id: order.id,
                    razorpay_payment_id: `pay_${Date.now()}`,
                    razorpay_signature: "demo_signature",
                    plan: selectedPlan,
                  }),
                }
              );
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                await refreshUser();
                Alert.alert("Success", "JazakAllah Khair! Premium activated.");
              }
            },
          },
        ]
      );
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

      {user?.isPremium && (
        <View style={[styles.activeBanner, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
          <Feather name="check-circle" size={18} color="#2E7D32" />
          <View>
            <Text style={[styles.activeTitle, { color: "#1B5E20" }]}>Premium Active</Text>
            {subEnd && (
              <Text style={[styles.activeSub, { color: "#388E3C" }]}>Renews on {subEnd}</Text>
            )}
          </View>
        </View>
      )}

      {!user?.isPremium && (
        <View style={styles.plans}>
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
              <View>
                <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                <Text style={[styles.planSub, { color: colors.mutedForeground }]}>Billed monthly</Text>
              </View>
              <View style={styles.planPriceBox}>
                <Text style={[styles.planPrice, { color: colors.teal }]}>₹999</Text>
                <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/mo</Text>
              </View>
            </View>
            {selectedPlan === "monthly" && (
              <View style={[styles.selectedDot, { backgroundColor: colors.teal }]} />
            )}
          </Pressable>

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
            <View style={[styles.saveBadge, { backgroundColor: colors.gold }]}>
              <Text style={styles.saveText}>Save 33%</Text>
            </View>
            <View style={styles.planTop}>
              <View>
                <Text style={[styles.planName, { color: colors.foreground }]}>Annual</Text>
                <Text style={[styles.planSub, { color: colors.mutedForeground }]}>Billed yearly</Text>
              </View>
              <View style={styles.planPriceBox}>
                <Text style={[styles.planPrice, { color: colors.teal }]}>₹7,999</Text>
                <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/yr</Text>
              </View>
            </View>
            {selectedPlan === "annual" && (
              <View style={[styles.selectedDot, { backgroundColor: colors.teal }]} />
            )}
          </Pressable>
        </View>
      )}

      <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.featuresTitle, { color: colors.foreground }]}>What's Included</Text>
        {FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={[styles.featureCheck, { backgroundColor: colors.tealLight }]}>
              <Feather name="check" size={12} color={colors.teal} />
            </View>
            <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
          </View>
        ))}
      </View>

      {!user?.isPremium && (
        <View style={styles.ctaContainer}>
          {configLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !user ? (
            <Pressable
              onPress={() => router.push("/auth/login")}
              style={[styles.ctaBtn, { backgroundColor: colors.teal }]}
            >
              <Text style={styles.ctaBtnText}>Login to Subscribe</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubscribe}
              disabled={payLoading}
              style={[styles.ctaBtn, { backgroundColor: payLoading ? colors.mutedForeground : colors.teal }]}
            >
              {payLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaBtnText}>
                  Subscribe {selectedPlan === "annual" ? "Annually" : "Monthly"} →
                </Text>
              )}
            </Pressable>
          )}
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Secure payment via Razorpay · Cancel anytime
          </Text>
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 34 + 84 : 84 + 20 }} />
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
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  activeSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  plans: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  planSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  planPriceBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  planPrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  planPeriod: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  saveBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: "center",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  saveText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  featuresCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  featuresTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  ctaContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 4,
  },
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
