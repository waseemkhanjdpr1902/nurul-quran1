import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrayerTimesBanner } from "@/components/PrayerTimesBanner";
import { useColors } from "@/hooks/useColors";

const DAILY_AYAHS = [
  { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "In the name of Allah, the Most Gracious, the Most Merciful.", ref: "Al-Fatiha 1:1" },
  { arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "All praise is due to Allah, Lord of all the worlds.", ref: "Al-Fatiha 1:2" },
  { arabic: "وَلَذِكْرُ اللَّهِ أَكْبَرُ", translation: "And the remembrance of Allah is greater.", ref: "Al-Ankabut 29:45" },
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship comes ease.", ref: "Ash-Sharh 94:6" },
  { arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", translation: "And He is with you wherever you are.", ref: "Al-Hadid 57:4" },
  { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", translation: "So remember Me; I will remember you.", ref: "Al-Baqarah 2:152" },
  { arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", translation: "And when My servants ask you about Me — indeed I am near.", ref: "Al-Baqarah 2:186" },
  { arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", translation: "Allah is sufficient for us, and He is the best Disposer of affairs.", ref: "Al-Imran 3:173" },
  { arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", translation: "Allah does not burden a soul beyond what it can bear.", ref: "Al-Baqarah 2:286" },
  { arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Indeed, Allah is with the patient.", ref: "Al-Baqarah 2:153" },
  { arabic: "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ", translation: "And it may be that you dislike a thing which is good for you.", ref: "Al-Baqarah 2:216" },
  { arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً", translation: "Our Lord, give us good in this world and good in the Hereafter.", ref: "Al-Baqarah 2:201" },
  { arabic: "وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ", translation: "And Allah loves the doers of good.", ref: "Al-Imran 3:134" },
  { arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا", translation: "And say: My Lord, increase me in knowledge.", ref: "Ta-Ha 20:114" },
  { arabic: "إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ", translation: "Allah will not change the condition of a people until they change what is in themselves.", ref: "Ar-Ra'd 13:11" },
  { arabic: "وَتَوَكَّلْ عَلَى اللَّهِ ۚ وَكَفَىٰ بِاللَّهِ وَكِيلًا", translation: "And put your trust in Allah. Sufficient is Allah as a Disposer of affairs.", ref: "Al-Ahzab 33:3" },
  { arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", translation: "O you who believe! Seek help through patience and prayer.", ref: "Al-Baqarah 2:153" },
  { arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", translation: "And whoever fears Allah — He will make for him a way out.", ref: "At-Talaq 65:2" },
  { arabic: "وَهُوَ الْغَفُورُ الرَّحِيمُ", translation: "And He is the Forgiving, the Merciful.", ref: "Yunus 10:107" },
  { arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ", translation: "Say: He is Allah, the One.", ref: "Al-Ikhlas 112:1" },
  { arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", translation: "Verily, in the remembrance of Allah do hearts find rest.", ref: "Ar-Ra'd 13:28" },
  { arabic: "وَاللَّهُ خَيْرُ الرَّازِقِينَ", translation: "And Allah is the best of providers.", ref: "Al-Jumu'ah 62:11" },
  { arabic: "رَبِّ اشْرَحْ لِي صَدْرِي", translation: "My Lord, expand for me my chest [with assurance].", ref: "Ta-Ha 20:25" },
  { arabic: "إِنَّ رَبَّكَ لَبِالْمِرْصَادِ", translation: "Indeed, your Lord is in observation.", ref: "Al-Fajr 89:14" },
  { arabic: "وَاللَّهُ يَعْلَمُ وَأَنتُمْ لَا تَعْلَمُونَ", translation: "Allah knows, and you do not know.", ref: "Al-Baqarah 2:232" },
  { arabic: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ", translation: "And do not despair of the mercy of Allah.", ref: "Yusuf 12:87" },
  { arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "For indeed, with hardship will be ease.", ref: "Ash-Sharh 94:5" },
  { arabic: "وَاللَّهُ وَلِيُّ الْمُؤْمِنِينَ", translation: "And Allah is the protector of the believers.", ref: "Al-Imran 3:68" },
  { arabic: "إِنَّ اللَّهَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", translation: "Indeed, Allah is over all things competent.", ref: "Al-Baqarah 2:20" },
  { arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا", translation: "Our Lord, do not let our hearts deviate after You have guided us.", ref: "Al-Imran 3:8" },
  { arabic: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ", translation: "My success is not but through Allah.", ref: "Hud 11:88" },
];

const QUICK_LINKS = [
  { icon: "book-open", label: "Quran", href: "/(tabs)/quran", color: "#1A6B5A" },
  { icon: "heart", label: "Duas", href: "/(tabs)/library", color: "#7C3AED" },
  { icon: "star", label: "Learn Islam", href: "/(tabs)/courses", color: "#B45309" },
  { icon: "globe", label: "Discover", href: "/discover", color: "#1E40AF" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const dayIndex = (today.getDate() - 1) % DAILY_AYAHS.length;
  const ayah = DAILY_AYAHS[dayIndex];

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>As-salamu alaykum</Text>
            <Text style={styles.subGreeting}>May Allah bless your learning journey</Text>
          </View>
          <View style={styles.userCircle}>
            <Feather name="sun" size={20} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        <PrayerTimesBanner />

        <View style={styles.statsRow}>
          <StatBadge icon="book-open" value="114" label="Surahs" />
          <StatBadge icon="star" value="8+" label="Tools" />
          <StatBadge icon="users" value="8K+" label="Listeners" />
        </View>
      </LinearGradient>

      {/* Ayah of the Day */}
      <View style={[styles.ayahCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.ayahHeader}>
          <Feather name="feather" size={16} color={colors.gold} />
          <Text style={[styles.ayahLabel, { color: colors.gold }]}>Ayah of the Day</Text>
          <Text style={[styles.ayahRef, { color: colors.mutedForeground }]}>{ayah.ref}</Text>
        </View>
        <Text style={[styles.ayahArabic, { color: colors.foreground }]}>{ayah.arabic}</Text>
        <Text style={[styles.ayahTranslation, { color: colors.mutedForeground }]}>
          "{ayah.translation}"
        </Text>
      </View>

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        {QUICK_LINKS.map((link) => (
          <Pressable
            key={link.label}
            onPress={() => router.push(link.href as any)}
            style={({ pressed }) => [
              styles.quickLink,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: link.color + "18" }]}>
              <Feather name={link.icon as any} size={22} color={link.color} />
            </View>
            <Text style={[styles.quickLinkLabel, { color: colors.foreground }]}>{link.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Da'wah Banner */}
      <Pressable
        onPress={() => router.push("/discover" as any)}
        style={({ pressed }) => [styles.dawahBanner, { opacity: pressed ? 0.92 : 1 }]}
      >
        <LinearGradient
          colors={["#1A6B5A", "#0D4A3E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dawahGradient}
        >
          <View style={styles.dawahLeft}>
            <Feather name="globe" size={22} color="#fff" />
          </View>
          <View style={styles.dawahText}>
            <Text style={styles.dawahTitle}>New to Islam?</Text>
            <Text style={styles.dawahSub}>
              Discover what Islam is all about — questions answered, step-by-step guide, and more.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {/* Islamic Reminders */}
      <View style={[styles.section, { marginBottom: Platform.OS === "web" ? 34 + 84 : 84 + 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Reminders</Text>
        {[
          { icon: "sun", text: "Recite Ayat al-Kursi after every prayer for protection." },
          { icon: "moon", text: "Read Surah Al-Mulk before sleeping — it intercedes on the Day of Judgement." },
          { icon: "heart", text: "Say SubhanAllah 33×, Alhamdulillah 33×, Allahu Akbar 34× after each prayer." },
          { icon: "star", text: "Recite Surah Al-Kahf every Friday for light between the two Fridays." },
        ].map((r) => (
          <View key={r.text} style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.reminderIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name={r.icon as any} size={16} color={colors.teal} />
            </View>
            <Text style={[styles.reminderText, { color: colors.mutedForeground }]}>{r.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function StatBadge({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statBadge}>
      <Feather name={icon as any} size={16} color="rgba(255,255,255,0.8)" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 20, gap: 12 },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  subGreeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  userCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  statsRow: { flexDirection: "row", justifyContent: "center", gap: 24, paddingHorizontal: 20, marginTop: 4 },
  statBadge: { alignItems: "center", gap: 3 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  ayahCard: { margin: 20, padding: 18, borderRadius: 16, borderWidth: 1, gap: 10 },
  ayahHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  ayahLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  ayahRef: { fontSize: 11, fontFamily: "Inter_400Regular" },
  ayahArabic: { fontSize: 22, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 38, writingDirection: "rtl" },
  ayahTranslation: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 20 },
  quickLinks: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  quickLink: { flex: 1, alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  quickLinkIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLinkLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dawahBanner: { marginHorizontal: 20, marginBottom: 20, borderRadius: 18, overflow: "hidden" },
  dawahGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  dawahLeft: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  dawahText: { flex: 1 },
  dawahTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  dawahSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", lineHeight: 17 },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  reminderCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  reminderIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", shrink: 0 } as any,
  reminderText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
