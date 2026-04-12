import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const DUAS = [
  {
    category: "Morning", icon: "sun",
    duas: [
      { title: "Waking Up", arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur", translation: "All praise is for Allah who gave us life after having taken it from us and unto Him is the resurrection." },
      { title: "Morning Dhikr", arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ", transliteration: "Asbahna wa asbahal mulku lillah walhamdu lillah", translation: "We have entered the morning and all sovereignty and all praise belongs to Allah." },
    ],
  },
  {
    category: "Evening", icon: "moon",
    duas: [
      { title: "Evening Dhikr", arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ", transliteration: "Amsayna wa amsal mulku lillah walhamdu lillah", translation: "We have entered the evening and all sovereignty and all praise belongs to Allah." },
      { title: "Before Sleeping", arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", transliteration: "Bismika allahumma amutu wa ahya", translation: "In Your name O Allah, I die and I live." },
    ],
  },
  {
    category: "After Prayer", icon: "clock",
    duas: [
      { title: "Tasbeeh", arabic: "سُبْحَانَ اللَّهِ ، الْحَمْدُ لِلَّهِ ، اللَّهُ أَكْبَرُ", transliteration: "SubhanAllah, Alhamdulillah, Allahu Akbar", translation: "Glory be to Allah (33×), Praise be to Allah (33×), Allah is the Greatest (34×)." },
      { title: "Entering Mosque", arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ", transliteration: "Allahumm-aftah li abwaba rahmatik", translation: "O Allah, open the gates of Your mercy for me." },
    ],
  },
  {
    category: "Daily Life", icon: "heart",
    duas: [
      { title: "Before Eating", arabic: "بِسْمِ اللَّهِ", transliteration: "Bismillah", translation: "In the name of Allah." },
      { title: "After Eating", arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ", transliteration: "Alhamdu lillahil-ladhi at'amana wa saqana wa ja'alana muslimin", translation: "All praise is for Allah who fed us, gave us drink, and made us Muslims." },
      { title: "For Anxiety", arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", transliteration: "Hasbunallahu wa ni'mal wakil", translation: "Allah is sufficient for us, and He is the best Disposer of affairs." },
    ],
  },
  {
    category: "Protection", icon: "shield",
    duas: [
      { title: "Ayat Al-Kursi", arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", transliteration: "Allahu la ilaha illa huwal hayyul qayyum", translation: "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. (Al-Baqarah 2:255)" },
      { title: "Against Evil", arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", translation: "I seek refuge in the perfect words of Allah from the evil of what He has created." },
    ],
  },
  {
    category: "Forgiveness", icon: "refresh-cw",
    duas: [
      { title: "Sayyid al-Istighfar", arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ", transliteration: "Allahumma anta rabbi la ilaha illa anta khalaqtani wa ana abduk", translation: "O Allah, You are my Lord. None has the right to be worshipped except You. You created me and I am your servant." },
      { title: "Seeking Forgiveness", arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", transliteration: "Astaghfirullahal-'adhim...", translation: "I seek forgiveness from Allah the Magnificent, the Living, the Sustainer, and I repent to Him." },
    ],
  },
];

export default function DuasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[colors.tealDark, colors.teal]} style={[styles.header, { paddingTop: topPad + 20 }]}>
        <Text style={styles.headerTitle}>Duas & Dhikr</Text>
        <Text style={styles.headerSub}>Essential supplications from Quran & Sunnah</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 84 + 20 }]}>
        {DUAS.map((cat) => (
          <View key={cat.category} style={styles.categoryBlock}>
            <View style={styles.categoryHeader}>
              <View style={[styles.catIcon, { backgroundColor: colors.tealLight }]}>
                <Feather name={cat.icon as any} size={16} color={colors.teal} />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{cat.category}</Text>
            </View>

            {cat.duas.map((dua) => {
              const key = `${cat.category}-${dua.title}`;
              const isOpen = expanded === key;
              return (
                <Pressable
                  key={dua.title}
                  onPress={() => setExpanded(isOpen ? null : key)}
                  style={({ pressed }) => [styles.duaCard, { backgroundColor: colors.card, borderColor: isOpen ? colors.teal : colors.border, opacity: pressed ? 0.9 : 1 }]}
                >
                  <View style={styles.duaRow}>
                    <Text style={[styles.duaTitle, { color: colors.foreground }]}>{dua.title}</Text>
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                  </View>
                  {isOpen && (
                    <View style={styles.duaBody}>
                      <Text style={[styles.duaArabic, { color: colors.foreground }]}>{dua.arabic}</Text>
                      <Text style={[styles.duaTranslit, { color: colors.teal }]}>{dua.transliteration}</Text>
                      <Text style={[styles.duaTrans, { color: colors.mutedForeground }]}>{dua.translation}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  content: { padding: 16, gap: 20 },
  categoryBlock: { gap: 10 },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  catIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  categoryTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  duaCard: { borderRadius: 14, borderWidth: 1.5, padding: 14 },
  duaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  duaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  duaBody: { marginTop: 12, gap: 8 },
  duaArabic: { fontSize: 20, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 34, writingDirection: "rtl" },
  duaTranslit: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  duaTrans: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
