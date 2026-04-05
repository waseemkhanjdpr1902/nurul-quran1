import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudio } from "@/context/AudioContext";
import { useColors } from "@/hooks/useColors";

export function AudioPlayerBar() {
  const { currentTrack, isPlaying, position, duration, pause, resume, stop } = useAudio();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!currentTrack) return null;

  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.teal || "#1a7c6e" }]}>
      <View style={[styles.progress, { width: `${pct}%` as any }]} />
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.scholar} numberOfLines={1}>{currentTrack.scholar}</Text>
        </View>
        <View style={styles.controls}>
          <Text style={styles.time}>{fmt(position)}</Text>
          <Pressable
            onPress={isPlaying ? pause : resume}
            style={styles.playBtn}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={stop} style={styles.stopBtn}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  progress: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  scholar: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  time: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    minWidth: 32,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    padding: 4,
  },
});
