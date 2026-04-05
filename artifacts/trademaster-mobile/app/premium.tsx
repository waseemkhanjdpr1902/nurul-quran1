import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

const BASE = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const FEATURES = [
  "All trading signals — entry, SL & targets revealed",
  "Institutional-grade R:R ratios & IV/PCR data",
  "Multi-segment coverage: Nifty, BankNifty, F&O, Equity",
  "Unlimited journal entries & analytics",
  "Real-time market ticker (Nifty 50 & BankNifty)",
  "Priority WhatsApp group access",
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId, isPremium, activatePremium, checkPremium } = useSession();
  const [loading, setLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState<string | null>(null);

  useEffect(() => {
    void checkPremium();
    fetch(`${BASE()}/api/trademaster/config`, { headers: { "cache-control": "no-cache" } })
      .then(r => r.json())
      .then((d: { razorpayKeyId?: string | null }) => setRazorpayKey(d.razorpayKeyId ?? null))
      .catch(() => {});
  }, [checkPremium]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const orderRes = await fetch(`${BASE()}/api/trademaster/payment/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "cache-control": "no-cache" },
        body: JSON.stringify({ sessionId }),
      });
      if (!orderRes.ok) throw new Error("Failed to create order");
      const order = await orderRes.json() as { orderId: string; amount: number; currency: string; keyId: string };

      Alert.alert(
        "Elite Access — ₹4,999/mo",
        `Order ID: ${order.orderId}\n\nIn production, Razorpay checkout opens here. Use the Razorpay dashboard to complete this test order, then enter the payment ID below.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Simulate Success",
            onPress: async () => {
              const sid = `rzp_sim_${Date.now()}`;
              const verifyRes = await fetch(`${BASE()}/api/trademaster/payment/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "cache-control": "no-cache" },
                body: JSON.stringify({
                  razorpay_order_id: order.orderId,
                  razorpay_payment_id: sid,
                  razorpay_signature: "simulated",
                  email: null,
                }),
              }).catch(() => null);
              if (verifyRes?.ok) {
                const vd = await verifyRes.json() as { sessionId?: string };
                if (vd.sessionId) await activatePremium(vd.sessionId);
                Alert.alert("Elite Access Activated!", "You now have full access to all signals and features.");
              } else {
                Alert.alert("Verification pending", `Your sessionId: ${sid}\nContact support to activate.`);
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    closeBtn: {
      position: "absolute", top: insets.top + 12, right: 16, zIndex: 10,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    },
    scroll: { flex: 1 },
    content: { padding: 20, paddingTop: insets.top + 60 },
    badge: {
      alignSelf: "flex-start", backgroundColor: "#78350F30", borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
      borderWidth: 1, borderColor: "#F59E0B40",
    },
    badgeText: { color: colors.amber, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: "900", color: colors.foreground, lineHeight: 38 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, marginTop: 8, lineHeight: 22 },
    priceCard: {
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1,
      borderColor: colors.primary + "40", padding: 20, marginTop: 24, alignItems: "center",
    },
    priceLabel: { fontSize: 14, color: colors.mutedForeground, fontWeight: "600" },
    price: { fontSize: 48, fontWeight: "900", color: colors.foreground, marginTop: 4 },
    priceSub: { fontSize: 14, color: colors.mutedForeground, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 16, width: "100%" },
    featuresTitle: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    featureText: { fontSize: 14, color: colors.foreground, flex: 1, lineHeight: 20 },
    subscribeBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      padding: 18, alignItems: "center", marginTop: 24,
      shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    subscribeBtnText: { color: colors.primaryForeground, fontSize: 17, fontWeight: "800" },
    activeBadge: {
      backgroundColor: "#1A2F1A", borderRadius: 14, padding: 18, alignItems: "center", marginTop: 24,
      borderWidth: 1, borderColor: "#22C55E40",
    },
    activeBadgeText: { color: "#22C55E", fontSize: 17, fontWeight: "800" },
    disclaimer: { fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginTop: 16, lineHeight: 16 },
    dividerBottom: { height: insets.bottom + 20 },
  });

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Feather name="x" size={18} color={colors.foreground} />
      </TouchableOpacity>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.content}>
          <View style={s.badge}><Text style={s.badgeText}>♛ ELITE ACCESS</Text></View>
          <Text style={s.title}>Institutional-Grade Trading Intelligence</Text>
          <Text style={s.subtitle}>Get full access to all signals, analytics, and real-time market data used by professional traders.</Text>

          <View style={s.priceCard}>
            <Text style={s.priceLabel}>Elite Monthly Plan</Text>
            <Text style={s.price}>₹4,999</Text>
            <Text style={s.priceSub}>per month · Cancel anytime</Text>
            <View style={s.divider} />
            <Text style={s.featuresTitle}>What's included</Text>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Feather name="check-circle" size={16} color="#22C55E" />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {isPremium ? (
            <View style={s.activeBadge}>
              <Text style={s.activeBadgeText}>✓ Elite Access Active</Text>
            </View>
          ) : (
            <TouchableOpacity style={[s.subscribeBtn, { opacity: loading ? 0.7 : 1 }]} onPress={() => void handleSubscribe()} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={s.subscribeBtnText}>♛ Subscribe — ₹4,999/mo</Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={s.disclaimer}>
            SEBI Disclaimer: TradeMaster Pro is an educational self-tracking tool and is not a registered investment advisory service under SEBI (Investment Advisers) Regulations, 2013. All signals are for educational reference only.
          </Text>
          <View style={s.dividerBottom} />
        </View>
      </ScrollView>
    </View>
  );
}
