import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { decodeJwt } from "@/lib/jwt";
import { getUser, login, register, type LoginRequest, type RegisterRequest } from "./api";

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => login(request),
    onSuccess: (result) => {
      setSession(result.token, result.expiresAtUtc);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (request: RegisterRequest) => register(request),
  });
}

export function useCurrentUserId(): string | null {
  const token = useAuthStore((state) => state.token);
  if (!token) return null;
  return decodeJwt(token)?.sub ?? null;
}

export function useCurrentUser() {
  const userId = useCurrentUserId();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: ["currentUser", userId],
    queryFn: () => getUser(userId!),
    enabled: Boolean(userId) && isAuthenticated,
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const clearCart = useCartStore((state) => state.clear);
  const queryClient = useQueryClient();

  // Signing out is a deliberate act on a browser someone else may use next, so the cart goes
  // with the session: it is kept in the browser separately and would otherwise outlive it.
  // (Deliberately not done when a token merely expires - api-client.ts - which would drop a
  // cart the person never meant to throw away.)
  return () => {
    logout();
    clearCart();
    queryClient.clear();
  };
}
