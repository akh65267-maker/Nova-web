import { create } from "zustand";

export type SessionUser = { id: string; email: string; role: string };

type SessionState = {
  /** "loading" until the first answer from /api/session; the page cannot know before that. */
  status: "loading" | "authenticated" | "anonymous";
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
};

/**
 * Who is signed in, as the server told us. Unlike the token store this keeps no token and writes
 * nothing to storage: the session is in HttpOnly cookies the page cannot read, so all the page has
 * is the user's id, email and role, asked for from /api/session when it loads.
 */
export const useSessionStore = create<SessionState>()((set, get) => ({
  status: "loading",
  user: null,
  setUser: (user) => set({ user, status: user ? "authenticated" : "anonymous" }),
  isAuthenticated: () => get().status === "authenticated",
  isAdmin: () => get().user?.role === "Admin",
}));
