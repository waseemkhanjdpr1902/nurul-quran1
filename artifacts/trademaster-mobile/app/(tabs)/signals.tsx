import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

const BASE = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Signal = {
  id: number;
  segment: string;
  assetName: string;
  signalType: "buy" | "sell";
  entryPrice: string;
  stopLoss: string;
  target1: string;
  target2: string | null;
  riskReward: string | null;
  iv: string | null;
  pcr: string | null;
  notes: string | null;
  isPremium: boolean;
  status: "active" | "target_hit" | "sl_hit";
  createdAt: string;
};

const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "intraday", label: "⚡ Intraday" },
  { key: "nifty", label: "Nifty" },
  { key: "banknifty", label: "BankNifty" },
  { key: "options", label: "Options" },
  { key: "equity", label: "Equity" },
  { key: "commodity", label: "Commodity" },
];

const STATUS_COLOR: Record<string, string> = {
  active: "#22C55E",
  target_hit: "#F59E0B",
  sl_hit: "#F87171",
};

const STATUS_LABEL: Record<string, string> = {
  active: "● Active",
  target_hit: "✓ Target Hit",
  sl_hit: "✗ SL Hit",
};

export default function SignalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionId, isPremium } = useSession();
  const [segment, setSegment] = useState("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["signals", segment, sessionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (segment !== "all") params.set("segment", segment);
      if (sessionId) params.set("sessionId", sessionId);
      const res = await fetch(`${BASE()}/api/trademaster/signals?${params.toString()}`, {
        headers: { "cache-control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ signals: Signal[] }>;
    },
    refetchInterval: 30000,
  });

  const signals = data?.signals ?? [];

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    filterRow: {
      paddingVertical: 10, paddingLeft: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      marginRight: 8, borderWidth: 1,
    },
    chipText: { fontSize: 13, fontWeight: "600" },
    listContent: { padding: 12 },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    assetName: { fontSize: 16, fontWeight: "800", color: colors.foreground },
    segmentBadge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
      backgroundColor: colors.muted,
    },
    segmentText: { fontSize: 11, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase" },
    buyBadge: { backgroundColor: "#1A2F1A", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    sellBadge: { backgroundColor: "#2F1A1A", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: "800" },
    cardBody: { padding: 14 },
    priceGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
    priceCell: { flex: 1, backgroundColor: colors.muted, borderRadius: 8, padding: 10 },
    priceLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: "600", marginBottom: 3 },
    priceValue: { fontSize: 14, fontWeight: "700", color: colors.foreground },
    cardFooter: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4,
    },
    statusText: { fontSize: 13, fontWeight: "700" },
    rrText: { fontSize: 12, color: colors.mutedForeground, fontWeight: "600" },
    eliteLock: {
      backgroundColor: "#78350F20", borderRadius: 8, padding: 10,
      flexDirection: "row", alignItems: "center", gap: 8,
    },
    eliteLockText: { fontSize: 13, color: colors.amber, fontWeight: "600" },
    premiumBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: "#78350F30", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    },
    premiumText: { fontSize: 11, fontWeight: "700", color: colors.amber },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
    divider: { height: insets.bottom + 80 },
  });

  const isRedacted = (sig: Signal) => sig.isPremium && !isPremium && sig.entryPrice === "—";

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Signals</Text>
        <Text style={s.subtitle}>Technical analysis levels · Educational reference only</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {SEGMENTS.map((seg) => {
          const active = segment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[s.chip, {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              }]}
              onPress={() => setSegment(seg.key)}
            >
              <Text style={[s.chipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Fetching signals…</Text>
        </View>
      ) : signals.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📊</Text>
          <Text style={s.emptyTitle}>No signals yet</Text>
          <Text style={s.emptySubtitle}>Our analyst is preparing calls — check back soon</Text>
        </View>
      ) : (
        <FlatList
          data={signals}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const redacted = isRedacted(item);
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={s.assetName}>{item.assetName}</Text>
                    {item.isPremium && (
                      <View style={s.premiumBadge}>
                        <Text style={s.premiumText}>♛ Elite</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={s.segmentBadge}>
                      <Text style={s.segmentText}>{item.segment}</Text>
                    </View>
                    <View style={item.signalType === "buy" ? s.buyBadge : s.sellBadge}>
                      <Text style={[s.badgeText, { color: item.signalType === "buy" ? "#22C55E" : "#F87171" }]}>
                        {item.signalType === "buy" ? "▲ BUY" : "▼ SELL"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={s.cardBody}>
                  {redacted ? (
                    <View style={s.eliteLock}>
                      <Feather name="lock" size={16} color={colors.amber} />
                      <Text style={s.eliteLockText}>Elite members see full entry, SL & target levels</Text>
                    </View>
                  ) : (
                    <View style={s.priceGrid}>
                      <View style={s.priceCell}>
                        <Text style={s.priceLabel}>Entry</Text>
                        <Text style={s.priceValue}>₹{item.entryPrice}</Text>
                      </View>
                      <View style={s.priceCell}>
                        <Text style={s.priceLabel}>Stop-Loss</Text>
                        <Text style={[s.priceValue, { color: "#F87171" }]}>₹{item.stopLoss}</Text>
                      </View>
                      <View style={s.priceCell}>
                        <Text style={s.priceLabel}>Target</Text>
                        <Text style={[s.priceValue, { color: "#22C55E" }]}>₹{item.target1}</Text>
                      </View>
                    </View>
                  )}

                  <View style={s.cardFooter}>
                    <Text style={[s.statusText, { color: STATUS_COLOR[item.status] ?? colors.mutedForeground }]}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Text>
                    {item.riskReward && !redacted && (
                      <Text style={s.rrText}>R:R {item.riskReward}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={<View style={s.divider} />}
        />
      )}
    </View>
  );
}
