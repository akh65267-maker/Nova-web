import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

type Options = {
  /** Require the Admin role, not just any signed-in session. */
  requireAdmin?: boolean;
  /** Where to send an authenticated-but-not-admin user. Defaults to "/". */
  forbiddenRedirectTo?: string;
};

/**
 * Guards a client-rendered page behind auth (and optionally the Admin
 * role). Waits for the persisted auth store to rehydrate before deciding
 * to redirect - without this, a hard page load (not a client-side nav)
 * races the store's localStorage read and bounces an already-signed-in
 * user to /login.
 */
export function useRequireAuth(redirectTo: string, options: Options = {}) {
  const { requireAdmin = false, forbiddenRedirectTo = "/" } = options;
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isAdmin = useAuthStore((state) => state.isAdmin());

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.replace(forbiddenRedirectTo);
    }
  }, [hasHydrated, isAuthenticated, isAdmin, requireAdmin, redirectTo, forbiddenRedirectTo, router]);

  return { isReady: hasHydrated && isAuthenticated && (!requireAdmin || isAdmin) };
}
