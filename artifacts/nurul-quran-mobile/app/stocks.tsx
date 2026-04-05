import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface HalalStock {
  symbol: string;
  name: string;
  sector: string;
  reason: string;
  screening: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3b82f6",
  Healthcare: "#10b981",
  Consumer: "#f59e0b",
  "Financial Services": "#8b5cf6",
  Industrials: "#6b7280",
  "Clean Energy": "#22c55e",
};

function StockCard({ stock }: { stock: HalalStock }) {
  const colors = useColors();
  const isPositive = (stock.change ?? 0) >= 0;
  const sectorColor = SECTOR_COLORS[stock.sector] || "#6b7280";

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardTop}>
        <View style={styles.symbolBox}>
          <Text style={[styles.symbol, { color: colors.teal || "#1a7c6e" }]}>
            {stock.symbol}
          </Text>
          <View style={[styles.sectorBadge, { backgroundColor: sectorColor + "20" }]}>
            <Text style={[styles.sectorText, { color: sectorColor }]}>
              {stock.sector}
            </Text>
          </View>
        </View>
        <View style={styles.priceBox}>
          {stock.price != null ? (
            <>
              <Text style={[styles.price, { color: colors.text }]}>
                ${stock.price.toFixed(2)}
              </Text>
              <View
                style={[
                  styles.changeBadge,
                  { backgroundColor: isPositive ? "#dcfce7" : "#fee2e2" },
                ]}
              >
                <Feather
                  name={isPositive ? "trending-up" : "trending-down"}
                  size={10}
                  color={isPositive ? "#16a34a" : "#dc2626"}
                />
                <Text
                  style={[
                    styles.changeText,
                    { color: isPositive ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {isPositive ? "+" : ""}
                  {(stock.changePercent ?? 0).toFixed(2)}%
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.price, { color: colors.mutedForeground }]}>—</Text>
          )}
        </View>
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{stock.name}</Text>
      <View style={styles.halalRow}>
        <Feather name="check-circle" size={13} color="#16a34a" />
        <Text style={[styles.reason, { color: colors.mutedForeground }]}>
          {stock.reason}
        </Text>
      </View>
    </View>
  );
}

export default function StocksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");

  const { data, isLoading, error } = useQuery<HalalStock[]>({
    queryKey: ["halal-stocks"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/halal-stocks`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.stocks ?? json ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: sectors = [] } = useQuery<string[]>({
    queryKey: ["halal-stocks-sectors"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/halal-stocks/sectors`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.sectors ?? json ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const allSectors = sectors.length > 0 ? sectors : ["All"];

  const filtered = (data || []).filter((s) => {
    const matchSector = selectedSector === "All" || s.sector === selectedSector;
    const matchSearch =
      !search ||
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    return matchSector && matchSearch;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.teal || "#1a7c6e",
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Halal Stock Screener</Text>
          <Text style={styles.headerSub}>Shariah-compliant equities</Text>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search stocks..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {allSectors.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectorList}
        >
          {allSectors.map((sector) => (
            <Pressable
              key={sector}
              onPress={() => setSelectedSector(sector)}
              style={[
                styles.sectorBtn,
                {
                  backgroundColor:
                    selectedSector === sector
                      ? colors.teal || "#1a7c6e"
                      : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectorBtnText,
                  {
                    color:
                      selectedSector === sector ? "#fff" : colors.text,
                  },
                ]}
              >
                {sector}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.teal || "#1a7c6e"} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading stocks...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Failed to load stocks
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}
        >
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} Shariah-compliant {filtered.length === 1 ? "stock" : "stocks"}
          </Text>
          {filtered.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 1,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  sectorList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sectorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sectorBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  count: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  symbolBox: {
    gap: 4,
  },
  symbol: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  sectorText: {
    fontSize: 10,
    fontWeight: "600",
  },
  priceBox: {
    alignItems: "flex-end",
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
  },
  halalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 2,
  },
  reason: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});
