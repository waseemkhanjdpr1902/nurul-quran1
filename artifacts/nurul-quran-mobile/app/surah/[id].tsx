import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import React, { useState } from "react";
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

function useQuranData(surahId: string) {
  const [arabic, setArabic] = React.useState<SurahData | null>(null);
  const [english, setEnglish] = React.useState<SurahData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surahId}`).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${surahId}/en.sahih`).then((r) => r.json()),
    ])
      .then(([ar, en]) => {
        if (ar.code === 200 && en.code === 200) {
          setArabic(ar.data);
          setEnglish(en.data);
        } else {
          setError("Failed to load surah");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [surahId]);

  return { arabic, english, loading, error };
}

export default function SurahDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { arabic, english, loading, error } = useQuranData(id || "1");
  const [showTranslation, setShowTranslation] = useState(true);
  const showBismillah = Number(id) !== 9 && Number(id) !== 1;

  const ayahs: Ayah[] = (arabic?.ayahs || []).map((a, i) => ({
    ...a,
    translation: english?.ayahs[i]?.text,
  }));

  const renderAyah = ({ item }: { item: Ayah }) => (
    <View style={[styles.ayahCard, { backgroundColor: colors.card }]}>
      <View style={styles.ayahHeader}>
        <View
          style={[
            styles.ayahNum,
            { backgroundColor: colors.teal || "#1a7c6e" },
          ]}
        >
          <Text style={styles.ayahNumText}>{item.numberInSurah}</Text>
        </View>
      </View>
      <Text style={[styles.arabic, { color: colors.text }]}>{item.text}</Text>
      {showTranslation && item.translation ? (
        <Text style={[styles.translation, { color: colors.mutedForeground }]}>
          {item.translation}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.teal || "#1a7c6e",
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
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
            styles.translationToggle,
            {
              backgroundColor: showTranslation
                ? "rgba(255,255,255,0.25)"
                : "transparent",
              borderColor: "rgba(255,255,255,0.5)",
              borderWidth: 1,
            },
          ]}
        >
          <Text style={styles.toggleText}>EN</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.teal || "#1a7c6e"} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading surah...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.retryBtn, { backgroundColor: colors.teal || "#1a7c6e" }]}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
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
            paddingBottom: insets.bottom + 20,
          }}
          ListHeaderComponent={
            showBismillah ? (
              <View
                style={[
                  styles.bismillahWrap,
                  { backgroundColor: colors.card },
                ]}
              >
                <Text style={[styles.bismillah, { color: colors.teal || "#1a7c6e" }]}>
                  {BISMILLAH}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

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
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 1,
  },
  translationToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
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
  ayahCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  ayahHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  ayahNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahNumText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  arabic: {
    fontSize: 22,
    textAlign: "right",
    lineHeight: 40,
    fontWeight: "400",
  },
  translation: {
    fontSize: 13,
    lineHeight: 19,
  },
});
