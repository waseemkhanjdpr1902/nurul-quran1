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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SURAHS = [
  { number: 1, name: "Al-Fatiha", arabic: "الفاتحة", verses: 7, revelation: "Meccan" },
  { number: 2, name: "Al-Baqarah", arabic: "البقرة", verses: 286, revelation: "Medinan" },
  { number: 3, name: "Al-Imran", arabic: "آل عمران", verses: 200, revelation: "Medinan" },
  { number: 4, name: "An-Nisa", arabic: "النساء", verses: 176, revelation: "Medinan" },
  { number: 5, name: "Al-Maidah", arabic: "المائدة", verses: 120, revelation: "Medinan" },
  { number: 6, name: "Al-Anam", arabic: "الأنعام", verses: 165, revelation: "Meccan" },
  { number: 7, name: "Al-Araf", arabic: "الأعراف", verses: 206, revelation: "Meccan" },
  { number: 8, name: "Al-Anfal", arabic: "الأنفال", verses: 75, revelation: "Medinan" },
  { number: 9, name: "At-Tawbah", arabic: "التوبة", verses: 129, revelation: "Medinan" },
  { number: 10, name: "Yunus", arabic: "يونس", verses: 109, revelation: "Meccan" },
  { number: 11, name: "Hud", arabic: "هود", verses: 123, revelation: "Meccan" },
  { number: 12, name: "Yusuf", arabic: "يوسف", verses: 111, revelation: "Meccan" },
  { number: 13, name: "Ar-Ra'd", arabic: "الرعد", verses: 43, revelation: "Medinan" },
  { number: 14, name: "Ibrahim", arabic: "إبراهيم", verses: 52, revelation: "Meccan" },
  { number: 15, name: "Al-Hijr", arabic: "الحجر", verses: 99, revelation: "Meccan" },
  { number: 16, name: "An-Nahl", arabic: "النحل", verses: 128, revelation: "Meccan" },
  { number: 17, name: "Al-Isra", arabic: "الإسراء", verses: 111, revelation: "Meccan" },
  { number: 18, name: "Al-Kahf", arabic: "الكهف", verses: 110, revelation: "Meccan" },
  { number: 19, name: "Maryam", arabic: "مريم", verses: 98, revelation: "Meccan" },
  { number: 20, name: "Ta-Ha", arabic: "طه", verses: 135, revelation: "Meccan" },
  { number: 21, name: "Al-Anbiya", arabic: "الأنبياء", verses: 112, revelation: "Meccan" },
  { number: 22, name: "Al-Hajj", arabic: "الحج", verses: 78, revelation: "Medinan" },
  { number: 23, name: "Al-Muminun", arabic: "المؤمنون", verses: 118, revelation: "Meccan" },
  { number: 24, name: "An-Nur", arabic: "النور", verses: 64, revelation: "Medinan" },
  { number: 25, name: "Al-Furqan", arabic: "الفرقان", verses: 77, revelation: "Meccan" },
  { number: 26, name: "Ash-Shu'ara", arabic: "الشعراء", verses: 227, revelation: "Meccan" },
  { number: 27, name: "An-Naml", arabic: "النمل", verses: 93, revelation: "Meccan" },
  { number: 28, name: "Al-Qasas", arabic: "القصص", verses: 88, revelation: "Meccan" },
  { number: 29, name: "Al-Ankabut", arabic: "العنكبوت", verses: 69, revelation: "Meccan" },
  { number: 30, name: "Ar-Rum", arabic: "الروم", verses: 60, revelation: "Meccan" },
  { number: 31, name: "Luqman", arabic: "لقمان", verses: 34, revelation: "Meccan" },
  { number: 32, name: "As-Sajdah", arabic: "السجدة", verses: 30, revelation: "Meccan" },
  { number: 33, name: "Al-Ahzab", arabic: "الأحزاب", verses: 73, revelation: "Medinan" },
  { number: 34, name: "Saba", arabic: "سبأ", verses: 54, revelation: "Meccan" },
  { number: 35, name: "Fatir", arabic: "فاطر", verses: 45, revelation: "Meccan" },
  { number: 36, name: "Ya-Sin", arabic: "يس", verses: 83, revelation: "Meccan" },
  { number: 37, name: "As-Saffat", arabic: "الصافات", verses: 182, revelation: "Meccan" },
  { number: 38, name: "Sad", arabic: "ص", verses: 88, revelation: "Meccan" },
  { number: 39, name: "Az-Zumar", arabic: "الزمر", verses: 75, revelation: "Meccan" },
  { number: 40, name: "Ghafir", arabic: "غافر", verses: 85, revelation: "Meccan" },
  { number: 41, name: "Fussilat", arabic: "فصلت", verses: 54, revelation: "Meccan" },
  { number: 42, name: "Ash-Shura", arabic: "الشورى", verses: 53, revelation: "Meccan" },
  { number: 43, name: "Az-Zukhruf", arabic: "الزخرف", verses: 89, revelation: "Meccan" },
  { number: 44, name: "Ad-Dukhan", arabic: "الدخان", verses: 59, revelation: "Meccan" },
  { number: 45, name: "Al-Jathiyah", arabic: "الجاثية", verses: 37, revelation: "Meccan" },
  { number: 46, name: "Al-Ahqaf", arabic: "الأحقاف", verses: 35, revelation: "Meccan" },
  { number: 47, name: "Muhammad", arabic: "محمد", verses: 38, revelation: "Medinan" },
  { number: 48, name: "Al-Fath", arabic: "الفتح", verses: 29, revelation: "Medinan" },
  { number: 49, name: "Al-Hujurat", arabic: "الحجرات", verses: 18, revelation: "Medinan" },
  { number: 50, name: "Qaf", arabic: "ق", verses: 45, revelation: "Meccan" },
  { number: 51, name: "Adh-Dhariyat", arabic: "الذاريات", verses: 60, revelation: "Meccan" },
  { number: 52, name: "At-Tur", arabic: "الطور", verses: 49, revelation: "Meccan" },
  { number: 53, name: "An-Najm", arabic: "النجم", verses: 62, revelation: "Meccan" },
  { number: 54, name: "Al-Qamar", arabic: "القمر", verses: 55, revelation: "Meccan" },
  { number: 55, name: "Ar-Rahman", arabic: "الرحمن", verses: 78, revelation: "Medinan" },
  { number: 56, name: "Al-Waqiah", arabic: "الواقعة", verses: 96, revelation: "Meccan" },
  { number: 57, name: "Al-Hadid", arabic: "الحديد", verses: 29, revelation: "Medinan" },
  { number: 58, name: "Al-Mujadila", arabic: "المجادلة", verses: 22, revelation: "Medinan" },
  { number: 59, name: "Al-Hashr", arabic: "الحشر", verses: 24, revelation: "Medinan" },
  { number: 60, name: "Al-Mumtahanah", arabic: "الممتحنة", verses: 13, revelation: "Medinan" },
  { number: 61, name: "As-Saf", arabic: "الصف", verses: 14, revelation: "Medinan" },
  { number: 62, name: "Al-Jumuah", arabic: "الجمعة", verses: 11, revelation: "Medinan" },
  { number: 63, name: "Al-Munafiqun", arabic: "المنافقون", verses: 11, revelation: "Medinan" },
  { number: 64, name: "At-Taghabun", arabic: "التغابن", verses: 18, revelation: "Medinan" },
  { number: 65, name: "At-Talaq", arabic: "الطلاق", verses: 12, revelation: "Medinan" },
  { number: 66, name: "At-Tahrim", arabic: "التحريم", verses: 12, revelation: "Medinan" },
  { number: 67, name: "Al-Mulk", arabic: "الملك", verses: 30, revelation: "Meccan" },
  { number: 68, name: "Al-Qalam", arabic: "القلم", verses: 52, revelation: "Meccan" },
  { number: 69, name: "Al-Haqqah", arabic: "الحاقة", verses: 52, revelation: "Meccan" },
  { number: 70, name: "Al-Maarij", arabic: "المعارج", verses: 44, revelation: "Meccan" },
  { number: 71, name: "Nuh", arabic: "نوح", verses: 28, revelation: "Meccan" },
  { number: 72, name: "Al-Jinn", arabic: "الجن", verses: 28, revelation: "Meccan" },
  { number: 73, name: "Al-Muzzammil", arabic: "المزمل", verses: 20, revelation: "Meccan" },
  { number: 74, name: "Al-Muddaththir", arabic: "المدثر", verses: 56, revelation: "Meccan" },
  { number: 75, name: "Al-Qiyamah", arabic: "القيامة", verses: 40, revelation: "Meccan" },
  { number: 76, name: "Al-Insan", arabic: "الإنسان", verses: 31, revelation: "Medinan" },
  { number: 77, name: "Al-Mursalat", arabic: "المرسلات", verses: 50, revelation: "Meccan" },
  { number: 78, name: "An-Naba", arabic: "النبأ", verses: 40, revelation: "Meccan" },
  { number: 79, name: "An-Naziat", arabic: "النازعات", verses: 46, revelation: "Meccan" },
  { number: 80, name: "Abasa", arabic: "عبس", verses: 42, revelation: "Meccan" },
  { number: 81, name: "At-Takwir", arabic: "التكوير", verses: 29, revelation: "Meccan" },
  { number: 82, name: "Al-Infitar", arabic: "الانفطار", verses: 19, revelation: "Meccan" },
  { number: 83, name: "Al-Mutaffifin", arabic: "المطففين", verses: 36, revelation: "Meccan" },
  { number: 84, name: "Al-Inshiqaq", arabic: "الانشقاق", verses: 25, revelation: "Meccan" },
  { number: 85, name: "Al-Buruj", arabic: "البروج", verses: 22, revelation: "Meccan" },
  { number: 86, name: "At-Tariq", arabic: "الطارق", verses: 17, revelation: "Meccan" },
  { number: 87, name: "Al-Ala", arabic: "الأعلى", verses: 19, revelation: "Meccan" },
  { number: 88, name: "Al-Ghashiyah", arabic: "الغاشية", verses: 26, revelation: "Meccan" },
  { number: 89, name: "Al-Fajr", arabic: "الفجر", verses: 30, revelation: "Meccan" },
  { number: 90, name: "Al-Balad", arabic: "البلد", verses: 20, revelation: "Meccan" },
  { number: 91, name: "Ash-Shams", arabic: "الشمس", verses: 15, revelation: "Meccan" },
  { number: 92, name: "Al-Layl", arabic: "الليل", verses: 21, revelation: "Meccan" },
  { number: 93, name: "Ad-Duha", arabic: "الضحى", verses: 11, revelation: "Meccan" },
  { number: 94, name: "Ash-Sharh", arabic: "الشرح", verses: 8, revelation: "Meccan" },
  { number: 95, name: "At-Tin", arabic: "التين", verses: 8, revelation: "Meccan" },
  { number: 96, name: "Al-Alaq", arabic: "العلق", verses: 19, revelation: "Meccan" },
  { number: 97, name: "Al-Qadr", arabic: "القدر", verses: 5, revelation: "Meccan" },
  { number: 98, name: "Al-Bayyinah", arabic: "البينة", verses: 8, revelation: "Medinan" },
  { number: 99, name: "Az-Zalzalah", arabic: "الزلزلة", verses: 8, revelation: "Medinan" },
  { number: 100, name: "Al-Adiyat", arabic: "العاديات", verses: 11, revelation: "Meccan" },
  { number: 101, name: "Al-Qariah", arabic: "القارعة", verses: 11, revelation: "Meccan" },
  { number: 102, name: "At-Takathur", arabic: "التكاثر", verses: 8, revelation: "Meccan" },
  { number: 103, name: "Al-Asr", arabic: "العصر", verses: 3, revelation: "Meccan" },
  { number: 104, name: "Al-Humazah", arabic: "الهمزة", verses: 9, revelation: "Meccan" },
  { number: 105, name: "Al-Fil", arabic: "الفيل", verses: 5, revelation: "Meccan" },
  { number: 106, name: "Quraysh", arabic: "قريش", verses: 4, revelation: "Meccan" },
  { number: 107, name: "Al-Maun", arabic: "الماعون", verses: 7, revelation: "Meccan" },
  { number: 108, name: "Al-Kawthar", arabic: "الكوثر", verses: 3, revelation: "Meccan" },
  { number: 109, name: "Al-Kafirun", arabic: "الكافرون", verses: 6, revelation: "Meccan" },
  { number: 110, name: "An-Nasr", arabic: "النصر", verses: 3, revelation: "Medinan" },
  { number: 111, name: "Al-Masad", arabic: "المسد", verses: 5, revelation: "Meccan" },
  { number: 112, name: "Al-Ikhlas", arabic: "الإخلاص", verses: 4, revelation: "Meccan" },
  { number: 113, name: "Al-Falaq", arabic: "الفلق", verses: 5, revelation: "Meccan" },
  { number: 114, name: "An-Nas", arabic: "الناس", verses: 6, revelation: "Meccan" },
];

