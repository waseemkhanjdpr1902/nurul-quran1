import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useStockswapRegister, useStockswapAcceptTerms } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Store } from "lucide-react";

const loginSchema = z.object({
  emailOrPhone: z.string().min(3, "Required"),
  password: z.string().min(6, "Required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  
  const [showTerms, setShowTerms] = useState(false);
  const [tempAuth, setTempAuth] = useState<{ user: any; token: string; shop: any } | null>(null);

  const loginMutation = useStockswapRegister();
  const acceptTermsMutation = useStockswapAcceptTerms();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    const isEmail = values.emailOrPhone.includes("@");
    loginMutation.mutate(
      {
        data: {
          email: isEmail ? values.emailOrPhone : undefined,
          phone: !isEmail ? values.emailOrPhone : undefined,
          password: values.password,
        },
      },
      {
        onSuccess: (data) => {
          if (!data.user.termsAccepted) {
            setTempAuth(data);
            setShowTerms(true);
          } else {
            setAuth(data.user, data.token, data.shop);
            if (!data.shop) {
              setLocation("/stockswap/onboarding");
            } else {
              setLocation("/stockswap/");
            }
          }
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error?.response?.data?.error || "Could not log in",
          });
        },
      }
    );
  }

  function handleAcceptTerms() {
    if (!tempAuth) return;
    
    acceptTermsMutation.mutate(
      { data: { userId: tempAuth.user.id } },
      {
        onSuccess: () => {
          setAuth({ ...tempAuth.user, termsAccepted: true }, tempAuth.token, tempAuth.shop);
          setShowTerms(false);
          if (!tempAuth.shop) {
            setLocation("/stockswap/onboarding");
          } else {
            setLocation("/stockswap/");
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Could not accept terms." });
        }
      }
    );
  }

  return (
    <div className="min-h-[100dvh] bg-orange-50 flex flex-col justify-center items-center p-6 w-full max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-64 h-64 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-white shadow-xl mb-6">
            <Store className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">StockSwap</h1>
          <p className="text-lg text-orange-800 mt-2 font-medium">B2B Inventory Market</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border border-orange-100">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="emailOrPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email or Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email or phone" className="h-14 text-lg" data-testid="input-identifier" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-14 text-lg" data-testid="input-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold rounded-xl shadow-md" 
                disabled={loginMutation.isPending}
                data-testid="btn-login"
              >
                {loginMutation.isPending ? "Logging in..." : "Login / Register"}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-terms">
          <DialogHeader>
            <DialogTitle className="text-2xl">Terms of Service</DialogTitle>
            <DialogDescription className="text-base">
              Welcome to StockSwap! Before you begin, please accept our terms.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-orange-50 p-4 rounded-lg my-4 text-orange-900 border border-orange-200">
            <p className="font-semibold">This is a B2B exchange.</p>
            <p className="mt-2">All inspections must be done in person at the shop location. StockSwap does not handle the physical goods or guarantee quality.</p>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 text-lg font-bold" 
              onClick={handleAcceptTerms}
              disabled={acceptTermsMutation.isPending}
              data-testid="btn-accept-terms"
            >
              {acceptTermsMutation.isPending ? "Accepting..." : "I Accept & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
