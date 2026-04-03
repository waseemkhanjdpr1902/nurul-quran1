import { Link, useLocation } from "wouter";
import { AudioPlayer } from "./audio-player";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { BookOpen, Library, GraduationCap, HeartHandshake, UserCircle, TrendingUp } from "lucide-react";
import { PwaInstallPrompt } from "./pwa-install-prompt";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: BookOpen },
    { href: "/library", label: "Library", icon: Library },
    { href: "/courses", label: "Courses", icon: GraduationCap },
    { href: "/halal-stocks", label: "Halal Stocks", icon: TrendingUp },
    { href: "/support", label: "Support", icon: HeartHandshake },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col pb-24">
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-bold text-primary tracking-tight">Nurul Quran</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === item.href ? "text-primary border-b-2 border-primary py-5" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
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
                <Button variant="ghost" asChild className="hidden md:flex">
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
      <nav className="md:hidden fixed bottom-[88px] left-0 right-0 border-t bg-background z-40 px-2 py-2 flex justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              location === item.href ? "text-primary" : "text-muted-foreground"
            }`}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <AudioPlayer />
      <PwaInstallPrompt />
    </div>
  );
}

// Inline Dropdown for Layout to avoid circular imports if not needed globally, or import correctly:
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
