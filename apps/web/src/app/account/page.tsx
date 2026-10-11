"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useLogout } from "@/features/auth/use-auth";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { useAuthStore } from "@/store/auth-store";

export default function AccountPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth("/login");
  const { data: user, isLoading } = useCurrentUser();
  const isAdmin = useAuthStore((state) => state.isAdmin());
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
                render={<Link href="/admin/products">Manage products</Link>}
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
