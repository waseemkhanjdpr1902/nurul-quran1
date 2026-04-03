import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Zap } from "lucide-react";
import { useCreateInventoryCheckoutSession } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Upgrade() {
  const { user, isProTier } = useAuth();
  const checkoutMutation = useCreateInventoryCheckoutSession();
  const { toast } = useToast();

  const handleUpgrade = () => {
    const base = import.meta.env.BASE_URL ?? "/inventory/";
    const origin = window.location.origin;
    checkoutMutation.mutate(
      { 
        data: {
          successUrl: `${origin}${base}`,
          cancelUrl: `${origin}${base}upgrade`,
          userId: user?.userId
        }
      },
      {
        onSuccess: (data) => {
          if (data.url) {
            window.location.href = data.url;
          }
        },
        onError: () => {
          toast({ title: "Failed to initiate checkout", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto py-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Upgrade to Pro</h1>
          <p className="text-muted-foreground">Take your inventory management to the next level.</p>
        </div>

        {isProTier ? (
          <Card className="border-primary bg-primary/5">
            <CardHeader className="text-center">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-xl">You're a Pro!</CardTitle>
              <CardDescription>
                You have access to all premium features.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-primary/50 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg uppercase tracking-wider">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Pro Plan</CardTitle>
              <CardDescription>Everything you need for a growing business.</CardDescription>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                $5
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  "Unlimited products (Free limit: 100)",
                  "Advanced AI image recognition",
                  "Detailed exportable audit logs",
                  "Low stock email alerts",
                  "Remove all advertisements",
                  "Priority customer support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full text-lg h-12" 
                onClick={handleUpgrade}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? "Processing..." : "Upgrade Now"}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Secure payment powered by Stripe.</p>
          <p className="mt-1">Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </AppLayout>
  );
}
