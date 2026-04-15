import { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  GraduationCap,
  HelpCircle,
  Info,
  Layers,
  Mail,
  PlayCircle,
  Share2,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    number: "1",
    name: "Shahada",
    arabic: "الشهادة",
    desc: "Declaration of Faith — There is no god but Allah, and Muhammad is His messenger.",
  },
  {
    number: "2",
    name: "Salah",
    arabic: "الصلاة",
    desc: "Prayer — Muslims pray 5 times a day, facing Makkah, to stay connected with Allah.",
  },
  {
    number: "3",
    name: "Zakat",
    arabic: "الزكاة",
    desc: "Charity — Giving 2.5% of savings annually to support the poor and needy.",
  },
  {
    number: "4",
    name: "Sawm",
    arabic: "الصوم",
    desc: "Fasting — Abstaining from food & drink from dawn to sunset during Ramadan.",
  },
  {
    number: "5",
    name: "Hajj",
    arabic: "الحج",
    desc: "Pilgrimage — A once-in-a-lifetime journey to Makkah for those who are able.",
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
  {
    q: "What do Muslims believe about Jesus?",
    a: "Muslims deeply respect Jesus (Isa in Arabic) as one of the greatest prophets of God. Muslims believe he was born of a virgin, performed miracles, and will return before the Day of Judgement. However, Muslims do not believe he is God or the son of God.",
  },
  {
    q: "What is Jihad?",
    a: "The word 'Jihad' means 'struggle' or 'striving'. The greatest Jihad, according to the Prophet ﷺ, is the inner struggle to be a better person — to overcome one's ego, desires, and bad habits. It is fundamentally about self-improvement and justice.",
  },
];

