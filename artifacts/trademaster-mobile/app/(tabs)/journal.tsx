import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

const BASE = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Trade = {
  id: number;
  sessionId: string;
  assetName: string;
  assetType: string;
  direction: "long" | "short";
  entryPrice: string;
  exitPrice: string | null;
  quantity: number;
  pnl: string | null;
  outcome: "win" | "loss" | "breakeven" | "open";
  strategyUsed: string | null;
  notes: string | null;
  entryDate: string;
  exitDate: string | null;
};

const ASSET_TYPES = ["equity", "intraday", "options", "futures", "commodity", "currency"];
const STRATEGIES = ["Breakout", "Reversal", "Trend Following", "Scalping", "Swing Trade", "Price Action", "Support/Resistance", "VWAP", "Moving Average", "Other"];

const OUTCOME_COLORS: Record<string, { bg: string; text: string }> = {
  win: { bg: "#1A2F1A", text: "#22C55E" },
  loss: { bg: "#2F1A1A", text: "#F87171" },
  breakeven: { bg: "#2F2A0F", text: "#FCD34D" },
  open: { bg: "#0F1D2F", text: "#60A5FA" },
};
const OUTCOME_LABELS: Record<string, string> = { win: "✅ Win", loss: "❌ Loss", breakeven: "🟡 B/E", open: "⏳ Open" };

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { sessionId } = useSession();
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [closeTradeId, setCloseTradeId] = useState<number | null>(null);
  const [form, setForm] = useState({
    assetName: "", assetType: "equity", direction: "long",
    entryPrice: "", exitPrice: "", quantity: "", strategyUsed: "", notes: "",
  });
  const [exitPrice, setExitPrice] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["journal", sessionId],
    queryFn: async () => {
      if (!sessionId) return { trades: [] };
      const res = await fetch(`${BASE()}/api/trademaster/journal?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { "cache-control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to fetch journal");
      return res.json() as Promise<{ trades: Trade[] }>;
    },
    enabled: !!sessionId,
  });

  const addMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`${BASE()}/api/trademaster/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "cache-control": "no-cache" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to log trade");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      void queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
      setShowAdd(false);
      setForm({ assetName: "", assetType: "equity", direction: "long", entryPrice: "", exitPrice: "", quantity: "", strategyUsed: "", notes: "" });
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const closeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await fetch(`${BASE()}/api/trademaster/journal/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "cache-control": "no-cache" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to close trade");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      void queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
      setCloseTradeId(null);
      setExitPrice("");
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE()}/api/trademaster/journal/${id}`, {
        method: "DELETE",
        headers: { "cache-control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      void queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
    },
  });

  const trades = data?.trades ?? [];
  const filtered = filterOutcome === "all" ? trades : trades.filter(t => t.outcome === filterOutcome);
  const totalPnl = trades.filter(t => t.pnl).reduce((s, t) => s + parseFloat(t.pnl!), 0);
  const wins = trades.filter(t => t.outcome === "win").length;
  const closed = trades.filter(t => t.outcome !== "open").length;
  const winRate = closed > 0 ? Math.round((wins / closed) * 100) : 0;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    addBtn: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6,
    },
    addBtnText: { color: colors.primaryForeground, fontWeight: "700", fontSize: 14 },
    statsRow: { flexDirection: "row", padding: 12, gap: 8 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center",
    },
    statValue: { fontSize: 18, fontWeight: "800" },
    statLabel: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
    filterRow: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", gap: 6 },
    filterChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
    },
    filterChipText: { fontSize: 12, fontWeight: "600" },
    listContent: { paddingHorizontal: 12 },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, marginBottom: 8,
    },
    cardMain: { padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    assetName: { fontSize: 16, fontWeight: "800", color: colors.foreground },
    cardMeta: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
    outcomeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    outcomeBadgeText: { fontSize: 11, fontWeight: "700" },
    dirText: { fontSize: 12, fontWeight: "700" },
    pnlText: { fontSize: 18, fontWeight: "800" },
    dateText: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    cardActions: {
      flexDirection: "row", gap: 8, padding: 10, paddingTop: 0,
    },
    closeBtn: {
      flex: 1, backgroundColor: "#1A2F1A", borderRadius: 8,
      paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#22C55E30",
    },
    closeBtnText: { color: "#22C55E", fontWeight: "700", fontSize: 13 },
    deleteBtn: {
      backgroundColor: "#2F1A1A", borderRadius: 8,
      paddingVertical: 8, paddingHorizontal: 14, alignItems: "center", borderWidth: 1, borderColor: "#F8717130",
    },
    fab: {
      position: "absolute", right: 20, bottom: insets.bottom + 88,
      backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28,
      alignItems: "center", justifyContent: "center",
      shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
    modalOverlay: { flex: 1, backgroundColor: "#00000080", justifyContent: "flex-end" },
    modal: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: insets.bottom + 20, maxHeight: "90%",
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground, marginBottom: 16 },
    inputLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: "600", marginBottom: 4, marginTop: 10 },
    input: {
      backgroundColor: colors.muted, borderRadius: 10, padding: 12,
      color: colors.foreground, fontSize: 15, borderWidth: 1, borderColor: colors.border,
    },
    optionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    optionBtn: {
      flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
      alignItems: "center",
    },
    optionBtnText: { fontSize: 13, fontWeight: "700" },
    submitBtn: {
      backgroundColor: colors.primary, borderRadius: 12,
      padding: 15, alignItems: "center", marginTop: 16,
    },
    submitBtnText: { color: colors.primaryForeground, fontWeight: "800", fontSize: 15 },
    cancelBtn: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 12,
      padding: 14, alignItems: "center", marginTop: 8,
    },
    cancelBtnText: { color: colors.mutedForeground, fontWeight: "600", fontSize: 14 },
    divider: { height: insets.bottom + 80 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Trading Journal</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={s.addBtnText}>Log Trade</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: "Trades", value: trades.length.toString(), color: colors.foreground },
          { label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "#22C55E" : "#F87171" },
          { label: "Total P&L", value: `₹${totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: totalPnl >= 0 ? "#22C55E" : "#F87171" },
          { label: "Open", value: trades.filter(t => t.outcome === "open").length.toString(), color: "#60A5FA" },
        ].map(s2 => (
          <View key={s2.label} style={s.statCard}>
            <Text style={[s.statValue, { color: s2.color }]}>{s2.value}</Text>
            <Text style={s.statLabel}>{s2.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {["all", "open", "win", "loss", "breakeven"].map(f => {
          const active = filterOutcome === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
              onPress={() => setFilterOutcome(f)}
            >
              <Text style={[s.filterChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {f === "all" ? "All" : OUTCOME_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📓</Text>
          <Text style={s.emptyTitle}>No trades yet</Text>
          <Text style={s.emptySubtitle}>Log your first trade to start building your journal</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const pnlNum = item.pnl ? parseFloat(item.pnl) : null;
            const oc = OUTCOME_COLORS[item.outcome] ?? { bg: colors.muted, text: colors.foreground };
            return (
              <View style={s.card}>
                <View style={s.cardMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.assetName}>{item.assetName}</Text>
                    <View style={s.cardMeta}>
                      <View style={[s.outcomeBadge, { backgroundColor: oc.bg }]}>
                        <Text style={[s.outcomeBadgeText, { color: oc.text }]}>{OUTCOME_LABELS[item.outcome]}</Text>
                      </View>
                      <Text style={[s.dirText, { color: item.direction === "long" ? "#22C55E" : "#F87171" }]}>
                        {item.direction === "long" ? "▲ Long" : "▼ Short"}
                      </Text>
                    </View>
                    <Text style={s.dateText}>{new Date(item.entryDate).toLocaleDateString("en-IN")}</Text>
                  </View>
                  {pnlNum !== null && (
                    <Text style={[s.pnlText, { color: pnlNum >= 0 ? "#22C55E" : "#F87171" }]}>
                      {pnlNum >= 0 ? "+" : ""}₹{Math.abs(pnlNum).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                  )}
                </View>
                <View style={s.cardActions}>
                  {item.outcome === "open" && (
                    <TouchableOpacity style={s.closeBtn} onPress={() => { setCloseTradeId(item.id); setExitPrice(""); }}>
                      <Text style={s.closeBtnText}>Close Trade & Book P&L</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => Alert.alert("Delete Trade", "Are you sure?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                    ])}
                  >
                    <Feather name="trash-2" size={16} color="#F87171" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListFooterComponent={<View style={s.divider} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)}>
        <Feather name="plus" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>

      {/* Add Trade Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Log a Trade</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>Asset Name *</Text>
              <TextInput style={s.input} placeholder="e.g. RELIANCE, NIFTY 50" placeholderTextColor={colors.mutedForeground}
                value={form.assetName} onChangeText={v => setForm(f => ({ ...f, assetName: v }))} />

              <Text style={s.inputLabel}>Direction</Text>
              <View style={s.optionRow}>
                {["long", "short"].map(d => (
                  <TouchableOpacity key={d} style={[s.optionBtn, {
                    backgroundColor: form.direction === d ? (d === "long" ? "#1A2F1A" : "#2F1A1A") : colors.muted,
                    borderColor: form.direction === d ? (d === "long" ? "#22C55E" : "#F87171") : colors.border,
                  }]} onPress={() => setForm(f => ({ ...f, direction: d as "long" | "short" }))}>
                    <Text style={[s.optionBtnText, { color: form.direction === d ? (d === "long" ? "#22C55E" : "#F87171") : colors.mutedForeground }]}>
                      {d === "long" ? "▲ Long (Buy)" : "▼ Short (Sell)"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.inputLabel}>Entry Price (₹) *</Text>
              <TextInput style={s.input} placeholder="0.00" placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad" value={form.entryPrice} onChangeText={v => setForm(f => ({ ...f, entryPrice: v }))} />

              <Text style={s.inputLabel}>Asset Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {ASSET_TYPES.map(at => {
                    const active = form.assetType === at;
                    return (
                      <TouchableOpacity key={at} style={[s.optionBtn, {
                        flex: 0, paddingHorizontal: 12, paddingVertical: 8,
                        backgroundColor: active ? colors.greenLight : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      }]} onPress={() => setForm(f => ({ ...f, assetType: at }))}>
                        <Text style={[s.optionBtnText, { color: active ? colors.green : colors.mutedForeground }]}>
                          {at.charAt(0).toUpperCase() + at.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={s.inputLabel}>Quantity *</Text>
              <TextInput style={s.input} placeholder="Shares / lots" placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad" value={form.quantity} onChangeText={v => setForm(f => ({ ...f, quantity: v }))} />

              <Text style={s.inputLabel}>Strategy Used</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {STRATEGIES.map(str => {
                    const active = form.strategyUsed === str;
                    return (
                      <TouchableOpacity key={str} style={[s.optionBtn, {
                        flex: 0, paddingHorizontal: 10, paddingVertical: 7,
                        backgroundColor: active ? "#1A2F1A" : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      }]} onPress={() => setForm(f => ({ ...f, strategyUsed: active ? "" : str }))}>
                        <Text style={[s.optionBtnText, { fontSize: 12, color: active ? colors.primary : colors.mutedForeground }]}>
                          {str}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={s.inputLabel}>Notes</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Why did you enter?" placeholderTextColor={colors.mutedForeground}
                multiline value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />

              <TouchableOpacity
                style={[s.submitBtn, { opacity: addMutation.isPending ? 0.6 : 1 }]}
                disabled={addMutation.isPending}
                onPress={() => {
                  if (!form.assetName.trim() || !form.entryPrice || !form.quantity) {
                    Alert.alert("Missing fields", "Asset name, entry price and quantity are required."); return;
                  }
                  addMutation.mutate({
                    sessionId, assetName: form.assetName, assetType: form.assetType,
                    direction: form.direction, entryPrice: form.entryPrice,
                    quantity: parseInt(form.quantity, 10),
                    strategyUsed: form.strategyUsed || undefined,
                    notes: form.notes || undefined,
                    entryDate: new Date().toISOString(),
                  });
                }}
              >
                <Text style={s.submitBtnText}>{addMutation.isPending ? "Saving…" : "Log Trade"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Close Trade Modal */}
      <Modal visible={closeTradeId !== null} animationType="slide" transparent onRequestClose={() => setCloseTradeId(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: "50%" }]}>
            <Text style={s.modalTitle}>Close Trade</Text>
            <Text style={s.inputLabel}>Exit Price (₹) *</Text>
            <TextInput style={s.input} placeholder="0.00" placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad" value={exitPrice} onChangeText={setExitPrice} />
            <TouchableOpacity
              style={[s.submitBtn, { opacity: closeMutation.isPending ? 0.6 : 1 }]}
              disabled={closeMutation.isPending}
              onPress={() => {
                if (!exitPrice) { Alert.alert("Enter exit price"); return; }
                if (closeTradeId !== null) closeMutation.mutate({ id: closeTradeId, data: { exitPrice, exitDate: new Date().toISOString() } });
              }}
            >
              <Text style={s.submitBtnText}>{closeMutation.isPending ? "Saving…" : "Close & Book P&L"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setCloseTradeId(null)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
