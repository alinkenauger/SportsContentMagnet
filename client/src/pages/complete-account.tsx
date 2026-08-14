import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type PendingSignupResponse = {
  ready: true;
  proof: "session" | "email";
};

type CompleteAccountResponse = {
  message: string;
  authenticated: true;
  emailVerified: boolean;
  redirect: string;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
  redirect?: string;
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly redirect?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function postJson<TResponse>(url: string, body: Record<string, unknown>): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as ApiErrorBody & TResponse;
  if (!response.ok) {
    throw new ApiError(
      payload.message || "Something went wrong. Please try again.",
      response.status,
      payload.code,
      payload.redirect,
    );
  }
  return payload;
}

function takeCompletionTokenFromLocation(): string | undefined {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = hash.get("token") || undefined;
  if (token) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  return token;
}

export default function CompleteAccount() {
  const { toast } = useToast();
  const [completionToken] = useState(takeCompletionTokenFromLocation);
  const [setupState, setSetupState] = useState<"checking" | "ready" | "unavailable">("checking");
  const [setupError, setSetupError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [signInRequired, setSignInRequired] = useState(false);

  useEffect(() => {
    let active = true;
    postJson<PendingSignupResponse>("/api/auth/pending-signup", {
      ...(completionToken ? { token: completionToken } : {}),
    }).then(() => {
      if (active) setSetupState("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setSetupError(error instanceof Error ? error.message : "This setup session is unavailable.");
      setSetupState("unavailable");
    });
    return () => {
      active = false;
    };
  }, [completionToken]);

  const completeAccountMutation = useMutation({
    mutationFn: () => postJson<CompleteAccountResponse>("/api/auth/complete-account", {
      password,
      ...(completionToken ? { token: completionToken } : {}),
    }),
    onSuccess: async (response) => {
      toast({
        title: "Account setup complete",
        description: "Welcome to VidMagnet. Your workspace is ready.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.replace(response.redirect || "/dashboard");
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === "ACCOUNT_COMPLETED_SIGN_IN_REQUIRED") {
        setPassword("");
        setConfirmPassword("");
        setSignInRequired(true);
      }
      setFormError(error.message || "We could not complete your account. Please try again.");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSignInRequired(false);
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    completeAccountMutation.mutate();
  };

  if (setupState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4EFE6] p-4" aria-busy="true">
        <p className="text-sm font-medium text-[#101419]/70">Preparing your VidMagnet account…</p>
      </main>
    );
  }

  if (setupState === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4EFE6] p-4">
        <Card className="w-full max-w-md border-[#101419]/10 bg-[#FBF8F2]">
          <CardHeader>
            <CardTitle>Setup link unavailable</CardTitle>
            <CardDescription>{setupError}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="bg-[#FF6B3D] text-[#101419] hover:bg-[#FF805C]">
              <Link href="/">Start signup again</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4EFE6] p-4">
      <Card className="w-full max-w-md border-[#101419]/10 bg-[#FBF8F2] shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#79D9C7]/30">
            <CheckCircle className="h-8 w-8 text-[#158A63]" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#101419]">VidMagnet</p>
          <CardTitle className="text-2xl font-bold">Create your password</CardTitle>
          <CardDescription>
            Finish setting up your account, then start building your first lead magnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={completeAccountMutation.isPending}>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  aria-describedby={formError ? "account-setup-error" : undefined}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                aria-describedby={formError ? "account-setup-error" : undefined}
              />
            </div>

            {formError ? (
              <div id="account-setup-error" role="alert" className="space-y-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p>{formError}</p>
                {signInRequired ? (
                  <Button asChild variant="outline" className="border-red-200 bg-white text-red-800 hover:bg-red-100">
                    <Link href="/login">Sign in to continue</Link>
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full bg-[#FF6B3D] font-bold text-[#101419] hover:bg-[#FF805C]"
              disabled={completeAccountMutation.isPending}
            >
              {completeAccountMutation.isPending ? "Finishing setup…" : "Finish account setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
