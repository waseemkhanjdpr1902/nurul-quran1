import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function getNextPrayer(): { name: string; timeLeft: string } {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;

  const times = [5 * 60, 13 * 60, 16 * 60 + 30, 19 * 60, 21 * 60];
  for (let i = 0; i < times.length; i++) {
    if (totalMin < times[i]) {
      const diff = times[i] - totalMin;
      const dh = Math.floor(diff / 60);
      const dm = diff % 60;
      return {
        name: PRAYER_NAMES[i],
        timeLeft: dh > 0 ? `${dh}h ${dm}m` : `${dm}m`,
      };
    }
  }
  const diff = 24 * 60 - totalMin + times[0];
  const dh = Math.floor(diff / 60);
  const dm = diff % 60;
  return { name: PRAYER_NAMES[0], timeLeft: dh > 0 ? `${dh}h ${dm}m` : `${dm}m` };
}

export function PrayerTimesBanner() {
  const colors = useColors();
  const [prayer, setPrayer] = useState(getNextPrayer());

  useEffect(() => {
    const interval = setInterval(() => setPrayer(getNextPrayer()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.teal }]}>
      <Feather name="clock" size={14} color="rgba(255,255,255,0.8)" />
      <Text style={styles.text}>
        Next: <Text style={styles.bold}>{prayer.name}</Text> in {prayer.timeLeft}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  bold: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
});
