import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  seeAllHref?: string;
}

export function SectionHeader({ title, onSeeAll, seeAllHref }: SectionHeaderProps) {
  const colors = useColors();

  const handleSeeAll = () => {
    if (onSeeAll) onSeeAll();
    else if (seeAllHref) router.push(seeAllHref as any);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {(onSeeAll || seeAllHref) && (
        <Pressable onPress={handleSeeAll} style={styles.seeAll} hitSlop={8}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
