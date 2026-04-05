import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAudio } from "@/context/AudioContext";
import { useColors } from "@/hooks/useColors";

export function AudioPlayerBar() {
  const { currentTrack, isPlaying, position, duration, pause, resume, stop } = useAudio();
  const colors = useColors();

  if (!currentTrack) return null;

  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.tealDark }]}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>

      <View style={styles.row}>
        {/* Track info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.scholar} numberOfLines={1}>{currentTrack.scholar}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {duration > 0 && (
            <Text style={styles.time}>{fmt(position)}</Text>
          )}
          <Pressable
            onPress={isPlaying ? pause : resume}
            style={styles.playBtn}
            hitSlop={8}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={stop} style={styles.stopBtn} hitSlop={8}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1,
    marginBottom: 8,
  },
  progressFill: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  scholar: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  time: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    minWidth: 30,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    padding: 4,
  },
});
