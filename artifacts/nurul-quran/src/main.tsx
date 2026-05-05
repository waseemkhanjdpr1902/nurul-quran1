// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Home from "./pages/Home";
import Quran from "./pages/Quran";
import Discover from "./pages/Discover";
import Library from "./pages/Library";
import Courses from "./pages/Courses";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/quran", element: <Quran /> },
  { path: "/discover", element: <Discover /> },
  { path: "/library", element: <Library /> },
  { path: "/courses", element: <Courses /> },
  { path: "*", element: <NotFound /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
