import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { CourseCard } from "@/components/CourseCard";
import { useColors } from "@/hooks/useColors";
import { useGetCourses } from "@workspace/api-client-react";

const CATEGORIES = ["All", "Fiqh", "Aqeedah", "Tafseer", "Seerah", "Hadith", "Arabic"];

export default function CoursesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<string | null>(null);

  const { data: allCourses = [], isLoading, refetch } = useGetCourses({
    category: category || undefined,
  });

  const courses = allCourses.filter((c) => (c.lectureCount ?? 0) > 0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.tealDark }]}>
        <Text style={styles.screenTitle}>Islamic Courses</Text>
        <Text style={styles.screenSub}>{courses.length} courses available</Text>
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
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
      ) : courses.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="layers" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No courses found</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 84 + 16,
            paddingTop: 4,
          }}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <CourseCard
              course={{
                id: item.id,
                title: item.title,
                description: item.description ?? undefined,
                totalLectures: item.lectureCount ?? undefined,
                isPremium: item.isPremium ?? false,
                category: item.category ?? undefined,
              }}
              onPress={() => router.push(`/course/${item.id}` as any)}
            />
          )}
        />
      )}
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
