import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const mutation = useLoginUser();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    mutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          login(res.token, res.user);
          setLocation("/");
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid email or password", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 text-[400px] font-arabic flex items-center justify-center select-none">
          <span style={{ fontFamily: "'Amiri Quran', serif" }}>﷽</span>
        </div>
        <div className="relative text-center text-primary-foreground">
          <BookOpen className="w-16 h-16 mx-auto mb-6 text-primary-foreground/80" />
          <h2 className="text-3xl font-serif font-bold mb-4">Nurul Quran</h2>
          <p className="text-primary-foreground/70 text-lg max-w-sm">
            "Read! In the name of your Lord who created."
          </p>
          <p className="text-primary-foreground/40 text-sm mt-2">— Quran 96:1</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2 lg:hidden mb-6">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-serif font-bold text-primary">Nurul Quran</span>
            </Link>
            <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        data-testid="input-email"
                      />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
