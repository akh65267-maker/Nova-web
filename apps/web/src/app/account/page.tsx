"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@taskmanager/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@taskmanager/ui/components/card";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { useSessionCurrentUser } from "@taskmanager/auth/use-session";
import { useLogout } from "@/features/auth/use-logout";
import { useRequireSession } from "@taskmanager/auth/use-require-session";
import { useSessionStore } from "@taskmanager/auth/session-store";

export default function AccountPage() {
  const router = useRouter();
  const { isReady } = useRequireSession("/login");
  const { data: user, isLoading } = useSessionCurrentUser();
  const isAdmin = useSessionStore((state) => state.isAdmin());
  const logout = useLogout();

  if (!isReady) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Your account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user?.displayName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/orders">View orders</Link>}
            />
            {isAdmin && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3200"}>Open the admin</a>}
              />
            )}
            <Button
              variant="outline"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
