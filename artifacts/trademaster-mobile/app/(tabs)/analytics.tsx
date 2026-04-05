import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { LineChart, BarChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

const BASE = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const SCREEN_WIDTH = Dimensions.get("window").width;

type AnalyticsData = {
  total: number;
  wins: number;
  losses: number;
  closed: number;
  winRate: string;
  totalPnl: string;
  avgWin: string;
  avgLoss: string;
  bestDay: string | null;
  pnlCurve: Array<{ index: number; cumulative: number }>;
  dayPnl: Record<string, number>;
  strategyBreakdown: Record<string, { count: number; pnl: number; wins: number }>;
};

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionId } = useSession();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["journalAnalytics", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await fetch(`${BASE()}/api/trademaster/journal/analytics?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { "cache-control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<AnalyticsData>;
    },
    enabled: !!sessionId,
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 16 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statCard: {
      width: "47%", backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    statIcon: { marginBottom: 6 },
    statValue: { fontSize: 20, fontWeight: "800" },
    statLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: "500", marginTop: 2 },
    statSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    chartCard: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 16, borderWidth: 1, borderColor: colors.border,
    },
    chartTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 14 },
    bestDayCard: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 14, borderWidth: 1, borderColor: "#F59E0B40",
      flexDirection: "row", alignItems: "center", gap: 12,
    },
    bestDayIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "#78350F20", alignItems: "center", justifyContent: "center",
    },
    bestDayLabel: { fontSize: 12, color: colors.amber, fontWeight: "600" },
    bestDayValue: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    stratRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    stratName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
    stratMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    stratPnl: { fontSize: 14, fontWeight: "700" },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
    divider: { height: insets.bottom + 80 },
  });

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(34,197,94,${opacity})`,
    labelColor: () => colors.mutedForeground,
    strokeWidth: 2,
    barPercentage: 0.6,
    propsForDots: { r: "3", strokeWidth: "2", stroke: "#22C55E" },
  };

  if (isLoading) {
    return (
      <View style={s.container}>
        <View style={s.header}><Text style={s.title}>Analytics</Text></View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data || data.total === 0) {
    return (
      <View style={s.container}>
        <View style={s.header}><Text style={s.title}>Analytics</Text></View>
        <View style={s.emptyContainer}>
          <Text style={s.emptyEmoji}>📊</Text>
          <Text style={s.emptyTitle}>No trade data yet</Text>
          <Text style={s.emptySubtitle}>Log trades in your Journal to unlock analytics and performance insights.</Text>
        </View>
      </View>
    );
  }

  const totalPnl = parseFloat(data.totalPnl);
  const winRateNum = parseFloat(data.winRate);
  const pnlColor = totalPnl >= 0 ? "#22C55E" : "#F87171";

  const pnlCurveData = data.pnlCurve.slice(-20);
  const dayChartData = DAYS_ORDER.filter(d => d in data.dayPnl).map(d => ({ day: d.slice(0, 3), pnl: data.dayPnl[d] }));
  const strategies = Object.entries(data.strategyBreakdown)
    .sort((a, b) => {
      const wrA = a[1].count > 0 ? a[1].wins / a[1].count : 0;
      const wrB = b[1].count > 0 ? b[1].wins / b[1].count : 0;
      return wrB - wrA;
    })
    .slice(0, 6);

  const chartWidth = SCREEN_WIDTH - 32 - 32;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Analytics</Text>
        <Text style={s.subtitle}>Data-driven insights from your journal</Text>
      </View>

      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>
        <View style={s.content}>
          {/* Stats Grid */}
          <View style={s.statGrid}>
            {[
              { icon: "target" as const, label: "Win Rate", value: `${data.winRate}%`, sub: `${data.wins}W / ${data.losses}L`, color: winRateNum >= 50 ? "#22C55E" : "#F87171" },
              { icon: "dollar-sign" as const, label: "Total P&L", value: `${totalPnl >= 0 ? "+" : ""}₹${Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: `${data.closed} closed`, color: pnlColor },
              { icon: "award" as const, label: "Avg Win", value: `₹+${parseFloat(data.avgWin).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "per winning trade", color: "#22C55E" },
              { icon: "alert-triangle" as const, label: "Avg Loss", value: `₹-${parseFloat(data.avgLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "per losing trade", color: "#F87171" },
            ].map(stat => (
              <View key={stat.label} style={s.statCard}>
                <View style={s.statIcon}><Feather name={stat.icon} size={18} color={stat.color} /></View>
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
                <Text style={s.statSub}>{stat.sub}</Text>
              </View>
            ))}
          </View>

          {/* Best Day */}
          {data.bestDay && (
            <View style={s.bestDayCard}>
              <View style={s.bestDayIcon}><Text style={{ fontSize: 22 }}>⭐</Text></View>
              <View>
                <Text style={s.bestDayLabel}>Best Performing Day</Text>
                <Text style={s.bestDayValue}>{data.bestDay}</Text>
              </View>
            </View>
          )}

          {/* P&L Curve */}
          {pnlCurveData.length > 1 && (
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>Cumulative P&L Curve</Text>
              <LineChart
                data={{
                  labels: pnlCurveData.map((_, i) => i % 5 === 0 ? String(i + 1) : ""),
                  datasets: [{ data: pnlCurveData.map(d => d.cumulative), color: () => pnlColor, strokeWidth: 2 }],
                }}
                width={chartWidth}
                height={180}
                chartConfig={{ ...chartConfig, color: () => pnlColor }}
                bezier
                withDots={false}
                withInnerLines={false}
                style={{ borderRadius: 8, marginLeft: -16 }}
                formatYLabel={(v) => `₹${(parseFloat(v) / 1000).toFixed(0)}k`}
              />
            </View>
          )}

          {/* Day P&L */}
          {dayChartData.length > 0 && (
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>P&L by Day of Week</Text>
              <BarChart
                data={{
                  labels: dayChartData.map(d => d.day),
                  datasets: [{ data: dayChartData.map(d => Math.abs(d.pnl)), colors: dayChartData.map(d => () => d.pnl >= 0 ? "#22C55E" : "#F87171") }],
                }}
                width={chartWidth}
                height={160}
                chartConfig={chartConfig}
                withCustomBarColorFromData
                flatColor
                style={{ borderRadius: 8, marginLeft: -16 }}
                yAxisLabel="₹"
                yAxisSuffix=""
                showValuesOnTopOfBars={false}
              />
            </View>
          )}

          {/* Strategy Breakdown */}
          {strategies.length > 0 && (
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>Strategy Breakdown</Text>
              {strategies.map(([name, stats]) => (
                <View key={name} style={s.stratRow}>
                  <View>
                    <Text style={s.stratName}>{name}</Text>
                    <Text style={s.stratMeta}>{stats.count} trades · {stats.wins} wins</Text>
                  </View>
                  <Text style={[s.stratPnl, { color: stats.pnl >= 0 ? "#22C55E" : "#F87171" }]}>
                    {stats.pnl >= 0 ? "+" : ""}₹{stats.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.divider} />
        </View>
      </ScrollView>
    </View>
  );
}
