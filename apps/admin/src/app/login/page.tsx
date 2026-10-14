"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@taskmanager/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@taskmanager/ui/components/card";
import { ErrorMessage } from "@taskmanager/ui/components/error-message";
import { Input } from "@taskmanager/ui/components/input";
import { Label } from "@taskmanager/ui/components/label";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { useAuthStore } from "@taskmanager/auth/auth-store";
import { getRole } from "@taskmanager/auth/jwt";
import { useLogin } from "@taskmanager/auth/use-auth";

const NOT_ADMIN = "That account is not an administrator.";

// Only a path inside this app: the value comes from the URL, so an absolute or protocol-relative
// address would send the person somewhere else after signing in.
function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const loginMutation = useLogin();
  const logout = useAuthStore((state) => state.logout);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notAdmin, setNotAdmin] = useState(searchParams.get("forbidden") === "1");

  // Arriving here because a signed-in non-admin was turned away: drop that session, so the next
  // attempt starts clean and the shop's account does not stay signed in to the console.
  useEffect(() => {
    if (searchParams.get("forbidden") === "1") logout();
  }, [searchParams, logout]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotAdmin(false);
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (result) => {
          if (getRole(result.token) !== "Admin") {
            logout();
            setNotAdmin(true);
            return;
          }
          router.push(redirectTo);
        },
      },
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Admin sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>

            {notAdmin && <ErrorMessage>{NOT_ADMIN}</ErrorMessage>}
            {loginMutation.isError && (
              <ErrorMessage>{getApiErrorMessage(loginMutation.error, "Invalid email or password.")}</ErrorMessage>
            )}

            <Button type="submit" disabled={loginMutation.isPending} className="mt-2 w-full">
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
