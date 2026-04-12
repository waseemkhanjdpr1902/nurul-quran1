import { Layout } from "@/components/layout";
import { AuthProvider } from "@/hooks/use-auth";
import { AudioPlayerProvider } from "@/hooks/use-audio-player";
import { ThemeProvider } from "@/contexts/theme-context";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import HalalStocks from "@/pages/halal-stocks";
import QuranReader from "@/pages/quran-reader";
import Discover from "@/pages/discover";
import PrayerTimes from "@/pages/prayer-times";
import Hadith from "@/pages/hadith";
import Duas from "@/pages/duas";
import AsmaulHusna from "@/pages/asmaul-husna";
import Calendar from "@/pages/calendar";
import LearnArabic from "@/pages/learn-arabic";
import Contact from "@/pages/contact";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/halal-stocks" component={HalalStocks} />
        <Route path="/quran" component={QuranReader} />
        <Route path="/quran/:surahId" component={QuranReader} />
        <Route path="/discover" component={Discover} />
        <Route path="/prayer-times" component={PrayerTimes} />
        <Route path="/hadith" component={Hadith} />
        <Route path="/duas" component={Duas} />
        <Route path="/asmaul-husna" component={AsmaulHusna} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/learn-arabic" component={LearnArabic} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AudioPlayerProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
