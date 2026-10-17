import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "./session-store";

type Options = {
  /** Require the Admin role, not just any signed-in session. */
  requireAdmin?: boolean;
  /** Where to send an authenticated-but-not-admin user. Defaults to "/". */
  forbiddenRedirectTo?: string;
};

/**
 * Guards a client-rendered page behind the session (and optionally the Admin role). It waits for
 * the first answer from /api/session before deciding anything: until then the page cannot tell
 * "signed out" from "not asked yet", and redirecting early would bounce a signed-in person to
 * the sign-in page on every hard load.
 */
export function useRequireSession(redirectTo: string, options: Options = {}) {
  const { requireAdmin = false, forbiddenRedirectTo = "/" } = options;
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const isAdmin = useSessionStore((state) => state.isAdmin());

  useEffect(() => {
    if (status === "loading") return;

    if (status === "anonymous") {
      router.replace(redirectTo);
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.replace(forbiddenRedirectTo);
    }
  }, [status, isAdmin, requireAdmin, redirectTo, forbiddenRedirectTo, router]);

  return { isReady: status === "authenticated" && (!requireAdmin || isAdmin) };
}
