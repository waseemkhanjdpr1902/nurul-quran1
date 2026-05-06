import React from "react";
import ReactDOM from "react-dom/client";
import { Switch, Route } from "wouter"; // ✅ wouter is the installed router — not react-router-dom
import Home from "./pages/Home";
import Quran from "./pages/Quran";
import Discover from "./pages/Discover";
import Library from "./pages/Library";
import Courses from "./pages/Courses";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quran" component={Quran} />
      <Route path="/discover" component={Discover} />
      <Route path="/library" component={Library} />
      <Route path="/courses" component={Courses} />
      <Route component={NotFound} />
    </Switch>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
