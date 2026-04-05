import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetLectures } from "@workspace/api-client-react";

type Category = {
  label: string;
  value: string | null;
  color: string;
  bg: string;
  icon: string;
};

const CATEGORIES: Category[] = [
  { label: "All",            value: null,             color: "#0D4A3E", bg: "#E0F2EE", icon: "grid"    },
  { label: "Arabic",         value: "Arabic",         color: "#9F1239", bg: "#FFE4E6", icon: "type"    },
  { label: "Quranic Arabic", value: "Quranic Arabic", color: "#1E40AF", bg: "#DBEAFE", icon: "book"    },
  { label: "Arabic Grammar", value: "Arabic Grammar", color: "#6B21A8", bg: "#F3E8FF", icon: "feather" },
];

function formatDuration(secs?: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const catScrollRef = useRef<ScrollView>(null);

  const { data, isLoading, refetch } = useGetLectures({
    search: search || undefined,
    category: category || undefined,
    limit: 50,
    offset: 0,
  });

  const lectures = data?.lectures ?? [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleOpen = async (item: any) => {
    const youtubeUrl = (item as any).youtubeUrl;
    if (youtubeUrl) {
      await WebBrowser.openBrowserAsync(youtubeUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    }
  };

  const activeCat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── STICKY HEADER ── */}
      <View style={[styles.stickyHeader, { paddingTop: topPad + 12, backgroundColor: colors.tealDark }]}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.screenTitle}>Arabic Learning</Text>
            <Text style={styles.screenSub}>{data?.total ?? 0} free video lessons</Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: activeCat.bg }]}>
            <Text style={[styles.activeBadgeText, { color: activeCat.color }]}>
              {activeCat.label}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="search" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search lessons..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>

        {/* Category filter tabs */}
        <ScrollView
          ref={catScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = cat.value === category;
            return (
              <Pressable
                key={cat.label}
                onPress={() => setCategory(cat.value)}
                style={({ pressed }) => [
                  styles.catTab,
                  active && styles.catTabActive,
                  {
                    backgroundColor: active ? "#fff" : "rgba(255,255,255,0.12)",
                    borderColor: active ? "#fff" : "rgba(255,255,255,0.25)",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather
                  name={cat.icon as any}
                  size={13}
                  color={active ? cat.color : "rgba(255,255,255,0.8)"}
                />
                <Text
                  style={[
                    styles.catTabText,
                    { color: active ? cat.color : "rgba(255,255,255,0.9)" },
                    active && styles.catTabTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.headerAccent} />
      </View>

      {/* ── LECTURE LIST ── */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading lessons...</Text>
        </View>
      ) : lectures.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="youtube" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No lessons found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {search ? `No results for "${search}"` : "Try a different category"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={lectures}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 + 84 + 60 : 84 + 60 + 16,
            paddingTop: 12,
            paddingHorizontal: 16,
            gap: 12,
          }}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <VideoCard item={item as any} colors={colors} onPress={() => handleOpen(item)} />
          )}
        />
      )}
    </View>
  );
}

function VideoCard({ item, colors, onPress }: { item: any; colors: any; onPress: () => void }) {
  const thumb = item.thumbnailUrl;
  const catColor = CATEGORIES.find(c => c.value === item.category)?.color ?? "#0D4A3E";
  const catBg   = CATEGORIES.find(c => c.value === item.category)?.bg   ?? "#E0F2EE";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border ?? "#E5E7EB",
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* Thumbnail */}
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.tealLight ?? "#E0F2EE" }]}>
          <Feather name="youtube" size={28} color={colors.teal ?? "#0D9488"} />
        </View>
      )}

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardSpeaker, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.speakerName ?? "Unknown"}
        </Text>

        <View style={styles.cardMeta}>
          <View style={[styles.catBadge, { backgroundColor: catBg }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>{item.category}</Text>
          </View>
          {item.duration ? (
            <Text style={[styles.duration, { color: colors.mutedForeground }]}>
              {formatDuration(item.duration)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* YouTube play arrow */}
      <View style={styles.playBtn}>
        <Feather name="youtube" size={20} color="#FF0000" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  stickyHeader: {
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  screenSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  activeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  activeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#fff",
  },

  catScroll: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  catTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  catTabActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  catTabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  catTabTextActive: {
    fontFamily: "Inter_700Bold",
  },
  headerAccent: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  /* ── Video Card ── */
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  thumb: {
    width: 96,
    height: 72,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  cardSpeaker: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  duration: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  playBtn: {
    paddingRight: 14,
    paddingLeft: 6,
  },
});
