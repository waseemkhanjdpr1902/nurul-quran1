import { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "default" | "midnight-madinah" | "desert-sunset" | "minimalist-zen";

export interface ThemeDefinition {
  key: AppTheme;
  label: string;
  bg: string;
  text: string;
  accent: string;
  cardBg: string;
  swatch: string;
  swatchBorder: string;
  description: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    key: "default",
    label: "Nurul",
    bg: "#ffffff",
    text: "#1a1a1a",
    accent: "#1a6b4a",
    cardBg: "rgba(255,255,255,0.95)",
    swatch: "#1a6b4a",
    swatchBorder: "#0f4d35",
    description: "Classic green — the colour of paradise",
  },
  {
    key: "midnight-madinah",
    label: "Midnight Madinah",
    bg: "#0A192F",
    text: "#E2E8F0",
    accent: "#64FFDA",
    cardBg: "rgba(10,25,47,0.88)",
    swatch: "#0A192F",
    swatchBorder: "#64FFDA",
    description: "Deep navy with emerald light",
  },
  {
    key: "desert-sunset",
    label: "Desert Sunset",
    bg: "#FFF5E6",
    text: "#4A2C2A",
    accent: "#FF8C42",
    cardBg: "rgba(255,245,230,0.93)",
    swatch: "#FF8C42",
    swatchBorder: "#c0611a",
    description: "Warm cream with desert orange",
  },
  {
    key: "minimalist-zen",
    label: "Minimalist Zen",
    bg: "#F0F2EF",
    text: "#2D3A3A",
    accent: "#7D8C7C",
    cardBg: "rgba(240,242,239,0.95)",
    swatch: "#7D8C7C",
    swatchBorder: "#4d5c4c",
    description: "Sage white with olive stillness",
  },
];

interface ThemeContextValue {
  theme: AppTheme;
  def: ThemeDefinition;
  setTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  def: THEMES[0],
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      return (localStorage.getItem("nq-theme") as AppTheme) ?? "default";
    } catch {
      return "default";
    }
  });

  const def = THEMES.find((t) => t.key === theme) ?? THEMES[0];

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem("nq-theme", t);
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-nq-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, def, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
