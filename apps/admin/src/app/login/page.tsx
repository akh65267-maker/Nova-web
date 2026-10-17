"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@taskmanager/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@taskmanager/ui/components/card";
import { ErrorMessage } from "@taskmanager/ui/components/error-message";
import { Input } from "@taskmanager/ui/components/input";
import { Label } from "@taskmanager/ui/components/label";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { isAxiosError } from "axios";
import { useSessionLogin, useSessionLogout } from "@taskmanager/auth/use-session";

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
  const loginMutation = useSessionLogin();
  const logout = useSessionLogout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notAdmin, setNotAdmin] = useState(searchParams.get("forbidden") === "1");

  // Arriving here because a signed-in non-admin was turned away: drop that session, so the next
  // attempt starts clean. (The server no longer lets a non-admin have a session in this app, so
  // this is a safety net, not the usual way to meet that case.)
  useEffect(() => {
    if (searchParams.get("forbidden") === "1") void logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- logout is recreated on every render; run once per arrival
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotAdmin(false);
    loginMutation.mutate({ email, password }, { onSuccess: () => router.push(redirectTo) });
  }

  // The server refuses an account that is not an administrator with a 403, after the password was
  // right: that is its own message, not "invalid email or password".
  const refusedAsNotAdmin = isAxiosError(loginMutation.error) && loginMutation.error.response?.status === 403;

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

            {(notAdmin || refusedAsNotAdmin) && <ErrorMessage>{NOT_ADMIN}</ErrorMessage>}
            {loginMutation.isError && !refusedAsNotAdmin && (
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
