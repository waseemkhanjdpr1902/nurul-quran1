import { useAppTheme, THEMES, type AppTheme } from "@/contexts/theme-context";
import { Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Switch theme"
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-muted"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden lg:inline">Theme</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 border rounded-2xl shadow-xl p-4 min-w-[220px] space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose a theme</p>
          <div className="space-y-2">
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => { setTheme(t.key as AppTheme); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                    active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full flex-shrink-0 border-2 shadow-sm"
                    style={{ background: t.swatch, borderColor: t.swatchBorder }}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${active ? "text-primary" : "text-gray-800 dark:text-gray-200"}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  </div>
                  {active && (
                    <span className="ml-auto text-primary text-lg leading-none">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
