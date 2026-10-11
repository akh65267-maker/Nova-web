import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getRole } from "@/lib/jwt";

type AuthState = {
  token: string | null;
  expiresAtUtc: string | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setSession: (token: string, expiresAtUtc: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAtUtc: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSession: (token, expiresAtUtc) => set({ token, expiresAtUtc }),
      logout: () => set({ token: null, expiresAtUtc: null }),
      isAuthenticated: () => {
        const { token, expiresAtUtc } = get();
        if (!token || !expiresAtUtc) return false;
        return new Date(expiresAtUtc).getTime() > Date.now();
      },
      isAdmin: () => {
        const { token, isAuthenticated } = get();
        if (!token || !isAuthenticated()) return false;
        return getRole(token) === "Admin";
      },
    }),
    {
      name: "tm-auth",
      skipHydration: true,
      partialize: (state) => ({ token: state.token, expiresAtUtc: state.expiresAtUtc }),
    },
  ),
);
