import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Your existing pages – change these paths to match your actual file names
import Home from './pages/Home';
import Quran from './pages/Quran';
import Discover from './pages/Discover';
import NotFound from './pages/NotFound';  // create this if missing

// New pages
import Library from './pages/Library';
import Courses from './pages/Courses';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quran" element={<Quran />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/library" element={<Library />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
