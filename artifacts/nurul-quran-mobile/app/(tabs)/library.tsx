import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LectureCard } from "@/components/LectureCard";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { useColors } from "@/hooks/useColors";
import { useAudio } from "@/context/AudioContext";
import { useGetLectures } from "@workspace/api-client-react";

const CATEGORIES = ["All", "Fiqh", "Aqeedah", "Tafseer", "Seerah", "Hadith", "Arabic"];

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { play, currentTrack, isPlaying, pause, resume } = useAudio();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetLectures({
    search: search || undefined,
    category: category || undefined,
    limit: 50,
    offset: 0,
  });

  const lectures = data?.lectures ?? [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.tealDark }]}>
        <Text style={styles.screenTitle}>Lecture Library</Text>
        <Text style={styles.screenSub}>{data?.total ?? 0} lectures available</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search lectures..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        renderItem={({ item }) => {
          const active = item === "All" ? !category : category === item;
          return (
            <Pressable
              onPress={() => setCategory(item === "All" ? null : item)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: active ? colors.teal : colors.card,
                  borderColor: active ? colors.teal : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.mutedForeground }]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : lectures.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No lectures found</Text>
        </View>
      ) : (
        <FlatList
          data={lectures}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 84 + 16,
            paddingTop: 4,
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
                onPress={() => {
                  if (isActive && isPlaying) {
                    pause();
                  } else if (isActive && !isPlaying) {
                    resume();
                  } else {
                    play({
                      id: String(item.id),
                      title: item.title,
                      scholar: item.speakerName ?? "Unknown Scholar",
                      audioUrl: (item as any).audioUrl,
                    });
                  }
                }}
                horizontal
              />
            );
          }}
        />
      )}
      <AudioPlayerBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  screenSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