export default function DiscoverPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [shahadaDone, setShahadaDone] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0D4A3E] to-[#1A6B5A] text-white">
        <div className="container mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 shadow-lg">
            <Sun className="h-10 w-10 text-white" />
          </div>
          <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">Discover Islam</h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/80 leading-relaxed">
            A warm welcome for everyone — Muslim or not. Islam is a message for{" "}
            <em>all of humanity</em>, and we are honoured you are here.
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-10 md:gap-20">
            {[
              { value: "1.8B", label: "Muslims worldwide" },
              { value: "114", label: "Chapters in the Quran" },
              { value: "1400+", label: "Years preserved" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-white/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-16">

        {/* What is Islam */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Info className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">What is Islam?</h2>
          </div>

          <div className="rounded-2xl border bg-card p-8 space-y-4 leading-relaxed">
            <p className="text-foreground text-base">
              Islam is the world's second-largest religion with over{" "}
              <strong className="text-emerald-700">1.8 billion followers</strong>. The word{" "}
              <strong className="text-emerald-700">"Islam"</strong> means{" "}
              <em>"submission to the will of God"</em> in Arabic.
            </p>
            <p className="text-foreground text-base">
              Muslims believe in{" "}
              <strong className="text-emerald-700">One God (Allah)</strong>, in the prophets from
              Adam to Muhammad ﷺ, and that the Quran is the final divine revelation to guide all of
              humanity.
            </p>
            <p className="text-foreground text-base">
              Islam is not a new religion — it is the same message of monotheism (Tawhid) brought
              by all the prophets: Abraham, Moses, Jesus, and finally Muhammad ﷺ (peace be upon
              them all). Muslims consider themselves part of the same Abrahamic family.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: "🕌", title: "One God", desc: "Absolute monotheism — no partners, no intermediaries." },
                { icon: "📖", title: "Divine Revelation", desc: "The Quran is the unchanged word of God for 1,400+ years." },
                { icon: "🌍", title: "Universal Message", desc: "Sent for all of humanity, not one tribe or nation." },
              ].map((c) => (
                <div key={c.title} className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-5 text-center">
                  <div className="text-3xl mb-3">{c.icon}</div>
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">{c.title}</div>
                  <div className="text-sm text-emerald-700/80 dark:text-emerald-400/80">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 Pillars */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Layers className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">The 5 Pillars of Islam</h2>
          </div>
          <p className="text-muted-foreground ml-13 mb-6 text-sm">The five core practices every Muslim follows</p>

          <div className="grid gap-3">
            {PILLARS.map((p) => (
              <div
                key={p.number}
                className="flex items-start gap-5 rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow">
                  {p.number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground text-base">{p.name}</span>
                    <span className="text-xl text-emerald-600 font-semibold">{p.arabic}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shahada CTA */}
        {!shahadaDone ? (
          <section>
            <div className="rounded-2xl bg-gradient-to-br from-[#0D4A3E] to-[#1A6B5A] p-10 text-center text-white shadow-xl">
              <p
                className="text-3xl font-bold mb-4 leading-loose"
                dir="rtl"
                lang="ar"
              >
                لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ
              </p>
              <p className="text-white/80 italic mb-3 text-base">
                "There is no god but Allah, and Muhammad is the messenger of Allah"
              </p>
              <p className="text-white/65 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                This is the Shahada — the declaration of faith. Reciting this sincerely, believing
                in its meaning, is how one enters Islam.
              </p>
              <button
                onClick={() => setShahadaDone(true)}
                className="rounded-2xl bg-white px-8 py-4 text-base font-semibold text-emerald-800 shadow transition hover:bg-emerald-50 hover:shadow-lg"
              >
                I want to say the Shahada 🤲
              </button>
            </div>
          </section>
        ) : (
          <section>
            <div className="rounded-2xl border-2 border-green-400 bg-green-50 dark:bg-green-950/30 p-10 text-center space-y-4">
              <div className="text-5xl">🌟</div>
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">
                MashaAllah — Welcome to Islam!
              </h3>
              <p className="text-green-700 dark:text-green-400 leading-relaxed max-w-xl mx-auto">
                All your previous sins are forgiven. You are now part of a global family of 1.8
                billion Muslims.
              </p>
              <p className="text-3xl font-bold text-green-800 dark:text-green-300 py-4 leading-loose" dir="rtl" lang="ar">
                لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ
              </p>
              <p className="text-sm text-green-600 dark:text-green-500 italic">
                Your journey begins now. May Allah guide you always. Ameen.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <Button asChild className="bg-green-700 hover:bg-green-800">
                  <Link href="/quran">Read the Quran →</Link>
                </Button>
                <Button asChild variant="outline" className="border-green-600 text-green-700">
                  <a href="mailto:support@nurulquran.info?subject=I%20have%20taken%20the%20Shahada">
                    Connect with a Scholar
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* FAQs */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <HelpCircle className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Common Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-xl border bg-card transition-all cursor-pointer ${openFaq === i ? "border-emerald-500 shadow-sm" : "hover:border-emerald-300"}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="flex items-center justify-between p-5">
                  <span className="font-semibold text-foreground text-sm md:text-base pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  )}
                </div>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Begin Your Journey */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Compass className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Begin Your Journey</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: "/quran", icon: BookOpen, title: "Read the Quran", desc: "Start with Al-Fatiha — the Opening" },
              { href: "/library", icon: PlayCircle, title: "Watch Lectures", desc: "79 free Islamic lectures" },
              { href: "/courses", icon: GraduationCap, title: "Take a Course", desc: "Structured beginner courses" },
              { href: "mailto:support@nurulquran.info", icon: Mail, title: "Ask a Scholar", desc: "Get personal guidance" },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 transition-all hover:border-emerald-400 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-200">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 mt-auto" />
              </Link>
            ))}
          </div>
        </section>

        {/* Share bar */}
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-6 flex items-start gap-4">
          <Share2 className="h-6 w-6 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Share with a Friend</p>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 italic leading-relaxed">
              "The best of you are those who learn the Quran and teach it." — Prophet Muhammad ﷺ
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
