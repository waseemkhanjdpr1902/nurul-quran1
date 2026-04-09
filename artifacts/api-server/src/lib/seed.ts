import { db, speakersTable, coursesTable, lecturesTable, ayahsTable, moodVerses } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const SPEAKERS = [
  { name: "Sheikh Hamza Yusuf", bio: "Co-founder of Zaytuna College, one of the most recognized Islamic scholars in the Western world.", lectureCount: 45 },
  { name: "Dr. Yasir Qadhi", bio: "Dean of Academic Affairs at AlMaghrib Institute, author of several books on Islamic theology.", lectureCount: 38 },
  { name: "Sheikh Nouman Ali Khan", bio: "Founder and CEO of Bayyinah Institute, renowned for his Quranic Arabic lessons.", lectureCount: 52 },
  { name: "Dr. Omar Suleiman", bio: "Founder and President of Yaqeen Institute for Islamic Research, professor of Islamic Studies.", lectureCount: 29 },
  { name: "Arabic with Maha", bio: null, lectureCount: 0 },
  { name: "ArabicPod101", bio: null, lectureCount: 0 },
  { name: "Dr. V. Abdur Rahim", bio: null, lectureCount: 0 },
  { name: "Understand Quran Academy", bio: null, lectureCount: 0 },
  { name: "Arabic Unlocked", bio: null, lectureCount: 0 },
  { name: "Madinah Arabic Institute", bio: null, lectureCount: 0 },
];

const COURSES = [
  { title: "Complete Tafseer of Surah Al-Baqarah", description: "Nouman Ali Khan's word-by-word linguistic analysis of major Quranic surahs — unlocking the Arabic and uncovering hidden meanings.", category: "Tafseer", isPremium: true, lectureCount: 0, speakerIndex: 2 },
  { title: "Word-to-Word Quranic Arabic", description: "Nouman Ali Khan's in-depth Arabic word analysis of major Quranic surahs — perfect for students who want to understand the Quran directly.", category: "Word-to-Word", isPremium: false, lectureCount: 9, speakerIndex: 2 },
  { title: "Islamic Jurisprudence (Fiqh) Essentials", description: "Essential Fiqh of worship and daily life — from the rules of Salah to halal business — taught by leading contemporary scholars.", category: "Fiqh", isPremium: false, lectureCount: 0, speakerIndex: 1 },
  { title: "Fundamentals of Faith (Aqeedah)", description: "Dr. Yasir Qadhi's landmark series on Islamic creed — covering Tawheed, the pillars of Iman, shirk, and the signs of the Last Day.", category: "Aqeedah", isPremium: true, lectureCount: 0, speakerIndex: 1 },
  { title: "Hadith Sciences and Methodology", description: "Mufti Menk's hadith-based lectures on becoming a better Muslim — practical, inspiring, and grounded in authentic prophetic guidance.", category: "Hadith", isPremium: true, lectureCount: 0, speakerIndex: 3 },
  { title: "Quran Recitation Mastery (Tajweed)", description: "Master the rules of Tajweed with structured lesson-by-lesson audio — from articulation points to prolongation rules and more.", category: "Quran Recitation", isPremium: false, lectureCount: 0, speakerIndex: 2 },
  { title: "Quran Recitation for Beginners (Tajweed)", description: "Master the rules of Tajweed with structured lesson-by-lesson audio — from articulation points to prolongation rules and more.", category: "Quran Recitation", isPremium: false, lectureCount: 4, speakerIndex: 2 },
  { title: "The Seerah of Prophet Muhammad ﷺ", description: "Yasir Qadhi's Seerah series combined with Omar Suleiman's lectures on the lives of the Prophet ﷺ and early Muslim community.", category: "Islamic History", isPremium: false, lectureCount: 11, speakerIndex: 1 },
  { title: "40 Hadith of Imam An-Nawawi", description: "Mufti Menk's hadith-based lectures on becoming a better Muslim — practical, inspiring, and grounded in authentic prophetic guidance.", category: "Hadith", isPremium: false, lectureCount: 0, speakerIndex: 1 },
  { title: "Understanding Salah: The Pillar of Islam", description: "Essential Fiqh of worship and daily life — from the rules of Salah to halal business — taught by leading contemporary scholars.", category: "Fiqh", isPremium: false, lectureCount: 0, speakerIndex: 1 },
  { title: "Islamic Finance & Halal Investing", description: "Essential Fiqh of worship and daily life — from the rules of Salah to halal business — taught by leading contemporary scholars.", category: "Fiqh", isPremium: false, lectureCount: 0, speakerIndex: 0 },
  { title: "Names of Allah: Al-Asma Al-Husna", description: "Dive deep into Islamic creed with Dr. Yasir Qadhi's Fundamentals of Faith series — the most comprehensive Aqeedah course in English.", category: "Aqeedah", isPremium: false, lectureCount: 0, speakerIndex: 0 },
  { title: "Ramadan: A Month of Complete Transformation", description: "Dr. Omar Suleiman's lectures on the spiritual diseases of the heart, gratitude, forgiveness, and drawing closer to Allah.", category: "Spirituality", isPremium: false, lectureCount: 0, speakerIndex: 3 },
  { title: "Surah Al-Fatiha: The Opening", description: "Nouman Ali Khan's word-by-word linguistic analysis of major Quranic surahs — unlocking the Arabic and uncovering hidden meanings.", category: "Tafseer", isPremium: false, lectureCount: 0, speakerIndex: 2 },
  { title: "Surah Al-Kahf: Full Course", description: "Nouman Ali Khan's word-by-word linguistic analysis of major Quranic surahs — unlocking the Arabic and uncovering hidden meanings.", category: "Tafseer", isPremium: false, lectureCount: 0, speakerIndex: 2 },
  { title: "Purification of the Soul (Tazkiyah)", description: "Dr. Omar Suleiman's lectures on the spiritual diseases of the heart, gratitude, forgiveness, and drawing closer to Allah.", category: "Spirituality", isPremium: false, lectureCount: 0, speakerIndex: 0 },
  { title: "Introduction to Quranic Arabic", description: "Master the rules of Tajweed with structured lesson-by-lesson audio — from articulation points to prolongation rules and more.", category: "Quran Recitation", isPremium: false, lectureCount: 13, speakerIndex: 2 },
  { title: "Believing in the Day of Judgment", description: "Dive deep into Islamic creed with Dr. Yasir Qadhi's Fundamentals of Faith series — the most comprehensive Aqeedah course in English.", category: "Aqeedah", isPremium: false, lectureCount: 0, speakerIndex: 1 },
];

