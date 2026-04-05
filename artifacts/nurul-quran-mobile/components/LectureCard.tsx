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
}

export function LectureCard({ lecture, onPress, horizontal }: LectureCardProps) {
  const colors = useColors();

  if (horizontal) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.horizontalCard,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.horizontalIcon, { backgroundColor: colors.tealLight }]}>
          <Feather name="play-circle" size={24} color={colors.teal} />
        </View>
        <View style={styles.horizontalContent}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
            {lecture.title}
          </Text>
          {lecture.speaker && (
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {lecture.speaker}
            </Text>
          )}
          <View style={styles.cardMeta}>
            {lecture.duration && (
              <View style={styles.metaItem}>
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{lecture.duration}</Text>
              </View>
            )}
            {lecture.isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
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
          {lecture.isPremium && (
            <View style={styles.premiumTag}>
              <Text style={styles.premiumTagText}>Premium</Text>
            </View>
          )}
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
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 140,
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
  cardBottom: {},
  cardTitleWhite: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardSubWhite: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
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
  horizontalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 12,
  },
  horizontalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
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
