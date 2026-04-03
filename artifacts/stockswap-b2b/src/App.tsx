import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

// Pages
import LoginPage from "@/pages/login";
import OnboardingPage from "@/pages/onboarding";
import HomePage from "@/pages/home";
import ListPage from "@/pages/list";
import MyListingsPage from "@/pages/my-listings";
import ListingDetailPage from "@/pages/listing-detail";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, requireShop = false, ...rest }: any) {
  const { isAuthenticated, shop } = useAuth();
  
  if (!isAuthenticated) {
    window.location.href = "/stockswap/login";
    return null;
  }
  
  if (requireShop && !shop) {
    window.location.href = "/stockswap/onboarding";
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/stockswap/login" component={LoginPage} />
      <Route path="/stockswap/terms" component={TermsPage} />
      <Route path="/stockswap/privacy" component={PrivacyPage} />
      
      <Route path="/stockswap/onboarding">
        {() => <ProtectedRoute component={OnboardingPage} />}
      </Route>
      
      <Route path="/stockswap/">
        {() => <ProtectedRoute component={HomePage} requireShop={true} />}
      </Route>
      
      <Route path="/stockswap/list">
        {() => <ProtectedRoute component={ListPage} requireShop={true} />}
      </Route>
      
      <Route path="/stockswap/my-listings">
        {() => <ProtectedRoute component={MyListingsPage} requireShop={true} />}
      </Route>
      
      <Route path="/stockswap/listing/:id">
        {() => <ProtectedRoute component={ListingDetailPage} requireShop={true} />}
      </Route>

      <Route path="/" component={() => {
        window.location.href = "/stockswap/";
        return null;
      }} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="">
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
