// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import existing pages (adjust paths as needed)
import Home from "./pages/Home";
import Quran from "./pages/Quran";
import Discover from "./pages/Discover";
import NotFound from "./pages/NotFound";

// Import the two new pages
import Library from "./pages/Library";
import Courses from "./pages/Courses";

// If you have a layout component (e.g., with navbar), wrap routes inside it.
// Otherwise, directly use Routes.

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quran" element={<Quran />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/library" element={<Library />} />
        <Route path="/courses" element={<Courses />} />
        {/* Catch-all 404 route – must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
