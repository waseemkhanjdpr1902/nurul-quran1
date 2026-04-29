import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useLocalSearchParams, router } from "expo-router";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const BISMILLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

// Reciter IDs from cdn.islamic.network
const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Alafasy" },
  { id: "ar.abdurrahmaansudais", name: "Sudais" },
  { id: "ar.husary", name: "Husary" },
];

interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  translation?: string;
}

interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
}

// ── Fetch helpers ──────────────────────────────────────────────────────────────

async function fetchFromPrimary(surahId: string): Promise<[SurahData, SurahData]> {
  const [ar, en] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/surah/${surahId}`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`https://api.alquran.cloud/v1/surah/${surahId}/en.sahih`, { cache: "no-store" }).then((r) => r.json()),
  ]);
  if (ar.code === 200 && en.code === 200) return [ar.data, en.data];
  throw new Error("Primary API returned non-200");
}

async function fetchFromFallback(surahId: string): Promise<[SurahData, SurahData]> {
  // jsdelivr hosts quran-json which mirrors alquran.cloud structure
  const [ar, en] = await Promise.all([
    fetch(`https://cdn.jsdelivr.net/npm/quran-json@3.1.2/data/surah/ar/${surahId}.json`).then((r) => r.json()),
    fetch(`https://cdn.jsdelivr.net/npm/quran-json@3.1.2/data/surah/en/${surahId}.json`).then((r) => r.json()),
  ]);
  if (!ar || !en) throw new Error("Fallback API returned empty data");

  // quran-json uses a slightly different shape — normalise it
  const normalise = (data: any, isArabic: boolean): SurahData => ({
    number: data.id ?? Number(surahId),
    name: data.transliteration ?? data.name ?? "",
    englishName: data.transliteration ?? data.name ?? "",
    englishNameTranslation: data.translation ?? "",
    numberOfAyahs: data.total_verses ?? (data.verses?.length || 0),
    revelationType: data.type ?? "",
    ayahs: (data.verses ?? []).map((v: any, i: number) => ({
      number: (data.id - 1) * 1000 + i + 1,
      numberInSurah: i + 1,
      text: isArabic ? v.text : v.translation ?? v.text,
      translation: isArabic ? undefined : v.translation ?? v.text,
    })),
  });

  return [normalise(ar, true), normalise(en, false)];
}

// ── Custom hook ───────────────────────────────────────────────────────────────

