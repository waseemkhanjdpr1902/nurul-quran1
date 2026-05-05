// src/pages/Courses.tsx
const Courses = () => {
  const courseList = [
    {
      title: "Tajweed for Beginners",
      description: "Learn correct pronunciation and recitation rules of the Quran.",
      level: "Beginner",
    },
    {
      title: "Seerah of Prophet Muhammad ﷺ",
      description: "Life, lessons, and legacy of the final messenger.",
      level: "All levels",
    },
    {
      title: "Arabic Grammar (Nahw)",
      description: "Understand Quranic Arabic structure step by step.",
      level: "Intermediate",
    },
    {
      title: "40 Hadith of Imam Nawawi",
      description: "Study the core collection of prophetic traditions.",
      level: "Beginner",
    },
    {
      title: "Aqidah (Islamic Creed)",
      description: "Foundational beliefs of Ahl al-Sunnah wal-Jama'ah.",
      level: "Intermediate",
    },
    {
      title: "Tafsir of Juz 'Amma",
      description: "Detailed explanation of the last section of the Quran.",
      level: "Beginner",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Islamic Courses</h1>
      <p className="mb-8 text-gray-700">
        Structured courses to deepen your understanding of Islam. All courses are self-paced and
        free.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courseList.map((course, idx) => (
          <div key={idx} className="border rounded-lg p-5 shadow hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {course.level}
              </span>
            </div>
            <p className="text-gray-600 mt-2">{course.description}</p>
            <button className="mt-4 text-blue-600 hover:text-blue-800 font-medium">
              Enroll Now →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;
