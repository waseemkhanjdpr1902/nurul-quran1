import { Link, useLocation } from "wouter";
import { AudioPlayer } from "./audio-player";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Compass,
  Library,
  GraduationCap,
  HeartHandshake,
  UserCircle,
  TrendingUp,
  Moon,
  Home,
  Clock,
  ScrollText,
  Star,
  BookMarked,
  CalendarDays,
  Languages,
  Menu,
  X,
} from "lucide-react";
import { PwaInstallPrompt } from "./pwa-install-prompt";
import React, { useState } from "react";

function DownloadAppModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-lg text-foreground">Nurul Quran App</h2>
            <p className="text-xs text-muted-foreground">Learn Islam anywhere, anytime</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Get the full Nurul Quran experience on your phone — Quran recitation, Islamic courses, prayer times, duas, and more.
        </p>

        {/* Store Buttons */}
        <div className="space-y-3">
          <a
            href="https://play.google.com/store/apps/details?id=com.nurulquran.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#0d1117] text-white rounded-xl px-4 py-3 hover:bg-[#1a2332] transition-colors w-full"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="currentColor">
              <path d="M3.18 23.76c.33.19.7.24 1.06.16l11.94-6.9-2.59-2.59-10.41 9.33zm-1.93-20.4C1.1 3.6 1 3.9 1 4.22v15.56c0 .32.1.62.25.87l.09.08 8.71-8.71v-.2L1.34 3.28l-.09.08zm19.4 8.74l-2.6-1.5-2.9 2.9 2.9 2.9 2.62-1.51c.75-.43.75-1.36-.02-1.79zM4.24.08L16.18 7.2l-2.59 2.59L3.18.46C3.51.26 3.93.27 4.24.08z"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-white/60 leading-none">GET IT ON</p>
              <p className="text-sm font-semibold leading-tight">Google Play</p>
            </div>
          </a>

          <a
            href="https://apps.apple.com/app/nurul-quran/id0000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#0d1117] text-white rounded-xl px-4 py-3 hover:bg-[#1a2332] transition-colors w-full"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-white/60 leading-none">DOWNLOAD ON THE</p>
              <p className="text-sm font-semibold leading-tight">App Store</p>
            </div>
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Free to download · Premium features available
        </p>
      </div>
    </div>
  );
}

const primaryNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quran", label: "Quran", icon: Moon },
  { href: "/library", label: "Library", icon: Library },
  { href: "/courses", label: "Courses", icon: GraduationCap },
  { href: "/halal-stocks", label: "Stocks", icon: TrendingUp },
  { href: "/support", label: "Premium", icon: HeartHandshake },
];

const islamicNavItems = [
  { href: "/prayer-times", label: "Prayer Times", icon: Clock },
  { href: "/hadith", label: "Hadith", icon: ScrollText },
  { href: "/duas", label: "Duas", icon: BookMarked },
  { href: "/asmaul-husna", label: "99 Names", icon: Star },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/learn-arabic", label: "Learn Arabic", icon: Languages },
];

const mobileBottomNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quran", label: "Quran", icon: Moon },
  { href: "/prayer-times", label: "Prayers", icon: Clock },
  { href: "/duas", label: "Duas", icon: BookMarked },
  { href: "/hadith", label: "Hadith", icon: ScrollText },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // Show download popup once per session right after login
  const prevAuth = React.useRef(false);
  React.useEffect(() => {
    if (isAuthenticated && !prevAuth.current) {
      const alreadyShown = sessionStorage.getItem("nq_app_prompt_shown");
      if (!alreadyShown) {
        setTimeout(() => setShowDownload(true), 800);
        sessionStorage.setItem("nq_app_prompt_shown", "1");
      }
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 148px)" }}>
      {/* Mobile Top Bar */}
      <header
        className="md:hidden sticky top-0 z-50 w-full bg-primary text-primary-foreground flex items-center justify-between px-4 h-14"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span className="text-lg font-serif font-bold tracking-tight">Nurul Quran</span>
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {(user as any)?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer w-full">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="secondary" className="text-primary font-semibold h-8 px-3">
              <Link href="/register">Sign up</Link>
            </Button>
          )}
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-14 bottom-0 w-72 bg-background shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">Navigation</p>
              {primaryNavItems.map((item) => {
                const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label === "Stocks" ? "Halal Stocks" : item.label}
                  </Link>
                );
              })}

              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">Islamic Features</p>
                {islamicNavItems.map((item) => {
                  const active = location === item.href || location.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" style={{ color: active ? undefined : "#d4af37" }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="pt-4">
                <Link
                  href="/discover"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    location === "/discover" ? "bg-primary/10 text-primary" : "text-emerald-600 hover:bg-muted"
                  }`}
                >
                  <Compass className="h-5 w-5 shrink-0" />
                  Discover Islam
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-bold text-primary tracking-tight">Nurul Quran</span>
          </Link>

          <nav className="flex items-center gap-1">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-lg hover:bg-muted ${
                  (item.href === "/" ? location === "/" : location.startsWith(item.href))
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground"
                }`}
              >
                {item.label === "Stocks" ? "Halal Stocks" : item.label}
              </Link>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-lg hover:bg-muted ${
                    islamicNavItems.some((i) => location === i.href || location.startsWith(i.href))
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground"
                  }`}
                >
                  <Star className="h-3.5 w-3.5 shrink-0" style={{ color: "#d4af37" }} />
                  Islamic Features
                  <svg className="h-3 w-3 ml-0.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {islamicNavItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 cursor-pointer w-full"
                    >
                      <item.icon className="h-4 w-4 shrink-0" style={{ color: "#d4af37" }} />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-px h-5 bg-border mx-1" />
            <Link
              href="/discover"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-lg hover:bg-muted ${
                location === "/discover" ? "text-primary bg-primary/5" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Compass className="h-4 w-4" />
              Discover Islam
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer w-full">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background z-40 flex justify-around border-t shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0px)",
          paddingTop: "6px",
          height: "calc(60px + env(safe-area-inset-bottom))",
        }}
      >
        {mobileBottomNav.map((item) => {
          const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${active ? "bg-primary/10" : ""}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <AudioPlayer />
      <PwaInstallPrompt />
      <DownloadAppModal open={showDownload} onClose={() => setShowDownload(false)} />
    </div>
  );
}
