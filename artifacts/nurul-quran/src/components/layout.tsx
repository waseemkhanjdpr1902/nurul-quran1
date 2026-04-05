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
  Sparkles,
} from "lucide-react";
import { PwaInstallPrompt } from "./pwa-install-prompt";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, logout, user } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/quran", label: "Quran", icon: Moon },
    { href: "/library", label: "Library", icon: Library },
    { href: "/courses", label: "Courses", icon: GraduationCap },
    { href: "/halal-stocks", label: "Stocks", icon: TrendingUp },
    { href: "/support", label: "Premium", icon: HeartHandshake },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 148px)" }}>
      {/* Mobile Top Bar — visible only on mobile */}
      <header className="md:hidden sticky top-0 z-50 w-full bg-primary text-primary-foreground flex items-center justify-between px-4 h-14"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span className="text-lg font-serif font-bold tracking-tight">Nurul Quran</span>
        </Link>
        <div className="flex items-center gap-1">
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
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="text-primary font-semibold h-8 px-3"
            >
              <Link href="/register">Sign up</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Desktop Header — visible on md+ */}
      <header className="hidden md:block sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-bold text-primary tracking-tight">Nurul Quran</span>
          </Link>

          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === item.href ? "text-primary border-b-2 border-primary py-5" : "text-muted-foreground"
                }`}
              >
                {item.label === "Stocks" ? "Halal Stocks" : item.label}
              </Link>
            ))}
            <Link
              href="/engage"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                location === "/engage" ? "text-primary border-b-2 border-primary py-5" : "text-violet-600 dark:text-violet-400"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Reflect
            </Link>
            <Link
              href="/discover"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                location === "/discover" ? "text-primary border-b-2 border-primary py-5" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Compass className="h-4 w-4" />
              Discover Islam
            </Link>
          </nav>

          <div className="flex items-center gap-2">
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
        {navItems.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
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
