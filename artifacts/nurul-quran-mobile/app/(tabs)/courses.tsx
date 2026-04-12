import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const LEARN_SECTIONS = [
  {
    title: "The 5 Pillars of Islam", icon: "layers",
    items: [
      { name: "1. Shahada", desc: "The declaration of faith: There is no god but Allah, and Muhammad ﷺ is His messenger. This is the foundation of Islam." },
      { name: "2. Salah (Prayer)", desc: "Muslims pray 5 times daily — Fajr (dawn), Dhuhr (midday), Asr (afternoon), Maghrib (sunset), Isha (night). Prayer keeps you connected to Allah." },
      { name: "3. Zakat (Charity)", desc: "Giving 2.5% of your annual savings to those in need. It purifies wealth and helps the poor and needy in the community." },
      { name: "4. Sawm (Fasting)", desc: "Fasting from dawn to sunset during the month of Ramadan. It builds discipline, gratitude, and empathy for the hungry." },
      { name: "5. Hajj (Pilgrimage)", desc: "A once-in-a-lifetime journey to Makkah for those who are physically and financially able. Over 2 million Muslims perform it annually." },
    ],
  },
  {
    title: "6 Articles of Faith", icon: "star",
    items: [
      { name: "1. Belief in Allah", desc: "Believing in the One God — Allah — who has no partners, no children, and no equals. He is the Creator and Sustainer of everything." },
      { name: "2. Belief in Angels", desc: "Angels are created from light. They obey Allah perfectly. Jibreel (Gabriel) brought revelation; Mikail controls rain; Israfil will blow the trumpet on Judgement Day." },
      { name: "3. Belief in the Books", desc: "Allah revealed books to His messengers: Torah (Musa), Psalms (Dawud), Gospel (Isa), and the Quran (Muhammad ﷺ) — the final, preserved word of Allah." },
      { name: "4. Belief in the Prophets", desc: "Allah sent over 124,000 prophets including Adam, Nuh, Ibrahim, Musa, Isa and Muhammad ﷺ — the final messenger to all humanity." },
      { name: "5. Belief in the Day of Judgement", desc: "Every person will be resurrected and held accountable for their deeds. Those with good deeds enter Jannah (Paradise); those with evil deeds face Jahannam (Hell)." },
      { name: "6. Belief in Divine Decree", desc: "Everything that happens — good or bad — is by the will and knowledge of Allah. Muslims trust in Allah's plan (tawakkul) while still taking action." },
    ],
  },
  {
    title: "How to Perform Wudu", icon: "droplet",
    items: [
      { name: "1. Intention", desc: "Make intention (niyyah) in your heart to purify yourself for salah." },
      { name: "2. Wash Hands", desc: "Wash both hands up to the wrists three times, starting with the right." },
      { name: "3. Rinse Mouth", desc: "Rinse the mouth three times thoroughly." },
      { name: "4. Rinse Nose", desc: "Sniff water into the nose and blow it out, three times." },
      { name: "5. Wash Face", desc: "Wash the entire face three times from forehead to chin, ear to ear." },
      { name: "6. Wash Arms", desc: "Wash right arm up to the elbow (3×), then left arm (3×)." },
      { name: "7. Wipe Head", desc: "Wipe the entire head once with wet hands, front to back." },
      { name: "8. Wipe Ears", desc: "Wipe inside and behind both ears once with wet fingers." },
      { name: "9. Wash Feet", desc: "Wash right foot up to the ankle (3×), then left foot (3×)." },
    ],
  },
  {
    title: "How to Perform Salah", icon: "clock",
    items: [
      { name: "1. Make Wudu", desc: "Ensure you have proper ablution (wudu) before praying." },
      { name: "2. Face the Qibla", desc: "Turn to face the direction of the Kaaba in Makkah." },
      { name: "3. Intention", desc: "Make intention in your heart for which prayer you are performing." },
      { name: "4. Takbir", desc: "Raise both hands to your ears and say 'Allahu Akbar' (Allah is the Greatest)." },
      { name: "5. Qiyam (Standing)", desc: "Recite Al-Fatiha, then another surah. This is one raka'ah cycle." },
      { name: "6. Ruku (Bowing)", desc: "Bow with hands on knees, saying 'SubhanaRabbiyal 'Adheem' three times." },
      { name: "7. Sujud (Prostration)", desc: "Prostrate on 7 body parts (forehead, nose, hands, knees, toes), saying 'SubhanaRabbiyal A'la' three times." },
      { name: "8. Tashahhud", desc: "Sit after the 2nd raka'ah and recite the Tashahhud and Salawat." },
      { name: "9. Tasleem", desc: "End the prayer by turning head right and saying 'As-salamu alaykum wa rahmatullah', then left." },
    ],
  },
];

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[colors.tealDark, colors.teal]} style={[styles.header, { paddingTop: topPad + 20 }]}>
        <Text style={styles.headerTitle}>Learn Islam</Text>
        <Text style={styles.headerSub}>Pillars, Faith, Prayer, Wudu & more</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 84 + 20 }]}>
        {LEARN_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={[styles.secIcon, { backgroundColor: colors.tealLight }]}>
                <Feather name={section.icon as any} size={16} color={colors.teal} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            </View>

            {section.items.map((item) => {
              const key = `${section.title}-${item.name}`;
              const isOpen = expanded === key;
              return (
                <Pressable
                  key={item.name}
                  onPress={() => setExpanded(isOpen ? null : key)}
                  style={({ pressed }) => [styles.itemCard, { backgroundColor: colors.card, borderColor: isOpen ? colors.teal : colors.border, opacity: pressed ? 0.9 : 1 }]}
                >
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                  </View>
                  {isOpen && (
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
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
  content: { padding: 16, gap: 24 },
  sectionBlock: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  secIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  itemCard: { borderRadius: 14, borderWidth: 1.5, padding: 14 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  itemDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 10 },
});
