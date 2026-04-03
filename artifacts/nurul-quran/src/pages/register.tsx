import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const mutation = useRegisterUser();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (data: RegisterForm) => {
    mutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          login(res.token, res.user);
          setLocation("/");
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "Registration failed. Please try again.";
          toast({ title: "Error", description: msg, variant: "destructive" });
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
          <h2 className="text-3xl font-serif font-bold mb-4">Join Nurul Quran</h2>
          <p className="text-primary-foreground/70 text-lg max-w-sm">
            Begin your journey with authentic Islamic education from qualified scholars.
          </p>
        </div>
      </div>

      {/* Right register form */}
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
            <h1 className="text-3xl font-serif font-bold text-foreground">Create an account</h1>
            <p className="text-muted-foreground mt-1">Start your Islamic learning journey today</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
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
                      <Input type="password" placeholder="Minimum 8 characters" {...field} data-testid="input-password" />
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