function useQuranData(surahId: string, retry: number) {
  const [arabic, setArabic] = React.useState<SurahData | null>(null);
  const [english, setEnglish] = React.useState<SurahData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArabic(null);
    setEnglish(null);

    const load = async () => {
      try {
        // Try primary API first
        const [ar, en] = await fetchFromPrimary(surahId);
        if (!cancelled) {
          setArabic(ar);
          setEnglish(en);
        }
      } catch {
        // Primary failed — try fallback
        try {
          const [ar, en] = await fetchFromFallback(surahId);
          if (!cancelled) {
            setArabic(ar);
            setEnglish(en);
          }
        } catch {
          if (!cancelled) {
            setError("Could not load surah. Please check your internet connection and try again.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [surahId, retry]);

  return { arabic, english, loading, error };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SurahDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [retry, setRetry] = useState(0);
  const { arabic, english, loading, error } = useQuranData(id || "1", retry);

  const [showTranslation, setShowTranslation] = useState(true);
  const [reciterIdx, setReciterIdx] = useState(0);

  // Audio recitation state
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isReciting, setIsReciting] = useState(false);
  const [recitationLoading, setRecitationLoading] = useState(false);
  const [recitationPosition, setRecitationPosition] = useState(0);
  const [recitationDuration, setRecitationDuration] = useState(0);

  const showBismillah = Number(id) !== 9 && Number(id) !== 1;

  // Cleanup on unmount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Stop when changing surah
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
      setIsReciting(false);
      setRecitationPosition(0);
      setRecitationDuration(0);
    };
  }, [id]);

  const toggleRecitation = useCallback(async () => {
    if (recitationLoading) return;

    if (isReciting) {
      await soundRef.current?.pauseAsync();
      setIsReciting(false);
      return;
    }

    // If paused and sound exists, resume
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsReciting(true);
      return;
    }

    // Fresh load
    setRecitationLoading(true);
    try {
      const reciter = RECITERS[reciterIdx].id;
      const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${id}.mp3`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setRecitationPosition(status.positionMillis ?? 0);
            setRecitationDuration(status.durationMillis ?? 0);
            setIsReciting(status.isPlaying ?? false);
            if (status.didJustFinish) {
              setIsReciting(false);
              setRecitationPosition(0);
            }
          }
        }
      );
      soundRef.current = sound;
      setIsReciting(true);
    } catch {
      // silently fail
    } finally {
      setRecitationLoading(false);
    }
  }, [isReciting, recitationLoading, id, reciterIdx]);

  const stopRecitation = useCallback(async () => {
    await soundRef.current?.stopAsync();
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    setIsReciting(false);
    setRecitationPosition(0);
    setRecitationDuration(0);
  }, []);

  const cycleReciter = useCallback(async () => {
    await stopRecitation();
    setReciterIdx((i) => (i + 1) % RECITERS.length);
  }, [stopRecitation]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const pct = recitationDuration > 0 ? (recitationPosition / recitationDuration) * 100 : 0;

  const ayahs: Ayah[] = (arabic?.ayahs || []).map((a, i) => ({
    ...a,
    translation: english?.ayahs[i]?.text,
  }));

  const renderAyah = ({ item }: { item: Ayah }) => (
    <View style={[styles.ayahCard, { backgroundColor: colors.card }]}>
      <View style={styles.ayahHeader}>
        <View style={[styles.ayahNum, { backgroundColor: colors.teal }]}>
          <Text style={styles.ayahNumText}>{item.numberInSurah}</Text>
        </View>
      </View>
      <Text style={[styles.arabic, { color: colors.foreground }]}>{item.text}</Text>
      {showTranslation && item.translation ? (
        <Text style={[styles.translation, { color: colors.mutedForeground }]}>
          {item.translation}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.tealDark, paddingTop: insets.top + 12 },
        ]}
      >
        <Pressable
          onPress={() => { stopRecitation(); router.back(); }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          {arabic ? (
            <>
              <Text style={styles.headerTitle}>{arabic.englishName}</Text>
              <Text style={styles.headerSub}>
                {arabic.englishNameTranslation} · {arabic.numberOfAyahs} verses ·{" "}
                {arabic.revelationType}
              </Text>
            </>
          ) : (
            <Text style={styles.headerTitle}>Loading…</Text>
          )}
        </View>
        <Pressable
          onPress={() => setShowTranslation((v) => !v)}
          style={[
            styles.toggleBtn,
            { backgroundColor: showTranslation ? "rgba(255,255,255,0.25)" : "transparent" },
          ]}
        >
          <Text style={styles.toggleText}>EN</Text>
        </Pressable>
      </View>

      {/* ── Recitation Player ── */}
      <View style={[styles.playerBar, { backgroundColor: colors.teal }]}>
        {/* Progress */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>

        <View style={styles.playerRow}>
          {/* Reciter selector */}
          <Pressable onPress={cycleReciter} style={styles.reciterBtn}>
            <Feather name="mic" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.reciterText} numberOfLines={1}>
              {RECITERS[reciterIdx].name}
            </Text>
            <Feather name="chevron-right" size={12} color="rgba(255,255,255,0.6)" />
          </Pressable>

          {/* Time */}
          {recitationDuration > 0 && (
            <Text style={styles.timeText}>
              {fmt(recitationPosition)} / {fmt(recitationDuration)}
            </Text>
          )}

          {/* Play/Pause */}
          <Pressable
            onPress={toggleRecitation}
            disabled={recitationLoading || loading}
            style={styles.playPauseBtn}
          >
            {recitationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name={isReciting ? "pause" : "play"} size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading surah...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
          <Pressable
            onPress={() => setRetry((r) => r + 1)}
            style={[styles.actionBtn, { backgroundColor: colors.teal }]}
          >
            <Feather name="refresh-cw" size={15} color="#fff" />
            <Text style={styles.actionBtnText}>Try Again</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.actionBtn, { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={ayahs}
          keyExtractor={(a) => String(a.number)}
          renderItem={renderAyah}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 24,
          }}
          ListHeaderComponent={
            showBismillah ? (
              <View style={[styles.bismillahWrap, { backgroundColor: colors.card }]}>
                <Text style={[styles.bismillah, { color: colors.teal }]}>{BISMILLAH}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  toggleText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Recitation player
  playerBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 6,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 1,
    marginBottom: 8,
  },
  progressFill: {
    height: 2,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reciterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reciterText: {
    flex: 1,
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "500",
  },
  timeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    minWidth: 70,
    textAlign: "center",
  },
  playPauseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Content
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 140,
    justifyContent: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  bismillahWrap: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    alignItems: "center",
  },
  bismillah: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
  },
  ayahCard: { borderRadius: 14, padding: 16, gap: 10 },
  ayahHeader: { flexDirection: "row", justifyContent: "flex-end" },
  ayahNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  arabic: {
    fontSize: 22,
    textAlign: "right",
    lineHeight: 42,
    fontWeight: "400",
    writingDirection: "rtl",
  },
  translation: { fontSize: 13, lineHeight: 20 },
});
