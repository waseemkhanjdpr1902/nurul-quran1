import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Lecture {
  id: number;
  title: string;
  speaker?: string;
  duration?: string;
  category?: string;
  isPremium?: boolean;
  language?: string;
}

interface LectureCardProps {
  lecture: Lecture;
  onPress: () => void;
  horizontal?: boolean;
  isPlaying?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Fiqh: "#4CAF50",
  Aqeedah: "#2196F3",
  Tafseer: "#9C27B0",
  Seerah: "#FF9800",
  Hadith: "#F44336",
  Arabic: "#00BCD4",
};

export function LectureCard({ lecture, onPress, horizontal, isPlaying }: LectureCardProps) {
  const colors = useColors();
  const catColor = lecture.category ? (CATEGORY_COLORS[lecture.category] ?? colors.teal) : colors.teal;

  if (horizontal) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.horizontalCard,
          {
            backgroundColor: colors.card,
            borderColor: isPlaying ? colors.teal : colors.border,
            borderWidth: isPlaying ? 1.5 : 1,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {/* Play icon */}
        <View
          style={[
            styles.horizontalIcon,
            { backgroundColor: isPlaying ? colors.teal : colors.tealLight },
          ]}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={22}
            color={isPlaying ? "#FFFFFF" : colors.teal}
          />
        </View>

        {/* Info */}
        <View style={styles.horizontalContent}>
          <Text
            style={[styles.cardTitle, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {lecture.title}
          </Text>
          {lecture.speaker && (
            <Text
              style={[styles.cardSub, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {lecture.speaker}
            </Text>
          )}
          <View style={styles.cardMeta}>
            {lecture.category && (
              <View style={[styles.catBadge, { backgroundColor: catColor + "22" }]}>
                <View style={[styles.catDot, { backgroundColor: catColor }]} />
                <Text style={[styles.catText, { color: catColor }]}>
                  {lecture.category}
                </Text>
              </View>
            )}
            {lecture.duration && (
              <View style={styles.metaItem}>
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {lecture.duration}
                </Text>
              </View>
            )}
            {lecture.language && (
              <Text style={[styles.langBadge, { color: colors.mutedForeground, borderColor: colors.border }]}>
                {lecture.language}
              </Text>
            )}
            {lecture.isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
          </View>
        </View>

        <Feather
          name={isPlaying ? "pause-circle" : "chevron-right"}
          size={isPlaying ? 24 : 18}
          color={isPlaying ? colors.teal : colors.mutedForeground}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <LinearGradient
        colors={[colors.teal, colors.tealDark]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardTop}>
          <Feather name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
          <View style={styles.cardTopRight}>
            {lecture.category && (
              <View style={styles.catTag}>
                <Text style={styles.catTagText}>{lecture.category}</Text>
              </View>
            )}
            {lecture.isPremium && (
              <View style={styles.premiumTag}>
                <Text style={styles.premiumTagText}>Premium</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardTitleWhite} numberOfLines={2}>
            {lecture.title}
          </Text>
          {lecture.speaker && (
            <Text style={styles.cardSubWhite} numberOfLines={1}>
              {lecture.speaker}
            </Text>
          )}
          {lecture.duration && (
            <View style={styles.durationRow}>
              <Feather name="clock" size={11} color="rgba(255,255,255,0.6)" />
              <Text style={styles.durationText}>{lecture.duration}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTopRight: {
    gap: 4,
    alignItems: "flex-end",
  },
  cardBottom: { gap: 4 },
  cardTitleWhite: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  cardSubWhite: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  durationText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
  },
  catTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  catTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  premiumTag: {
    backgroundColor: "rgba(200,160,74,0.9)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },

  // Horizontal layout
  horizontalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  horizontalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  horizontalContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  cardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 3,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  catText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  langBadge: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  premiumBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
