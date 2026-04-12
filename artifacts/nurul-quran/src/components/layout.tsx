import { Link, useLocation } from "wouter";
import { AudioPlayer } from "./audio-player";
import { Button } from "./ui/button";
import {
  BookOpen,
  Compass,
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
  Mail,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PwaInstallPrompt } from "./pwa-install-prompt";
import React, { useState } from "react";


const primaryNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quran", label: "Quran", icon: Moon },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                    {item.label}
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
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    location === "/contact" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Mail className="h-5 w-5 shrink-0" />
                  Contact
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
                {item.label}
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
            <Link
              href="/contact"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-lg hover:bg-muted ${
                location === "/contact" ? "text-primary bg-primary/5" : "text-muted-foreground"
              }`}
            >
              <Mail className="h-4 w-4" />
              Contact
            </Link>
          </nav>

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
    </div>
  );
}
