import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LectureCard } from "@/components/LectureCard";
import { PrayerTimesBanner } from "@/components/PrayerTimesBanner";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  useGetDailyAyah,
  useGetDashboardSummary,
  useGetFeaturedLectures,
  useGetRecentLectures,
} from "@workspace/api-client-react";

const QUICK_LINKS = [
  { icon: "book-open", label: "Quran", href: "/(tabs)/quran" },
  { icon: "play-circle", label: "Lectures", href: "/(tabs)/library" },
  { icon: "layers", label: "Courses", href: "/(tabs)/courses" },
  { icon: "star", label: "Premium", href: "/(tabs)/support" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: ayah, isLoading: ayahLoading } = useGetDailyAyah();
  const { data: summary } = useGetDashboardSummary();
  const { data: featured = [], isLoading: featuredLoading, refetch } = useGetFeaturedLectures();
  const { data: recent = [], isLoading: recentLoading } = useGetRecentLectures({ limit: 10 });

  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {user ? `As-salamu alaykum, ${user.name.split(" ")[0]}` : "As-salamu alaykum"}
            </Text>
            <Text style={styles.subGreeting}>May Allah bless your learning journey</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/support")} hitSlop={8}>
            {user?.isPremium ? (
              <View style={styles.premiumBadge}>
                <Feather name="star" size={14} color="#C8A04A" />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            ) : (
              <View style={styles.userCircle}>
                <Feather name="user" size={20} color="rgba(255,255,255,0.9)" />
              </View>
            )}
          </Pressable>
        </View>

        <PrayerTimesBanner />

        {summary && (
          <View style={styles.statsRow}>
            <StatBadge icon="play-circle" value={`${summary.totalLectures ?? 0}`} label="Lectures" />
            <StatBadge icon="layers" value={`${summary.totalCourses ?? 0}`} label="Courses" />
            <StatBadge icon="users" value={`${summary.totalSpeakers ?? 0}`} label="Scholars" />
          </View>
        )}
      </LinearGradient>

      {ayahLoading ? (
        <View style={[styles.ayahCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : ayah ? (
        <View style={[styles.ayahCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ayahHeader}>
            <Feather name="feather" size={16} color={colors.gold} />
            <Text style={[styles.ayahLabel, { color: colors.gold }]}>Ayah of the Day</Text>
            <Text style={[styles.ayahRef, { color: colors.mutedForeground }]}>
              {ayah.surahName} {ayah.surahNumber}:{ayah.ayahNumber}
            </Text>
          </View>
          <Text style={[styles.ayahArabic, { color: colors.foreground }]}>{ayah.arabicText}</Text>
          {ayah.translation && (
            <Text style={[styles.ayahTranslation, { color: colors.mutedForeground }]}>
              "{ayah.translation}"
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.quickLinks}>
        {QUICK_LINKS.map((link) => (
          <Pressable
            key={link.label}
            onPress={() => router.push(link.href as any)}
            style={({ pressed }) => [
              styles.quickLink,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name={link.icon as any} size={22} color={colors.teal} />
            </View>
            <Text style={[styles.quickLinkLabel, { color: colors.foreground }]}>{link.label}</Text>
          </Pressable>
        ))}
      </View>

      {(featuredLoading || featured.length > 0) && (
        <View style={styles.section}>
          <SectionHeader title="Featured Lectures" seeAllHref="/(tabs)/library" />
          {featuredLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => (
                <LectureCard
                  lecture={{
                    id: item.id,
                    title: item.title,
                    speaker: item.speakerName ?? undefined,
                    duration: item.duration ?? undefined,
                    isPremium: item.isPremium ?? false,
                  }}
                  onPress={() => router.push("/(tabs)/library")}
                />
              )}
              scrollEnabled={featured.length > 0}
            />
          )}
        </View>
      )}

      {(recentLoading || recent.length > 0) && (
        <View style={[styles.section, { marginBottom: Platform.OS === "web" ? 34 + 84 : 84 + 20 }]}>
          <SectionHeader title="Recent Lectures" seeAllHref="/(tabs)/library" />
          {recentLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            recent.slice(0, 5).map((item) => (
              <LectureCard
                key={item.id}
                lecture={{
                  id: item.id,
                  title: item.title,
                  speaker: item.speakerName ?? undefined,
                  duration: item.duration ?? undefined,
                  isPremium: item.isPremium ?? false,
                }}
                onPress={() => router.push("/(tabs)/library")}
                horizontal
              />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

function StatBadge({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statBadge}>
      <Feather name={icon as any} size={16} color="rgba(255,255,255,0.8)" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 20,
    gap: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(200,160,74,0.2)",
    borderWidth: 1,
    borderColor: "#C8A04A",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  premiumBadgeText: {
    color: "#C8A04A",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  userCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  statBadge: {
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  ayahCard: {
    margin: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  ayahHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ayahLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  ayahRef: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  ayahArabic: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    lineHeight: 38,
    writingDirection: "rtl",
  },
  ayahTranslation: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 20,
  },
  quickLinks: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickLink: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLinkLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: { marginBottom: 24 },
});
