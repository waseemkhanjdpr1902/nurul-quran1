import { useState } from "react";
import { STATIC_COURSES, WHAT_YOU_LEARN } from "../data/courseData";

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "bg-green-100 text-green-800",
  Intermediate: "bg-yellow-100 text-yellow-800",
  Advanced: "bg-red-100 text-red-800",
  "All Levels": "bg-blue-100 text-blue-800",
  "Beginner–Intermediate": "bg-teal-100 text-teal-800",
};

const CATEGORIES = ["All", ...Array.from(new Set(STATIC_COURSES.map((c) => c.category)))];

const Courses = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    selectedCategory === "All"
      ? STATIC_COURSES
      : STATIC_COURSES.filter((c) => c.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-emerald-800">Islamic Courses</h1>
        <p className="text-gray-600 text-lg">
          {STATIC_COURSES.length} structured, self-paced courses — all free. Filter by subject
          below.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-emerald-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((course) => {
          const isExpanded = expandedId === course.id;
          const levelColor = LEVEL_COLORS[course.level] ?? "bg-gray-100 text-gray-700";
          const whatYouLearn = WHAT_YOU_LEARN[course.category] ?? [];

          return (
            <div
              key={course.id}
              className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col"
            >
              {/* Top badges */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {course.category}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${levelColor}`}>
                  {course.level}
                </span>
              </div>

              {/* Title & description */}
              <h2 className="text-lg font-semibold text-gray-800 mb-1">{course.title}</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-3 flex-1">
                {course.description}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                <span>👤 {course.speakerName}</span>
                <span>📚 {course.lectureCount} lectures</span>
                <span>⭐ {course.rating}</span>
              </div>

              {/* What you'll learn (expandable) */}
              {whatYouLearn.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : course.id)}
                    className="text-xs text-emerald-700 font-medium hover:underline"
                  >
                    {isExpanded ? "▲ Hide details" : "▼ What you'll learn"}
                  </button>
                  {isExpanded && (
                    <ul className="mt-2 space-y-1">
                      {whatYouLearn.map((item) => (
                        <li key={item} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Enroll button */}
              <a
                href={course.freeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto block text-center bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-emerald-800 transition-colors"
              >
                Enroll Free →
              </a>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 mt-16">No courses found for this category.</p>
      )}
    </div>
  );
};

export default Courses;