const AYAHS = [
  { arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.", surahName: "Al-Fatiha", surahNumber: 1, ayahNumber: 1, reference: "Quran 1:1", displayDate: null },
  { arabicText: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "All praise is due to Allah, Lord of the worlds.", surahName: "Al-Fatiha", surahNumber: 1, ayahNumber: 2, reference: "Quran 1:2", displayDate: null },
  { arabicText: "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ", translation: "But perhaps you hate a thing and it is good for you.", surahName: "Al-Baqarah", surahNumber: 2, ayahNumber: 216, reference: "Quran 2:216", displayDate: null },
  { arabicText: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship will be ease.", surahName: "Ash-Sharh", surahNumber: 94, ayahNumber: 6, reference: "Quran 94:6", displayDate: null },
  { arabicText: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", translation: "And whoever fears Allah — He will make for him a way out.", surahName: "At-Talaq", surahNumber: 65, ayahNumber: 2, reference: "Quran 65:2", displayDate: null },
  { arabicText: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ", translation: "And do not despair of relief from Allah.", surahName: "Yusuf", surahNumber: 12, ayahNumber: 87, reference: "Quran 12:87", displayDate: null },
  { arabicText: "فَاذْكُرُونِي أَذْكُرْكُمْ", translation: "So remember Me; I will remember you.", surahName: "Al-Baqarah", surahNumber: 2, ayahNumber: 152, reference: "Quran 2:152", displayDate: null },
  { arabicText: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Indeed, Allah is with the patient.", surahName: "Al-Baqarah", surahNumber: 2, ayahNumber: 153, reference: "Quran 2:153", displayDate: null },
  { arabicText: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", translation: "And He is with you wherever you are.", surahName: "Al-Hadid", surahNumber: 57, ayahNumber: 4, reference: "Quran 57:4", displayDate: null },
  { arabicText: "وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ", translation: "And the sky We constructed with strength, and indeed, We are its expander.", surahName: "Adh-Dhariyat", surahNumber: 51, ayahNumber: 47, reference: "Quran 51:47", displayDate: null },
];

const MOOD_VERSES = [
  { arabic: "فَإِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا", translation: '"For indeed, with hardship will be ease."', reference: "Surah Al-Inshirah 94:5", mood: "stressed" },
  { arabic: "وَمَن يَتَوَكَّلۡ عَلَى ٱللَّهِ فَهُوَ حَسۡبُهُۥٓ", translation: '"And whoever relies upon Allah — then He is sufficient for him."', reference: "Surah At-Talaq 65:3", mood: "stressed" },
  { arabic: "لَا يُكَلِّفُ ٱللَّهُ نَفۡسًا إِلَّا وُسۡعَهَا", translation: '"Allah does not burden a soul beyond that it can bear."', reference: "Surah Al-Baqarah 2:286", mood: "stressed" },
  { arabic: "وَٱصۡبِرۡ وَمَا صَبۡرُكَ إِلَّا بِٱللَّهِ", translation: '"And be patient, and your patience is not but through Allah."', reference: "Surah An-Nahl 16:127", mood: "stressed" },
  { arabic: "لَئِن شَكَرۡتُمۡ لَأَزِيدَنَّكُمۡ", translation: '"If you are grateful, I will surely increase you in favor."', reference: "Surah Ibrahim 14:7", mood: "grateful" },
  { arabic: "فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ", translation: '"Then which of the favors of your Lord will you deny?"', reference: "Surah Ar-Rahman 55:13", mood: "grateful" },
  { arabic: "فَٱذۡكُرُونِيٓ أَذۡكُرۡكُمۡ وَٱشۡكُرُواْ لِي وَلَا تَكۡفُرُونِ", translation: '"So remember Me; I will remember you. And be grateful to Me and do not deny Me."', reference: "Surah Al-Baqarah 2:152", mood: "grateful" },
  { arabic: "وَإِن تَعُدُّواْ نِعۡمَةَ ٱللَّهِ لَا تُحۡصُوهَآ", translation: '"And if you should count the favors of Allah, you could not enumerate them."', reference: "Surah An-Nahl 16:18", mood: "grateful" },
  { arabic: "أَلَا بِذِكۡرِ ٱللَّهِ تَطۡمَئِنُّ ٱلۡقُلُوبُ", translation: '"Verily, in the remembrance of Allah do hearts find rest."', reference: "Surah Ar-Rad 13:28", mood: "anxious" },
  { arabic: "وَعَلَى ٱللَّهِ فَتَوَكَّلُوٓاْ إِن كُنتُم مُّؤۡمِنِينَ", translation: '"And put your trust in Allah if you are believers."', reference: "Surah Al-Maidah 5:23", mood: "anxious" },
  { arabic: "حَسۡبُنَا ٱللَّهُ وَنِعۡمَ ٱلۡوَكِيلُ", translation: '"Sufficient for us is Allah, and He is the best Disposer of affairs."', reference: "Surah Al-Imran 3:173", mood: "anxious" },
  { arabic: "وَلَا تَحۡزَنُواْ وَأَنتُمُ ٱلۡأَعۡلَوۡنَ إِن كُنتُم مُّؤۡمِنِينَ", translation: '"Do not grieve, for you will have the upper hand if you are true believers."', reference: "Surah Al-Imran 3:139", mood: "anxious" },
  { arabic: "هُوَ ٱلَّذِيٓ أَنزَلَ ٱلسَّكِينَةَ فِي قُلُوبِ ٱلۡمُؤۡمِنِينَ", translation: '"It is He who sent down tranquility into the hearts of the believers."', reference: "Surah Al-Fath 48:4", mood: "peaceful" },
  { arabic: "مَنۡ عَمِلَ صَٰلِحٗا مِّن ذَكَرٍ أَوۡ أُنثَىٰ وَهُوَ مُؤۡمِنٞ فَلَنُحۡيِيَنَّهُۥ حَيَوٰةٗ طَيِّبَةٗ", translation: '"Whoever does righteousness, male or female, while a believer — We will surely cause him to live a good life."', reference: "Surah An-Nahl 16:97", mood: "peaceful" },
  { arabic: "وَٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ أُوْلَٰٓئِكَ أَصۡحَٰبُ ٱلۡجَنَّةِ", translation: '"Those who believe and do righteous deeds — those are the companions of Paradise."', reference: "Surah Al-Baqarah 2:82", mood: "peaceful" },
  { arabic: "يَٰٓأَيَّتُهَا ٱلنَّفۡسُ ٱلۡمُطۡمَئِنَّةُ ٱرۡجِعِيٓ إِلَىٰ رَبِّكِ رَاضِيَةٗ مَّرۡضِيَّةٗ", translation: '"O tranquil soul, return to your Lord, well-pleased and pleasing to Him."', reference: "Surah Al-Fajr 89:27-28", mood: "peaceful" },
];

const LECTURES_BY_COURSE: Record<number, Array<{
  title: string; description: string; audioUrl: string | null; duration: number | null;
  language: string; category: string; isPremium: boolean; isFeatured: boolean;
  playCount: number; thumbnailUrl: string | null; youtube_url: string | null;
  speakerIndex: number;
}>> = {
  6: [ // Quran Recitation for Beginners (Tajweed)
    { title: "Tajweed Rule 1: Noon Saakin & Tanween", description: "Learn the four rules that govern Noon Saakin and Tanween in Quranic recitation.", audioUrl: null, duration: 1800, language: "English", category: "Quran Recitation", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Tajweed Rule 2: Meem Saakin", description: "Master the three rules for Meem Saakin in Tajweed.", audioUrl: null, duration: 1500, language: "English", category: "Quran Recitation", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Tajweed Rule 3: Madd (Elongation)", description: "Understanding the different types of Madd and their application.", audioUrl: null, duration: 2100, language: "English", category: "Quran Recitation", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Tajweed Rule 4: Qalqalah", description: "The echo sound in Tajweed — how and when to apply it.", audioUrl: null, duration: 1200, language: "English", category: "Quran Recitation", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
  ],
  7: [ // The Seerah of Prophet Muhammad ﷺ
    { title: "Seerah Ep 1: Arabia Before Islam", description: "Understanding the historical and social context of Arabia before the birth of the Prophet ﷺ.", audioUrl: null, duration: 3600, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 2: The Birth of the Prophet ﷺ", description: "The miraculous events surrounding the birth of Muhammad ﷺ and his early childhood.", audioUrl: null, duration: 3300, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 3: Early Life & Youth", description: "The Prophet's ﷺ formative years, his character, and the events that shaped him.", audioUrl: null, duration: 3000, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 4: The First Revelation", description: "The momentous night of the first Quranic revelation in the Cave of Hira.", audioUrl: null, duration: 3600, language: "English", category: "Islamic History", isPremium: false, isFeatured: true, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 5: The Early Muslims", description: "Who were the first people to embrace Islam and what was their experience?", audioUrl: null, duration: 3200, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 6: Persecution in Mecca", description: "The trials and persecution faced by early Muslims at the hands of the Quraysh.", audioUrl: null, duration: 3500, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 7: The Year of Sorrow", description: "The passing of Khadijah RA and Abu Talib — and how the Prophet ﷺ endured.", audioUrl: null, duration: 2800, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 8: The Hijra to Madinah", description: "The historic migration from Mecca to Madinah — a turning point in Islamic history.", audioUrl: null, duration: 3800, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 9: Building the Muslim State", description: "How the Prophet ﷺ established a community, constitution, and brotherhood in Madinah.", audioUrl: null, duration: 3400, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 10: The Battle of Badr", description: "The first major battle of Islam — its causes, events, and lasting significance.", audioUrl: null, duration: 4000, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
    { title: "Seerah Ep 11: The Conquest of Mecca", description: "The triumphant and merciful return of the Prophet ﷺ to Mecca.", audioUrl: null, duration: 3900, language: "English", category: "Islamic History", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 1 },
  ],
  16: [ // Introduction to Quranic Arabic
    { title: "Madinah Arabic Book 1 — Class 1A", description: "The world-famous Madinah Arabic course as taught at the Islamic University of Madinah. Class 1A introduces the foundational Arabic noun sentence.", audioUrl: null, duration: 2983, language: "English", category: "Arabic", isPremium: false, isFeatured: true, playCount: 0, thumbnailUrl: "https://img.youtube.com/vi/EbcRdQgBqSM/mqdefault.jpg", youtube_url: "https://www.youtube.com/watch?v=EbcRdQgBqSM", speakerIndex: 6 },
    { title: "Madinah Arabic Book 1 — Class 1B", description: "Continuation of Class 1A. Reinforces the noun sentence and builds foundational vocabulary.", audioUrl: null, duration: 2947, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: "https://img.youtube.com/vi/zLp1J8FP6zQ/mqdefault.jpg", youtube_url: "https://www.youtube.com/watch?v=zLp1J8FP6zQ", speakerIndex: 6 },
    { title: "Madinah Arabic Book 1 — Class 2", description: "Class 2 covers new vocabulary, gender in Arabic nouns, and basic sentence formation.", audioUrl: null, duration: 2880, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: "https://img.youtube.com/vi/xqoAVEP3L6o/mqdefault.jpg", youtube_url: "https://www.youtube.com/watch?v=xqoAVEP3L6o", speakerIndex: 6 },
    { title: "Madinah Arabic Book 2 — Introduction", description: "The opening class of Madinah Arabic Book 2. Builds on Book 1 grammar and introduces verb conjugation.", audioUrl: null, duration: 3120, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: "https://img.youtube.com/vi/PFMgbthX2XI/mqdefault.jpg", youtube_url: "https://www.youtube.com/watch?v=PFMgbthX2XI", speakerIndex: 6 },
    { title: "Arabic Alphabet & Pronunciation", description: "Master all 28 Arabic letters with correct pronunciation and writing.", audioUrl: null, duration: 1800, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 5 },
    { title: "Basic Arabic Vocabulary — Lesson 1", description: "Essential vocabulary for beginners: greetings, numbers, and common words.", audioUrl: null, duration: 1500, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 5 },
    { title: "Arabic Grammar Foundations", description: "Introduction to Arabic sentence structure and basic grammar rules.", audioUrl: null, duration: 2400, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 8 },
    { title: "Quranic Words Most Repeated", description: "Learn the 100 most repeated words in the Quran for faster comprehension.", audioUrl: null, duration: 2700, language: "English", category: "Arabic", isPremium: false, isFeatured: true, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 8 },
    { title: "Arabic Verb Conjugation — Present Tense", description: "How to conjugate Arabic verbs in the present/imperfect tense.", audioUrl: null, duration: 2200, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 7 },
    { title: "Reading Quranic Arabic — Lesson 1", description: "Start reading Quranic Arabic with confidence using simple texts.", audioUrl: null, duration: 1900, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 7 },
    { title: "Arabic Roots System", description: "Understanding the 3-letter root system — the key to unlocking Arabic vocabulary.", audioUrl: null, duration: 2500, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Common Quranic Phrases", description: "Memorize and understand the most common phrases found throughout the Quran.", audioUrl: null, duration: 2100, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Arabic Listening & Comprehension", description: "Train your ear to understand spoken Arabic with guided listening exercises.", audioUrl: null, duration: 1800, language: "English", category: "Arabic", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 4 },
  ],
  1: [ // Word-to-Word Quranic Arabic (id=1 from COURSES array = course index 1)
    { title: "Understanding Surah Al-Fatiha Word by Word", description: "Deep dive into every word of Al-Fatiha — its Arabic root, meaning, and grammatical form.", audioUrl: null, duration: 3600, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: true, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Surah Al-Baqarah — First 5 Verses", description: "Word-by-word analysis of the first five verses of the longest Surah in the Quran.", audioUrl: null, duration: 4200, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Surah Al-Ikhlas — The Pure Faith", description: "A complete word-by-word breakdown of Surah Al-Ikhlas, equal to one-third of the Quran.", audioUrl: null, duration: 2700, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Ayat Al-Kursi — The Throne Verse", description: "The greatest verse in the Quran explained word by word with full linguistic analysis.", audioUrl: null, duration: 3900, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: true, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Surah Al-Kahf — Opening Verses", description: "Word-by-word exploration of the powerful opening of Surah Al-Kahf.", audioUrl: null, duration: 3300, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Last 3 Surahs — Complete Analysis", description: "Al-Ikhlas, Al-Falaq, and An-Nas broken down word by word with Tafseer insights.", audioUrl: null, duration: 2800, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Surah Al-Mulk — Word by Word", description: "Work through the words of Surah Al-Mulk, the Surah that protects from the punishment of the grave.", audioUrl: null, duration: 5400, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Surah Ya-Sin — Verse 1-12", description: "Beginning the heart of the Quran: word-by-word analysis of the opening of Surah Ya-Sin.", audioUrl: null, duration: 4500, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
    { title: "Du'a of Ibrahim ﷺ — Quranic Supplications", description: "Exploring the beautiful du'as of Prophet Ibrahim as recorded in the Quran, word by word.", audioUrl: null, duration: 3100, language: "English", category: "Word-to-Word", isPremium: false, isFeatured: false, playCount: 0, thumbnailUrl: null, youtube_url: null, speakerIndex: 2 },
  ],
};

export async function seedDatabase(force = false) {
  try {
    const speakerCount = await db.select({ count: sql<number>`count(*)` }).from(speakersTable);
    if (!force && Number(speakerCount[0]?.count) > 0) {
      logger.info("Database already seeded — skipping");
      return;
    }

    logger.info("Seeding database with Nurul Quran content...");

    // 1. Insert speakers
    const insertedSpeakers = await db.insert(speakersTable).values(
      SPEAKERS.map(s => ({ name: s.name, bio: s.bio, lectureCount: s.lectureCount }))
    ).returning({ id: speakersTable.id });

    const speakerIds = insertedSpeakers.map(s => s.id);
    logger.info({ count: speakerIds.length }, "Speakers seeded");

    // 2. Insert courses
    const insertedCourses = await db.insert(coursesTable).values(
      COURSES.map(c => ({
        title: c.title,
        description: c.description,
        category: c.category,
        isPremium: c.isPremium,
        lectureCount: c.lectureCount,
        speakerId: speakerIds[c.speakerIndex] ?? speakerIds[0],
      }))
    ).returning({ id: coursesTable.id });

    const courseIds = insertedCourses.map(c => c.id);
    logger.info({ count: courseIds.length }, "Courses seeded");

    // 3. Insert lectures by course
    for (const [courseIndexStr, lectures] of Object.entries(LECTURES_BY_COURSE)) {
      const courseIndex = parseInt(courseIndexStr);
      const courseId = courseIds[courseIndex];
      if (!courseId) continue;

      await db.insert(lecturesTable).values(
        lectures.map(l => ({
          title: l.title,
          description: l.description,
          audioUrl: l.audioUrl,
          duration: l.duration,
          language: l.language,
          category: l.category,
          isPremium: l.isPremium,
          isFeatured: l.isFeatured,
          playCount: l.playCount,
          thumbnailUrl: l.thumbnailUrl,
          youtubeUrl: l.youtube_url,
          speakerId: speakerIds[l.speakerIndex] ?? speakerIds[0],
          courseId,
        }))
      );
    }

    const lectureCount = await db.select({ count: sql<number>`count(*)` }).from(lecturesTable);
    logger.info({ count: lectureCount[0]?.count }, "Lectures seeded");

    // 4. Insert ayahs
    await db.insert(ayahsTable).values(AYAHS);
    logger.info({ count: AYAHS.length }, "Ayahs seeded");

    // 5. Insert mood verses
    await db.insert(moodVerses).values(MOOD_VERSES);
    logger.info({ count: MOOD_VERSES.length }, "Mood verses seeded");

    // 6. Seed soul_search_verses via raw SQL
    await db.execute(sql`
      INSERT INTO soul_search_verses (keywords, arabic, translation, reference, modern_insight) VALUES
      ('stressed stress anxiety worried worry overwhelmed pressure job career work deadline', 'فَإِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا', '"For indeed, with hardship will be ease."', 'Surah Al-Inshirah 94:5', 'Allah does not just say ease will come after hardship — He says it comes with it. Whatever deadline or pressure you are facing right now, ease is already embedded in this very moment. Step back, breathe, and trust that your Lord has already packed the solution inside the problem.'),
      ('lonely alone isolated no friends abandoned forgotten left out social', 'وَنَحۡنُ أَقۡرَبُ إِلَيۡهِ مِنۡ حَبۡلِ ٱلۡوَرِيدِ', '"And We are closer to him than his jugular vein."', 'Surah Qaf 50:16', 'In an age of 1,000 followers and zero real connections, Allah declares He is closer to you than your own heartbeat. The loneliness of scrolling at 2am or eating lunch alone is real — but so is this promise. Turn inward, make du''a, and know you are never truly alone.'),
      ('money debt broke finance poor wealth struggling bills loan', 'وَمَن يَتَوَكَّلۡ عَلَى ٱللَّهِ فَهُوَ حَسۡبُهُۥٓ إِنَّ ٱللَّهَ بَٰلِغُ أَمۡرِهِۦ', '"And whoever relies upon Allah — then He is sufficient for him. Indeed, Allah will accomplish His purpose."', 'Surah At-Talaq 65:3', 'Allah is Al-Razzaq — the ultimate Provider — and He promises to deliver His plan on time. Do your part, trust His timing, and know that financial stress is one of the places where tawakkul has the most transformative power.'),
      ('exam study school university test results grades fail passing knowledge', 'وَقُل رَّبِّ زِدۡنِي عِلۡمٗا', '"And say: My Lord, increase me in knowledge."', 'Surah Ta-Ha 20:114', 'Even after receiving revelation, Allah told the Prophet ﷺ to keep asking for more knowledge. Before every study session, make this du''a — it aligns your intention, opens your mind, and reminds you that knowledge is a gift from Allah, not just a grade.'),
      ('family fight argument conflict relationship parent spouse sibling divorce separation', 'وَمِنۡ ءَايَٰتِهِۦٓ أَنۡ خَلَقَ لَكُم مِّنۡ أَنفُسِكُمۡ أَزۡوَٰجٗا لِّتَسۡكُنُوٓاْ إِلَيۡهَا وَجَعَلَ بَيۡنَكُم مَّوَدَّةٗ وَرَحۡمَةً', '"And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy."', 'Surah Ar-Rum 30:21', 'Allah placed mawaddah (love) and rahmah (mercy) between people — not perfection. When families fight, it''s often because we forget that the other person is also a sign of Allah''s mercy. Before the next argument, pause and ask: am I being the mercy Allah placed in this relationship?'),
      ('sick illness health hospital pain suffering disease recovery healing', 'وَإِذَا مَرِضۡتُ فَهُوَ يَشۡفِينِ', '"And when I am ill, it is He who cures me."', 'Surah Ash-Shu''ara 26:80', 'Ibrahim ﷺ — a prophet — openly acknowledged his own illness and credited his cure entirely to Allah. When you''re in a hospital bed, at a diagnosis, or battling chronic pain, this verse is your anchor. You are not weak for being sick. Healing is Allah''s job — yours is to trust.'),
      ('sin guilt shame repentance forgiveness bad deeds mistakes regret', 'قُلۡ يَٰعِبَادِيَ ٱلَّذِينَ أَسۡرَفُواْ عَلَىٰٓ أَنفُسِهِمۡ لَا تَقۡنَطُواْ مِن رَّحۡمَةِ ٱللَّهِ', '"Say: O My servants who have transgressed against themselves — do not despair of the mercy of Allah."', 'Surah Az-Zumar 39:53', 'This verse was revealed to people who thought they had sinned too much to be forgiven. Allah calls them "My servants" even after their sins. No matter what you have done, Allah''s mercy is bigger. Make tawbah — sincere, raw, honest — and trust that He is Al-Ghaffar, the Ever-Forgiving.'),
      ('purpose meaning lost direction life goal confused what next future', 'فَأَيۡنَمَا تُوَلُّواْ فَثَمَّ وَجۡهُ ٱللَّهِ', '"So wherever you turn, there is the Face of Allah."', 'Surah Al-Baqarah 2:115', 'Feeling lost is not a sign that you are far from Allah — it can be the very moment you are closest. Wherever you turn — in confusion, in grief, in uncertainty — Allah is already there. This ayah is permission to stop overthinking and start moving, because every direction holds His presence.'),
      ('death grief loss mourning sadness bereavement funeral miss someone', 'كُلُّ نَفۡسٖ ذَآئِقَةُ ٱلۡمَوۡتِ', '"Every soul shall taste death."', 'Surah Al-Imran 3:185', 'Grief is one of the most human experiences — and one of the most Islamic ones. The Prophet ﷺ wept when his son Ibrahim died and said: "The eyes shed tears and the heart grieves." You are allowed to mourn. You are allowed to miss them. Death is real, and so is the reunion in Jannah for those who believed.'),
      ('anger rage frustrated injustice oppression wronged betrayed cheated lied', 'وَٱلۡكَٰظِمِينَ ٱلۡغَيۡظَ وَٱلۡعَافِينَ عَنِ ٱلنَّاسِ', '"And those who restrain anger and who pardon the people — and Allah loves the doers of good."', 'Surah Al-Imran 3:134', 'Anger is valid. But this ayah shows us the ladder: control it, then release it through pardon. The Prophet ﷺ said the strongest person is not the wrestler — it''s the one who controls themselves when angry. When you feel rage rising, remember: your restraint is counted as a deed of ihsan.'),
      ('fear scared afraid worried future uncertainty risk danger insecure unsafe', 'أَلَآ إِنَّ أَوۡلِيَآءَ ٱللَّهِ لَا خَوۡفٌ عَلَيۡهِمۡ وَلَا هُمۡ يَحۡزَنُونَ', '"Unquestionably, [for] the allies of Allah there will be no fear concerning them, nor will they grieve."', 'Surah Yunus 10:62', 'Fear is a natural response to uncertainty — but Allah offers a path out. The awliya'' of Allah are not people without problems; they are people who trust Allah so deeply that fear loses its grip. Closeness to Allah is the antidote to anxiety — not the absence of hardship.'),
      ('bored empty hollow routine meaningless monotonous stuck unmotivated lazy', 'إِنَّ ٱللَّهَ لَا يُغَيِّرُ مَا بِقَوۡمٍ حَتَّىٰ يُغَيِّرُواْ مَا بِأَنفُسِهِمۡ', '"Indeed, Allah will not change the condition of a people until they change what is in themselves."', 'Surah Ar-Ra''d 13:11', 'Spiritual boredom is often a sign you''ve drifted from your purpose. This verse is both a challenge and a promise — Allah will not change your stagnant life until you change something inside. Pick one thing. One prayer you''ve been skipping. One habit you''ve been avoiding. Start there.'),
      ('proud arrogant self important successful achievement status power ego', 'وَلَا تَمۡشِ فِي ٱلۡأَرۡضِ مَرَحًا إِنَّكَ لَن تَخۡرِقَ ٱلۡأَرۡضَ وَلَن تَبۡلُغَ ٱلۡجِبَالَ طُولٗا', '"And do not walk upon the earth exultantly. Indeed, you will never tear the earth apart, and you will never reach the mountains in height."', 'Surah Al-Isra 17:37', 'Success is a gift from Allah — not a personal achievement to walk with arrogance about. This verse grounds us: no matter how high we rise, the earth beneath us is the same for everyone. True confidence comes from knowing who gave you your abilities — and staying humble about it.'),
      ('grateful thankful blessings content happy satisfied life good alhamdulillah', 'وَإِن تَعُدُّواْ نِعۡمَةَ ٱللَّهِ لَا تُحۡصُوهَآ', '"And if you should count the favors of Allah, you could not enumerate them."', 'Surah An-Nahl 16:18', 'Gratitude is not a feeling — it''s a practice. Start listing: eyes, breath, safety, food, a mind that can read this. You''ll run out of time before you run out of blessings. This verse is an invitation to shift your lens from what''s missing to what''s overflowing.'),
      ('marriage spouse wedding love halal relationship proposal nikah searching', 'وَمِنۡ ءَايَٰتِهِۦٓ أَنۡ خَلَقَ لَكُم مِّنۡ أَنفُسِكُمۡ أَزۡوَٰجٗا لِّتَسۡكُنُوٓاْ إِلَيۡهَا', '"And of His signs is that He created for you from yourselves mates that you may find tranquility in them."', 'Surah Ar-Rum 30:21', 'The purpose of marriage in Islam is not just companionship — it is sakina, tranquility. If you are searching, ask Allah for the one who will bring peace to your heart, not just excitement. And if you are married, ask yourself: am I being the source of tranquility my spouse deserves?'),
      ('work job business career profession halal income success failure entrepreneur', 'فَٱبۡتَغُواْ عِندَ ٱللَّهِ ٱلرِّزۡقَ وَٱعۡبُدُوهُ وَٱشۡكُرُواْ لَهُۥٓ', '"So seek from Allah your provision and worship Him and be grateful to Him."', 'Surah Al-Ankabut 29:17', 'Your rizq is written — but that does not mean passive waiting. This verse commands you to seek it while worshipping and thanking Allah simultaneously. Your career can be an act of worship if your niyyah is right. Work hard, trust Allah for the result, and never forget to say Alhamdulillah at every stage.'),
      ('quran reading recitation memorize hafiz learning study Ramadan night prayer', 'إِنَّ هَٰذَا ٱلۡقُرۡءَانَ يَهۡدِي لِلَّتِي هِيَ أَقۡوَمُ', '"Indeed, this Quran guides to that which is most suitable."', 'Surah Al-Isra 17:9', 'The Quran is not just a book to read — it is a GPS for your entire life. Every time you sit with it, even for five minutes, you are recalibrating your direction. Don''t let the pursuit of perfection stop you from opening it today. One ayah read with presence is better than ten read with distraction.'),
      ('dua prayer supplication asking Allah worship connection spiritual disconnect', 'وَقَالَ رَبُّكُمُ ٱدۡعُونِيٓ أَسۡتَجِبۡ لَكُمۡ', '"And your Lord says: Call upon Me; I will respond to you."', 'Surah Ghafir 40:60', 'Du''a is the only hotline where the other side always picks up. Allah does not say "call Me and I might respond" — He says "I will respond." The response might be an answer, a delay, or something better. But the call is never ignored. Lift your hands tonight — even if you don''t know what to say.'),
      ('nature creation beauty earth stars ocean mountains travel awe wonder', 'إِنَّ فِي خَلۡقِ ٱلسَّمَٰوَٰتِ وَٱلۡأَرۡضِ وَٱخۡتِلَٰفِ ٱلَّيۡلِ وَٱلنَّهَارِ لَءَايَٰتٖ لِّأُوْلِي ٱلۡأَلۡبَٰبِ', '"Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for those of understanding."', 'Surah Al-Imran 3:190', 'The universe is speaking — but only ulul albab (people of intellect and heart) can hear it. Every sunrise, every star, every ocean wave is a divine message sent directly to you. When you feel disconnected from Allah, go outside. Creation is one of the most accessible reminders He has given us.'),
      ('suicide depression hopeless giving up dark thoughts worthless empty broken struggling', 'وَلَا تَقۡتُلُوٓاْ أَنفُسَكُمۡ إِنَّ ٱللَّهَ كَانَ بِكُمۡ رَحِيمٗا', '"And do not kill yourselves. Indeed, Allah is to you ever Merciful."', 'Surah An-Nisa 4:29', 'If you are reading this and darkness feels overwhelming — this ayah is for you. Allah calls Himself Raheem specifically in the context of your life mattering. You are not a burden. You are not beyond help. Please reach out to someone you trust, a counselor, or an Islamic helpline. Your life is a trust from Allah — and He is merciful.')
      ON CONFLICT DO NOTHING
    `);

    logger.info("soul_search_verses seeded");
    logger.info("Database seeding complete");
  } catch (err) {
    logger.error({ err }, "Database seeding failed");
  }
}
