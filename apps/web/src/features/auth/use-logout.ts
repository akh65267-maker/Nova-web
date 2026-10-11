import { useLogout as useEndSession } from "@taskmanager/auth/use-auth";
import { useCartStore } from "@/store/cart-store";

/**
 * Signing out is a deliberate act on a browser someone else may use next, so the cart goes with
 * the session: it is kept in the browser separately and would otherwise outlive it. (Deliberately
 * not done when a token merely expires - the 401 handler in lib/api.ts - which would drop a cart
 * the person never meant to throw away.)
 */
export function useLogout() {
  const clearCart = useCartStore((state) => state.clear);

  return useEndSession({ onLoggedOut: clearCart });
}
