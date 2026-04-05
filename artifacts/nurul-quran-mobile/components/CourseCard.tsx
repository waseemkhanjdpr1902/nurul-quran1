import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Course {
  id: number;
  title: string;
  description?: string;
  instructor?: string;
  totalLectures?: number;
  isPremium?: boolean;
  category?: string;
  difficulty?: string;
}

interface CourseCardProps {
  course: Course;
  onPress: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Fiqh: "book",
  Aqeedah: "star",
  Tafseer: "file-text",
  Seerah: "user",
  Hadith: "message-circle",
  Arabic: "globe",
  default: "layers",
};

export function CourseCard({ course, onPress }: CourseCardProps) {
  const colors = useColors();
  const iconName = (CATEGORY_ICONS[course.category ?? ""] ?? CATEGORY_ICONS.default) as any;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.tealLight }]}>
        <Feather name={iconName} size={22} color={colors.teal} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {course.title}
          </Text>
          {course.isPremium && (
            <View style={[styles.badge, { backgroundColor: colors.gold }]}>
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          )}
        </View>
        {course.description && (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {course.description}
          </Text>
        )}
        <View style={styles.meta}>
          {course.totalLectures != null && (
            <View style={styles.metaItem}>
              <Feather name="play-circle" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {course.totalLectures} lessons
              </Text>
            </View>
          )}
          {course.difficulty && (
            <View style={styles.metaItem}>
              <Feather name="bar-chart-2" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{course.difficulty}</Text>
            </View>
          )}
          {course.instructor && (
            <View style={styles.metaItem}>
              <Feather name="user" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {course.instructor}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 14,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
