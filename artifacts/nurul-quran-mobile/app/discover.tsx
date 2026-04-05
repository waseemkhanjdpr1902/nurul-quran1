import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PILLARS = [
  {
    number: "1",
    name: "Shahada",
    arabic: "الشهادة",
    desc: "Declaration of Faith — There is no god but Allah, and Muhammad is His messenger.",
    icon: "feather",
  },
  {
    number: "2",
    name: "Salah",
    arabic: "الصلاة",
    desc: "Prayer — Muslims pray 5 times a day, facing Makkah, to stay connected with Allah.",
    icon: "clock",
  },
  {
    number: "3",
    name: "Zakat",
    arabic: "الزكاة",
    desc: "Charity — Giving 2.5% of savings annually to support the poor and needy.",
    icon: "heart",
  },
  {
    number: "4",
    name: "Sawm",
    arabic: "الصوم",
    desc: "Fasting — Abstaining from food & drink from dawn to sunset during Ramadan.",
    icon: "moon",
  },
  {
    number: "5",
    name: "Hajj",
    arabic: "الحج",
    desc: "Pilgrimage — A once-in-a-lifetime journey to Makkah for those who are able.",
    icon: "map-pin",
  },
];

const FAQS = [
  {
    q: "Is Allah the same as God?",
    a: "Yes! Allah is simply the Arabic word for God — the same God worshipped by Abraham, Moses, and Jesus (peace be upon them all). Arab Christians also call God 'Allah'.",
  },
  {
    q: "Who was Prophet Muhammad ﷺ?",
    a: "Muhammad ﷺ was the final messenger of God, born in Makkah (570 CE). He received divine revelation which forms the Quran. He is deeply loved by 1.8 billion Muslims but is not worshipped.",
  },
  {
    q: "What is the Quran?",
    a: "The Quran is the literal word of God, revealed to Prophet Muhammad ﷺ over 23 years. It has been preserved letter-for-letter for 1,400+ years. You can read it right here in this app!",
  },
  {
    q: "Do Muslims worship Muhammad ﷺ?",
    a: "No. Muslims worship only Allah (God), not any human, angel, or creation. Prophet Muhammad ﷺ is respected and followed as a messenger, not worshipped.",
  },
  {
    q: "Can I become Muslim?",
    a: "Absolutely! Islam is for all of humanity regardless of race, nationality, or past. To become Muslim, you simply declare the Shahada (the statement of faith) with sincerity.",
  },
  {
    q: "Is Islam a religion of peace?",
    a: "Yes. The word 'Islam' itself comes from the Arabic root 'salaam' (peace). Islam teaches compassion, justice, and mercy. The Prophet ﷺ said: 'The merciful are shown mercy by the All-Merciful.'",
  },
];

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [shahada, setShahada] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.tealDark, colors.teal]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>

        <View style={styles.heroCenter}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>☪</Text>
          </View>
          <Text style={styles.heroTitle}>Discover Islam</Text>
          <Text style={styles.heroSub}>
            A warm welcome for everyone — Muslim or not. Islam is a message for all of humanity.
          </Text>

          <View style={styles.statRow}>
            {[
              { value: "1.8B", label: "Muslims worldwide" },
              { value: "114", label: "Quran chapters" },
              { value: "1400+", label: "Years preserved" },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* What is Islam */}
        <View style={[styles.section, { paddingTop: 28 }]}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name="info" size={18} color={colors.teal} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What is Islam?</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.foreground }]}>
              Islam is the world's second-largest religion with over 1.8 billion followers. The word
              <Text style={[styles.highlight, { color: colors.teal }]}> "Islam" </Text>
              means <Text style={styles.italic}>"submission to the will of God"</Text> in Arabic.
            </Text>
            <Text style={[styles.bodyText, { color: colors.foreground, marginTop: 10 }]}>
              Muslims believe in <Text style={[styles.highlight, { color: colors.teal }]}>One God (Allah)</Text>,
              {" "}in the prophets from Adam to Muhammad ﷺ, and that the Quran is the final divine
              revelation to guide all of humanity.
            </Text>
            <Text style={[styles.bodyText, { color: colors.foreground, marginTop: 10 }]}>
              Islam is not a new religion — it is the same message of monotheism brought by all
              prophets: Abraham, Moses, Jesus, and finally Muhammad (peace be upon them all).
            </Text>
          </View>
        </View>

        {/* 5 Pillars */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name="layers" size={18} color={colors.teal} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The 5 Pillars of Islam</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            The five core practices every Muslim follows
          </Text>

          {PILLARS.map((p) => (
            <View
              key={p.number}
              style={[styles.pillarCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.pillarLeft}>
                <View style={[styles.pillarNum, { backgroundColor: colors.teal }]}>
                  <Text style={styles.pillarNumText}>{p.number}</Text>
                </View>
              </View>
              <View style={styles.pillarContent}>
                <View style={styles.pillarTitleRow}>
                  <Text style={[styles.pillarName, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.pillarArabic, { color: colors.teal }]}>{p.arabic}</Text>
                </View>
                <Text style={[styles.pillarDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Shahada Call-to-action */}
        {!shahada ? (
          <View style={styles.section}>
            <LinearGradient
              colors={[colors.tealDark, colors.teal]}
              style={styles.shahada}
            >
              <Text style={styles.shahadaArabic}>لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ</Text>
              <Text style={styles.shahadaTrans}>
                "There is no god but Allah, and Muhammad is the messenger of Allah"
              </Text>
              <Text style={styles.shahadaNote}>
                This is the Shahada — the declaration of faith. Reciting this sincerely is how one enters Islam.
              </Text>
              <Pressable
                onPress={() => setShahada(true)}
                style={styles.shahadaBtn}
              >
                <Text style={styles.shahadaBtnText}>I want to say the Shahada 🤲</Text>
              </Pressable>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.shahadaSuccess, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
              <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🌟</Text>
              <Text style={[styles.shahadaSuccessTitle, { color: "#1B5E20" }]}>
                MashaAllah — Welcome to Islam!
              </Text>
              <Text style={[styles.shahadaSuccessBody, { color: "#2E7D32" }]}>
                All your previous sins are forgiven. You are now part of a global family of 1.8 billion Muslims.
                {"\n\n"}
                Say out loud with sincerity:{"\n\n"}
                <Text style={{ fontSize: 20, fontWeight: "bold" }}>لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ</Text>
                {"\n\n"}
                Your journey begins now. May Allah guide you always. Ameen.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/quran" as any)}
                style={[styles.shahadaNextBtn, { backgroundColor: "#2E7D32" }]}
              >
                <Text style={styles.shahadaNextBtnText}>Read the Quran →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* FAQs */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name="help-circle" size={18} color={colors.teal} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Common Questions</Text>
          </View>

          {FAQS.map((faq, i) => (
            <Pressable
              key={i}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              style={[
                styles.faqItem,
                {
                  backgroundColor: colors.card,
                  borderColor: openFaq === i ? colors.teal : colors.border,
                  borderWidth: openFaq === i ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQ, { color: colors.foreground, flex: 1 }]}>{faq.q}</Text>
                <Feather
                  name={openFaq === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </View>
              {openFaq === i && (
                <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{faq.a}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Get Started */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.tealLight }]}>
              <Feather name="compass" size={18} color={colors.teal} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Begin Your Journey</Text>
          </View>

          <View style={styles.journeyGrid}>
            <Pressable
              onPress={() => router.push("/(tabs)/quran" as any)}
              style={[styles.journeyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="book-open" size={26} color={colors.teal} />
              <Text style={[styles.journeyCardTitle, { color: colors.foreground }]}>Read the Quran</Text>
              <Text style={[styles.journeyCardSub, { color: colors.mutedForeground }]}>
                Start with Al-Fatiha — the Opening
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/library" as any)}
              style={[styles.journeyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="play-circle" size={26} color={colors.teal} />
              <Text style={[styles.journeyCardTitle, { color: colors.foreground }]}>Watch Lectures</Text>
              <Text style={[styles.journeyCardSub, { color: colors.mutedForeground }]}>
                79 free Islamic lectures
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/courses" as any)}
              style={[styles.journeyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="layers" size={26} color={colors.teal} />
              <Text style={[styles.journeyCardTitle, { color: colors.foreground }]}>Take a Course</Text>
              <Text style={[styles.journeyCardSub, { color: colors.mutedForeground }]}>
                Structured beginner courses
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL("mailto:learn@nurulquran.com?subject=New Muslim Support")}
              style={[styles.journeyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="mail" size={26} color={colors.teal} />
              <Text style={[styles.journeyCardTitle, { color: colors.foreground }]}>Ask a Scholar</Text>
              <Text style={[styles.journeyCardSub, { color: colors.mutedForeground }]}>
                Get personal guidance
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Share */}
        <View style={[styles.section, { marginBottom: Platform.OS === "web" ? 34 + 84 : 84 + 20 }]}>
          <View style={[styles.shareCard, { backgroundColor: colors.tealLight, borderColor: colors.teal }]}>
            <Feather name="share-2" size={20} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.shareTitle, { color: colors.teal }]}>Share with a Friend</Text>
              <Text style={[styles.shareSub, { color: colors.teal }]}>
                Spread the message of Islam — "The best of you are those who learn the Quran and teach it." — Prophet Muhammad ﷺ
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroCenter: {
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: { fontSize: 36, color: "#fff" },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  statRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 8,
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    marginLeft: 44,
  },

  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginTop: 8,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  highlight: { fontFamily: "Inter_600SemiBold" },
  italic: { fontStyle: "italic" },

  // Pillars
  pillarCard: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    alignItems: "flex-start",
  },
  pillarLeft: { paddingTop: 2 },
  pillarNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pillarNumText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  pillarContent: { flex: 1 },
  pillarTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  pillarName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  pillarArabic: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
  },
  pillarDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },

  // Shahada
  shahada: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  shahadaArabic: {
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
    lineHeight: 38,
    fontWeight: "700",
    writingDirection: "rtl",
  },
  shahadaTrans: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },
  shahadaNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 20,
  },
  shahadaBtn: {
    marginTop: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  shahadaBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#0D4A3E",
  },
  shahadaSuccess: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    marginTop: 8,
    gap: 12,
  },
  shahadaSuccessTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  shahadaSuccessBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  shahadaNextBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  shahadaNextBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },

  // FAQ
  faqItem: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  faqQ: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  faqA: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 10,
  },

  // Journey grid
  journeyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  journeyCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    alignItems: "flex-start",
  },
  journeyCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  journeyCardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  // Share
  shareCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  shareTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  shareSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    fontStyle: "italic",
  },
});
