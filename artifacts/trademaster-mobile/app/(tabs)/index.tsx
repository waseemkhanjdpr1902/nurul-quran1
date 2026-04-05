import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

const BASE = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type TickerQuote = {
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

type AnalyticsData = {
  total: number;
  wins: number;
  losses: number;
  closed: number;
  winRate: string;
  totalPnl: string;
  avgWin: string;
  avgLoss: string;
};

const STATS_DISPLAY = [
  { label: "Success Rate", value: "87%", icon: "target" as const, color: "#22C55E" },
  { label: "Intraday Acc.", value: "84%", icon: "zap" as const, color: "#22C55E" },
  { label: "Avg R:R", value: "1:3.1", icon: "sliders" as const, color: "#F59E0B" },
  { label: "Targets/Mo", value: "48/55", icon: "check-circle" as const, color: "#22C55E" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId, isPremium } = useSession();

  const tickerQuery = useQuery({
    queryKey: ["ticker"],
    queryFn: async () => {
      const res = await fetch(`${BASE()}/api/trademaster/ticker`, {
        headers: { "cache-control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to fetch ticker");
      return res.json() as Promise<{ ticker: Record<string, TickerQuote> }>;
    },
    refetchInterval: 30000,
  });

  const analyticsQuery = useQuery({
    queryKey: ["journalAnalytics", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await fetch(
        `${BASE()}/api/trademaster/journal/analytics?sessionId=${encodeURIComponent(sessionId)}`,
        { headers: { "cache-control": "no-cache" } }
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json() as Promise<AnalyticsData>;
    },
    enabled: !!sessionId,
  });

  const onRefresh = useCallback(() => {
    void tickerQuery.refetch();
    void analyticsQuery.refetch();
  }, [tickerQuery, analyticsQuery]);

  const isRefreshing = tickerQuery.isFetching || analyticsQuery.isFetching;

  const ticker = tickerQuery.data?.ticker ?? {};
  const analytics = analyticsQuery.data;
  const totalPnl = analytics ? parseFloat(analytics.totalPnl) : 0;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    header: {
      paddingTop: insets.top + 12,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    appName: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    appBadge: {
      backgroundColor: "#1A2F1A",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    appBadgeText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    premiumBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    premiumBtnText: { color: colors.primaryForeground, fontWeight: "700", fontSize: 13 },
    section: { paddingHorizontal: 16, paddingTop: 20 },
    sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    tickerRow: { flexDirection: "row", gap: 10 },
    tickerCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    tickerName: { fontSize: 11, color: colors.mutedForeground, fontWeight: "600", marginBottom: 4 },
    tickerPrice: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    tickerChange: { fontSize: 13, fontWeight: "700", marginTop: 2 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statCard: {
      width: "47%", backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontSize: 22, fontWeight: "800", marginTop: 6 },
    statLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: "500" },
    pnlCard: {
      backgroundColor: colors.card, borderRadius: colors.radius, padding: 16,
      borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 14,
    },
    pnlIcon: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center",
    },
    pnlLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: "500" },
    pnlValue: { fontSize: 28, fontWeight: "800", marginTop: 2 },
    pnlMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    disclaimer: {
      margin: 16, padding: 12,
      backgroundColor: colors.muted, borderRadius: colors.radius,
    },
    disclaimerText: { fontSize: 11, color: colors.mutedForeground, textAlign: "center", lineHeight: 16 },
    divider: { height: insets.bottom + 80 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.appName}>TradeMaster</Text>
            <View style={s.appBadge}><Text style={s.appBadgeText}>PRO</Text></View>
          </View>
          {!isPremium ? (
            <TouchableOpacity style={s.premiumBtn} onPress={() => router.push("/premium")}>
              <Text style={s.premiumBtnText}>♛ Go Elite</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.premiumBtn, { backgroundColor: "#78350F20" }]}>
              <Text style={[s.premiumBtnText, { color: colors.amber }]}>♛ Elite</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticker */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Market Pulse</Text>
          {tickerQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={s.tickerRow}>
              {["nifty", "banknifty"].map((key) => {
                const q = ticker[key];
                const changeColor = !q || q.change === null ? colors.mutedForeground
                  : q.change >= 0 ? "#22C55E" : "#F87171";
                return (
                  <View key={key} style={s.tickerCard}>
                    <Text style={s.tickerName}>{q?.name ?? key.toUpperCase()}</Text>
                    <Text style={s.tickerPrice}>
                      {q?.price != null ? q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
                    </Text>
                    <Text style={[s.tickerChange, { color: changeColor }]}>
                      {q?.change != null
                        ? `${q.change >= 0 ? "▲" : "▼"} ${Math.abs(q.change).toFixed(2)} (${Math.abs(q.changePercent ?? 0).toFixed(2)}%)`
                        : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Today's Performance */}
        {analytics && analytics.total > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Performance</Text>
            <View style={s.pnlCard}>
              <View style={[s.pnlIcon, { backgroundColor: totalPnl >= 0 ? "#1A2F1A" : "#2F1A1A" }]}>
                <Feather name={totalPnl >= 0 ? "trending-up" : "trending-down"} size={22} color={totalPnl >= 0 ? "#22C55E" : "#F87171"} />
              </View>
              <View>
                <Text style={s.pnlLabel}>Total P&L</Text>
                <Text style={[s.pnlValue, { color: totalPnl >= 0 ? "#22C55E" : "#F87171" }]}>
                  {totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
                <Text style={s.pnlMeta}>{analytics.total} trades · {analytics.winRate}% win rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Platform Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Platform Stats</Text>
          <View style={s.statGrid}>
            {STATS_DISPLAY.map((stat) => (
              <View key={stat.label} style={s.statCard}>
                <Feather name={stat.icon} size={18} color={stat.color} />
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            SEBI Disclaimer: All signals and analysis are for educational reference only. This is not a registered investment advisory service. Always do your own due diligence before trading.
          </Text>
        </View>

        <View style={s.divider} />
      </ScrollView>
    </View>
  );
}
