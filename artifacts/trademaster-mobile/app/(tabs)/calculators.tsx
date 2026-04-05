import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n)) return "—";
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normCDF(x: number): number { return (1 + erf(x / Math.sqrt(2))) / 2; }
function normPDF(x: number): number { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }

function blackScholes(S: number, K: number, T: number, r: number, sigma: number) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return null;
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const callPrice = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  const putPrice = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
  const delta_call = normCDF(d1);
  const delta_put = delta_call - 1;
  const gamma = normPDF(d1) / (S * sigma * Math.sqrt(T));
  const theta_call = (-(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCDF(d2)) / 365;
  const vega = S * normPDF(d1) * Math.sqrt(T) / 100;
  return { callPrice, putPrice, delta_call, delta_put, gamma, theta_call, vega };
}

function PositionSizer({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [capital, setCapital] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");

  const capNum = parseFloat(capital) || 0;
  const riskNum = parseFloat(riskPct) || 0;
  const entryNum = parseFloat(entry) || 0;
  const slNum = parseFloat(sl) || 0;

  const riskAmount = capNum * (riskNum / 100);
  const riskPerShare = Math.abs(entryNum - slNum);
  const qty = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const totalInv = qty * entryNum;
  const capitalAtRisk = qty * riskPerShare;
  const portfolioPct = capNum > 0 ? (totalInv / capNum) * 100 : 0;

  const s = StyleSheet.create({
    label: { fontSize: 13, color: colors.mutedForeground, fontWeight: "600", marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: colors.muted, borderRadius: 10, padding: 14,
      color: colors.foreground, fontSize: 16, borderWidth: 1, borderColor: colors.border,
    },
    riskRow: { flexDirection: "row", gap: 8, marginTop: 6 },
    riskBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    riskBtnText: { fontSize: 13, fontWeight: "700" },
    resultCard: {
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1,
      borderColor: colors.primary + "50", padding: 16, marginTop: 20,
    },
    resultTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 12 },
    resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    resultCell: { width: "47%", backgroundColor: colors.muted, borderRadius: 10, padding: 12, alignItems: "center" },
    resultValue: { fontSize: 22, fontWeight: "800" },
    resultLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    warning: {
      backgroundColor: "#78350F20", borderRadius: 8, padding: 10, marginTop: 10,
      borderWidth: 1, borderColor: "#F59E0B40",
    },
    warningText: { fontSize: 12, color: colors.amber },
    disclaimer: { fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginTop: 16 },
    infoCard: {
      backgroundColor: "#1A2F1A", borderRadius: 10, borderWidth: 1,
      borderColor: "#22C55E30", padding: 12, marginTop: 4,
    },
    infoTitle: { fontSize: 13, fontWeight: "700", color: "#22C55E", marginBottom: 4 },
    infoText: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  });

  return (
    <View>
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>📐 What is Position Sizing?</Text>
        <Text style={s.infoText}>Position sizing tells you exactly how many shares to buy so that if your stop-loss is hit, you lose no more than your predefined risk amount.</Text>
      </View>

      <Text style={s.label}>Total Capital (₹)</Text>
      <TextInput style={s.input} placeholder="e.g. 500000" placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad" value={capital} onChangeText={setCapital} />

      <Text style={s.label}>Risk per Trade (%)</Text>
      <TextInput style={s.input} placeholder="1" placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad" value={riskPct} onChangeText={setRiskPct} />
      <View style={s.riskRow}>
        {["0.5", "1", "2", "3"].map(v => (
          <TouchableOpacity key={v} style={[s.riskBtn, {
            backgroundColor: riskPct === v ? colors.primary : colors.muted,
            borderColor: riskPct === v ? colors.primary : colors.border,
          }]} onPress={() => setRiskPct(v)}>
            <Text style={[s.riskBtnText, { color: riskPct === v ? colors.primaryForeground : colors.mutedForeground }]}>{v}%</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Entry Price (₹)</Text>
      <TextInput style={s.input} placeholder="e.g. 2450" placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad" value={entry} onChangeText={setEntry} />

      <Text style={s.label}>Stop-Loss Price (₹)</Text>
      <TextInput style={s.input} placeholder="e.g. 2420" placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad" value={sl} onChangeText={setSl} />

      {qty > 0 && (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>📊 Position Size Result</Text>
          <View style={s.resultGrid}>
            <View style={[s.resultCell, { backgroundColor: "#1A2F1A" }]}>
              <Text style={[s.resultValue, { color: "#22C55E" }]}>{qty.toLocaleString("en-IN")}</Text>
              <Text style={s.resultLabel}>Shares to Buy</Text>
            </View>
            <View style={s.resultCell}>
              <Text style={s.resultValue}>₹{fmt(totalInv, 0)}</Text>
              <Text style={s.resultLabel}>Total Investment</Text>
            </View>
            <View style={[s.resultCell, { backgroundColor: "#2F1A1A" }]}>
              <Text style={[s.resultValue, { color: "#F87171" }]}>₹{fmt(capitalAtRisk, 0)}</Text>
              <Text style={s.resultLabel}>Capital at Risk</Text>
            </View>
            <View style={s.resultCell}>
              <Text style={[s.resultValue, { color: colors.amber }]}>{fmt(portfolioPct, 1)}%</Text>
              <Text style={s.resultLabel}>Portfolio Conc.</Text>
            </View>
          </View>
          {portfolioPct > 20 && (
            <View style={s.warning}>
              <Text style={s.warningText}>⚠️ {fmt(portfolioPct, 1)}% concentration is high. Keep single positions under 15%.</Text>
            </View>
          )}
        </View>
      )}
      <Text style={s.disclaimer}>For educational purposes only. Always do your own analysis.</Text>
    </View>
  );
}

function OptionGreeks({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [S, setS] = useState("");
  const [K, setK] = useState("");
  const [T, setT] = useState("");
  const [sigma, setSigma] = useState("");
  const [r, setR] = useState("6.5");

  const result = blackScholes(
    parseFloat(S) || 0,
    parseFloat(K) || 0,
    (parseFloat(T) || 0) / 365,
    (parseFloat(r) || 0) / 100,
    (parseFloat(sigma) || 0) / 100
  );

  const s = StyleSheet.create({
    label: { fontSize: 13, color: colors.mutedForeground, fontWeight: "600", marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: colors.muted, borderRadius: 10, padding: 14,
      color: colors.foreground, fontSize: 16, borderWidth: 1, borderColor: colors.border,
    },
    row: { flexDirection: "row", gap: 10 },
    half: { flex: 1 },
    resultCard: {
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1,
      borderColor: colors.primary + "50", padding: 16, marginTop: 20,
    },
    resultTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 12 },
    priceRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
    priceCell: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center" },
    priceLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: "600" },
    priceValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },
    greekRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    greekName: { fontSize: 14, fontWeight: "700", color: colors.foreground, width: 80 },
    greekCall: { fontSize: 14, fontWeight: "600", color: "#22C55E", width: 90, textAlign: "right" },
    greekPut: { fontSize: 14, fontWeight: "600", color: "#F87171", width: 90, textAlign: "right" },
    greekHead: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase" },
    disclaimer: { fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginTop: 16 },
  });

  return (
    <View>
      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.label}>Underlying Price (S)</Text>
          <TextInput style={s.input} placeholder="e.g. 22000" placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad" value={S} onChangeText={setS} />
        </View>
        <View style={s.half}>
          <Text style={s.label}>Strike Price (K)</Text>
          <TextInput style={s.input} placeholder="e.g. 22000" placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad" value={K} onChangeText={setK} />
        </View>
      </View>

      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.label}>Days to Expiry</Text>
          <TextInput style={s.input} placeholder="e.g. 7" placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad" value={T} onChangeText={setT} />
        </View>
        <View style={s.half}>
          <Text style={s.label}>IV % (σ)</Text>
          <TextInput style={s.input} placeholder="e.g. 15" placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad" value={sigma} onChangeText={setSigma} />
        </View>
      </View>

      <Text style={s.label}>Risk-Free Rate % (r)</Text>
      <TextInput style={s.input} placeholder="6.5" placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad" value={r} onChangeText={setR} />

      {result && (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>Black-Scholes Results</Text>
          <View style={s.priceRow}>
            <View style={[s.priceCell, { backgroundColor: "#1A2F1A" }]}>
              <Text style={s.priceLabel}>Call Price</Text>
              <Text style={[s.priceValue, { color: "#22C55E" }]}>₹{fmt(result.callPrice)}</Text>
            </View>
            <View style={[s.priceCell, { backgroundColor: "#2F1A1A" }]}>
              <Text style={s.priceLabel}>Put Price</Text>
              <Text style={[s.priceValue, { color: "#F87171" }]}>₹{fmt(result.putPrice)}</Text>
            </View>
          </View>

          <View style={[s.greekRow, { paddingBottom: 6 }]}>
            <Text style={s.greekName}>Greek</Text>
            <Text style={s.greekCall}>Call</Text>
            <Text style={s.greekPut}>Put</Text>
          </View>
          {[
            { name: "Delta (Δ)", call: fmt(result.delta_call, 4), put: fmt(result.delta_put, 4) },
            { name: "Gamma (Γ)", call: fmt(result.gamma, 6), put: fmt(result.gamma, 6) },
            { name: "Theta (Θ)", call: fmt(result.theta_call, 2), put: "—" },
            { name: "Vega (ν)", call: fmt(result.vega, 4), put: fmt(result.vega, 4) },
          ].map(g => (
            <View key={g.name} style={s.greekRow}>
              <Text style={s.greekName}>{g.name}</Text>
              <Text style={s.greekCall}>{g.call}</Text>
              <Text style={s.greekPut}>{g.put}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={s.disclaimer}>Black-Scholes model. For educational purposes only.</Text>
    </View>
  );
}

export default function CalculatorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"position" | "greeks">("position");

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    tabRow: {
      flexDirection: "row", padding: 12, gap: 8,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
    tabText: { fontSize: 14, fontWeight: "700" },
    content: { padding: 16, paddingBottom: insets.bottom + 80 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Calculators</Text>
        <Text style={s.subtitle}>Professional risk management tools</Text>
      </View>

      <View style={s.tabRow}>
        {[
          { key: "position" as const, label: "Position Sizer" },
          { key: "greeks" as const, label: "Option Greeks" },
        ].map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={[s.tab, {
              backgroundColor: active ? colors.primary : colors.muted,
              borderColor: active ? colors.primary : colors.border,
            }]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[s.tabText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.content}>
            {activeTab === "position" ? (
              <PositionSizer colors={colors} />
            ) : (
              <OptionGreeks colors={colors} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
