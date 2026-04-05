import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface CourseDetail {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  isPremium?: boolean;
  lectureCount?: number;
  speakerName?: string | null;
}

interface Lecture {
  id: number;
  title: string;
  youtubeUrl?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  order?: number | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Islamic History": { bg: "#FEF3C7", text: "#92400E" },
  "Quran Recitation": { bg: "#DBEAFE", text: "#1E40AF" },
  "Word-to-Word": { bg: "#D1FAE5", text: "#065F46" },
  Tafseer: { bg: "#EDE9FE", text: "#5B21B6" },
  Fiqh: { bg: "#FEE2E2", text: "#991B1B" },
  Aqeedah: { bg: "#FEF9C3", text: "#713F12" },
  Hadith: { bg: "#E0F2FE", text: "#0C4A6E" },
  default: { bg: "#E0F2EE", text: "#0D4A3E" },
};

function formatDuration(secs?: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const courseId = parseInt(id ?? "0", 10);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: course, isLoading: courseLoading } = useQuery<CourseDetail>({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
    enabled: courseId > 0,
    staleTime: 60000,
  });

  const { data: lectures = [], isLoading: lecturesLoading } = useQuery<Lecture[]>({
    queryKey: ["course-lectures", courseId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/lectures`);
      if (!res.ok) throw new Error("Failed to load lectures");
      const data = await res.json();
      return Array.isArray(data) ? data : data.lectures ?? [];
    },
    enabled: courseId > 0,
    staleTime: 60000,
  });

  const handlePlay = async (lecture: Lecture) => {
    const url = lecture.youtubeUrl ?? lecture.audioUrl;
    if (!url) return;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  };

  const catStyle = CATEGORY_COLORS[course?.category ?? ""] ?? CATEGORY_COLORS.default;
  const isLoading = courseLoading || lecturesLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerContent}>
          <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
            <Text style={[styles.categoryText, { color: catStyle.text }]}>
              {course?.category ?? "Course"}
            </Text>
          </View>
          <Text style={styles.courseTitle} numberOfLines={3}>
            {courseLoading ? "Loading…" : course?.title ?? "Course"}
          </Text>
          {course?.speakerName ? (
            <View style={styles.speakerRow}>
              <Feather name="user" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={styles.speakerName}>{course.speakerName}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Feather name="play-circle" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText}>
              {lectures.length > 0 ? `${lectures.length} lessons` : course?.lectureCount ? `${course.lectureCount} lessons` : "Loading…"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading lessons…</Text>
        </View>
      ) : lectures.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="film" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Lessons Yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Content for this course is coming soon. Check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lectures}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Platform.OS === "web" ? 34 + 40 : insets.bottom + 40,
            gap: 10,
          }}
          ListHeaderComponent={() =>
            course?.description ? (
              <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.descText, { color: colors.foreground }]}>
                  {course.description}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <LectureRow
              lecture={item}
              index={index}
              colors={colors}
              onPress={() => handlePlay(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function LectureRow({
  lecture,
  index,
  colors,
  onPress,
}: {
  lecture: Lecture;
  index: number;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const hasYoutube = !!lecture.youtubeUrl;
  const hasAudio = !!lecture.audioUrl;
  const isPlayable = hasYoutube || hasAudio;

  return (
    <Pressable
      onPress={isPlayable ? onPress : undefined}
      style={({ pressed }) => [
        styles.lectureRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed && isPlayable ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.episodeNum, { backgroundColor: colors.tealLight }]}>
        <Text style={[styles.episodeNumText, { color: colors.teal }]}>{index + 1}</Text>
      </View>

      <View style={styles.lectureContent}>
        <Text style={[styles.lectureTitle, { color: colors.foreground }]} numberOfLines={2}>
          {lecture.title}
        </Text>
        {lecture.duration ? (
          <Text style={[styles.lectureDuration, { color: colors.mutedForeground }]}>
            {formatDuration(lecture.duration)}
          </Text>
        ) : null}
      </View>

      {isPlayable ? (
        <View style={[styles.playIcon, { backgroundColor: hasYoutube ? "#FF000015" : colors.tealLight }]}>
          <Feather
            name={hasYoutube ? "youtube" : "play"}
            size={18}
            color={hasYoutube ? "#FF0000" : colors.teal}
          />
        </View>
      ) : (
        <Feather name="lock" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerContent: {
    gap: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  courseTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 30,
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  speakerName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
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
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  descCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  lectureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  episodeNum: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  episodeNumText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  lectureContent: {
    flex: 1,
    gap: 3,
  },
  lectureTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  lectureDuration: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