export default function QuranScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Meccan" | "Medinan">("All");

  const filtered = SURAHS.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.arabic.includes(search) ||
      String(s.number).includes(search);
    const matchFilter = filter === "All" || s.revelation === filter;
    return matchSearch && matchFilter;
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.tealDark }]}>
        <Text style={styles.screenTitle}>Al-Quran Al-Kareem</Text>
        <Text style={styles.screenSub}>114 Surahs</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search surah..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        {(["All", "Meccan", "Medinan"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: filter === f ? colors.teal : colors.card,
                borderColor: filter === f ? colors.teal : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? "#FFFFFF" : colors.mutedForeground },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.number)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 34 + 84 : 84 + 16,
          paddingHorizontal: 20,
          gap: 8,
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/surah/${item.number}` as any)}
            style={({ pressed }) => [
              styles.surahRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.surahNum, { backgroundColor: colors.teal }]}>
              <Text style={styles.surahNumText}>{item.number}</Text>
            </View>
            <View style={styles.surahInfo}>
              <Text style={[styles.surahName, { color: colors.foreground }]}>{item.name}</Text>
              <View style={styles.surahMeta}>
                <Text style={[styles.surahMetaText, { color: colors.mutedForeground }]}>
                  {item.verses} verses
                </Text>
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
                <Text
                  style={[
                    styles.surahMetaText,
                    { color: item.revelation === "Meccan" ? colors.teal : colors.gold },
                  ]}
                >
                  {item.revelation}
                </Text>
              </View>
            </View>
            <Text style={[styles.surahArabic, { color: colors.teal }]}>{item.arabic}</Text>
          </Pressable>
        )}
      />
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
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
  surahRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  surahNum: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  surahNumText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  surahInfo: { flex: 1 },
  surahName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  surahMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  surahMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  surahArabic: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
  },
});
