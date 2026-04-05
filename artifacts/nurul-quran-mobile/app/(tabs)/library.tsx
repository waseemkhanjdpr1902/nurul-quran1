import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LectureCard } from "@/components/LectureCard";
import { useColors } from "@/hooks/useColors";
import { useAudio } from "@/context/AudioContext";
import { useGetLectures } from "@workspace/api-client-react";

type Category = {
  label: string;
  value: string | null;
  color: string;
  bg: string;
  icon: string;
};

const CATEGORIES: Category[] = [
  { label: "All",     value: null,       color: "#0D4A3E", bg: "#E0F2EE", icon: "grid"       },
  { label: "Fiqh",    value: "Fiqh",     color: "#166534", bg: "#DCFCE7", icon: "book"        },
  { label: "Aqeedah", value: "Aqeedah",  color: "#1E40AF", bg: "#DBEAFE", icon: "star"        },
  { label: "Tafseer", value: "Tafseer",  color: "#6B21A8", bg: "#F3E8FF", icon: "feather"     },
  { label: "Seerah",  value: "Seerah",   color: "#9A3412", bg: "#FFEDD5", icon: "user"        },
  { label: "Hadith",  value: "Hadith",   color: "#92400E", bg: "#FEF3C7", icon: "message-square" },
  { label: "Arabic",  value: "Arabic",   color: "#9F1239", bg: "#FFE4E6", icon: "type"        },
];

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { play, currentTrack, isPlaying, pause, resume } = useAudio();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const catScrollRef = useRef<ScrollView>(null);

  const { data, isLoading, refetch } = useGetLectures({
    search: search || undefined,
    category: category || undefined,
    limit: 79,
    offset: 0,
  });

  const lectures = data?.lectures ?? [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handlePlay = (item: any) => {
    const isActive = currentTrack?.id === String(item.id);
    if (isActive && isPlaying) {
      pause();
    } else if (isActive && !isPlaying) {
      resume();
    } else {
      const audioUrl = (item as any).audioUrl;
      if (!audioUrl) {
        Alert.alert(
          "No Audio Available",
          "Audio for this lecture is not yet available. Check back soon!",
          [{ text: "OK" }]
        );
        return;
      }
      play({
        id: String(item.id),
        title: item.title,
        scholar: item.speakerName ?? "Unknown Scholar",
        audioUrl,
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
            <Text style={styles.screenTitle}>Lecture Library</Text>
            <Text style={styles.screenSub}>{data?.total ?? 0} lectures</Text>
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
            placeholder="Search lectures..."
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
          {CATEGORIES.map((cat, idx) => {
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

        {/* Bottom accent line */}
        <View style={styles.headerAccent} />
      </View>

      {/* ── LECTURE LIST ── */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading lectures...</Text>
        </View>
      ) : lectures.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No lectures found</Text>
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
            paddingTop: 8,
          }}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => {
            const isActive = currentTrack?.id === String(item.id);
            return (
              <LectureCard
                lecture={{
                  id: item.id,
                  title: item.title,
                  speaker: item.speakerName ?? undefined,
                  duration: item.duration ?? undefined,
                  category: item.category ?? undefined,
                  isPremium: item.isPremium ?? false,
                  language: item.language ?? undefined,
                }}
                isPlaying={isActive && isPlaying}
                onPress={() => handlePlay(item)}
                horizontal
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Sticky header ── */
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

  /* ── Search ── */
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

  /* ── Category tabs ── */
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

  /* ── States ── */
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
});
