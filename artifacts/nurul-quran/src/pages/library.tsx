const LIBRARY_SECTIONS = [
  {
    title: "Quran Translations",
    description: "Sahih International, Pickthall, Yusuf Ali and more — side-by-side comparison.",
    icon: "📖",
    href: "https://quran.com",
    label: "Open Quran.com",
  },
  {
    title: "Hadith Collections",
    description: "Sahih Bukhari, Sahih Muslim, Sunan Abu Dawud, Tirmidhi, Ibn Majah & Nasa'i.",
    icon: "📜",
    href: "https://sunnah.com",
    label: "Open Sunnah.com",
  },
  {
    title: "Tafsir Ibn Kathir",
    description: "Complete classical commentary of the Quran by Imam Ibn Kathir (full English).",
    icon: "🔍",
    href: "https://www.islamicstudies.info/tafheem.php",
    label: "Read Tafsir",
  },
  {
    title: "Fiqh & Jurisprudence",
    description: "Rulings from Hanafi, Shafi'i, Maliki and Hanbali schools on everyday matters.",
    icon: "⚖️",
    href: "https://islamqa.info",
    label: "Browse IslamQA",
  },
  {
    title: "Seerah & Islamic History",
    description: "Biographies of the Prophet ﷺ, Companions, and the early Muslim civilisation.",
    icon: "🕌",
    href: "https://www.islamicity.org/topics/history/",
    label: "Explore History",
  },
  {
    title: "Arabic Language",
    description: "Grammar (Nahw & Sarf), vocabulary, and Quranic Arabic learning resources.",
    icon: "✍️",
    href: "https://www.madinaharabic.com",
    label: "Learn Arabic",
  },
  {
    title: "Aqeedah (Islamic Creed)",
    description: "Authentic books on Tawheed, the six pillars of Iman, and refuting deviations.",
    icon: "🌙",
    href: "https://islamiccreed.com",
    label: "Study Aqeedah",
  },
  {
    title: "Duas & Adhkar",
    description: "Authentic supplications from the Quran and Sunnah for every occasion.",
    icon: "🤲",
    href: "https://mydualist.com",
    label: "Browse Duas",
  },
  {
    title: "Nurul Quran Full Library",
    description: "All scholarly resources, PDF books, and audio lectures curated by Nurul Quran.",
    icon: "🏛️",
    href: "https://nurulquran.info/library",
    label: "Visit nurulquran.info →",
    highlight: true,
  },
];

const Library = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3 text-emerald-800">Islamic Library</h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Explore authentic Islamic books, tafsir, hadith collections, and scholarly resources —
          all curated for accuracy and accessibility.
        </p>
      </div>

      {/* Resource Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {LIBRARY_SECTIONS.map((section) => (
          <a
            key={section.title}
            href={section.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group block border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 no-underline ${
              section.highlight
                ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100"
                : "border-gray-200 bg-white hover:border-emerald-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{section.icon}</span>
              <div className="flex-1 min-w-0">
                <h2
                  className={`text-lg font-semibold mb-1 ${
                    section.highlight ? "text-emerald-800" : "text-gray-800"
                  }`}
                >
                  {section.title}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                  {section.description}
                </p>
                <span
                  className={`text-sm font-medium group-hover:underline ${
                    section.highlight ? "text-emerald-700" : "text-emerald-600"
                  }`}
                >
                  {section.label}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-10 text-center text-sm text-gray-400">
        All external resources open in a new tab. Resources are selected for their authenticity
        and scholarly reliability.
      </p>
    </div>
  );
};

export default Library;
