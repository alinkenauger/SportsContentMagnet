import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type LoginResponse = {
  message: string;
  authenticated: true;
  redirect?: string;
};

type ApiErrorBody = {
  message?: string;
};

async function loginWithPassword(credentials: { email: string; password: string }): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  const payload = await response.json().catch(() => ({})) as ApiErrorBody & LoginResponse;
  if (!response.ok) {
    throw new Error(payload.message || "Invalid email or password. Please try again.");
  }
  return payload;
}

export default function Login() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginWithPassword,
    onSuccess: async (response) => {
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in to VidMagnet.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.replace(response.redirect || "/dashboard");
    },
    onError: (error: Error) => {
      setFormError(error.message || "Invalid email or password. Please try again.");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    
    if (!email || !password) {
      setFormError("Please enter both email and password.");
      return;
    }
    
    loginMutation.mutate({ email, password });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4EFE6] p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-[#101419]/70 hover:text-[#101419]">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to home
            </Button>
          </Link>
        </div>

        <Card className="border-[#101419]/10 bg-[#FBF8F2] shadow-xl">
          <CardHeader className="text-center">
            <p className="text-sm font-bold text-[#101419]">VidMagnet</p>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your VidMagnet account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loginMutation.isPending}>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  aria-describedby={formError ? "login-error" : undefined}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    aria-describedby={formError ? "login-error" : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {formError ? (
                <p id="login-error" role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              
              <Button 
                type="submit" 
                className="w-full bg-[#FF6B3D] font-bold text-[#101419] hover:bg-[#FF805C]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            
            <div className="mt-6 text-center space-y-3">
              <Link href="/reset-password">
                <Button variant="link" className="text-sm text-gray-600 hover:text-gray-900">
                  Forgot your password?
                </Button>
              </Link>
              
              <div className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/">
                  <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700">
                    Sign up for free
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
