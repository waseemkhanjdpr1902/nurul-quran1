// src/pages/Library.tsx
const Library = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Islamic Library</h1>
      <p className="mb-4 text-gray-700">
        Explore authentic Islamic books, tafsir, hadith collections, and scholarly resources.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">Quran Translations</h2>
          <p>Multiple translations including Sahih International, Pickthall, Yusuf Ali.</p>
        </div>
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">Hadith Collections</h2>
          <p>Sahih Bukhari, Sahih Muslim, Sunan Abu Dawud, and more.</p>
        </div>
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">Tafsir Ibn Kathir</h2>
          <p>Complete commentary of the Quran by Ibn Kathir.</p>
        </div>
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">Fiqh (Jurisprudence)</h2>
          <p>Books on Hanafi, Shafi’i, Maliki, and Hanbali schools.</p>
        </div>
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">Seerah & History</h2>
          <p>Biographies of Prophet Muhammad ﷺ and Islamic history.</p>
        </div>
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">Arabic Language</h2>
          <p>Grammar, vocabulary, and learning resources for Quranic Arabic.</p>
        </div>
      </div>
    </div>
  );
};

export default Library;
