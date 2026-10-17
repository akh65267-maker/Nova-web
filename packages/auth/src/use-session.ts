import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, type LoginRequest } from "@taskmanager/api/auth-api";
import { sessionClient } from "@taskmanager/api/client";
import { useSessionStore, type SessionUser } from "./session-store";

/**
 * Asks the server who is signed in (it reads the HttpOnly cookies) and records the answer. Call it
 * once when the app loads. A failure to ask counts as signed out: the page then shows the sign-in
 * button, and the next real request finds out the truth.
 */
export async function loadSession(): Promise<void> {
  try {
    const { data } = await sessionClient.get<{ authenticated: boolean; user?: SessionUser }>("/session");
    useSessionStore.getState().setUser(data.authenticated && data.user ? data.user : null);
  } catch {
    useSessionStore.getState().setUser(null);
  }
}

export function useSessionLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: LoginRequest) => {
      const { data } = await sessionClient.post<{ user: SessionUser }>("/auth/login", request);
      return data.user;
    },
    onSuccess: (user) => {
      useSessionStore.getState().setUser(user);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

/** The signed-in user's profile (name and so on), from the user service. */
export function useSessionCurrentUser() {
  const userId = useSessionStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: ["currentUser", userId],
    queryFn: () => getUser(userId!),
    enabled: Boolean(userId),
  });
}

/**
 * Ends the session on the server (which revokes the refresh token and clears the cookies) and
 * drops everything cached for it. `onLoggedOut` is for what only the calling app knows needs
 * clearing too (the shop empties its cart there). The local state is cleared even if the server
 * could not be reached, so the person is never left looking signed in after choosing to leave.
 */
export function useSessionLogout(options: { onLoggedOut?: () => void } = {}) {
  const queryClient = useQueryClient();

  return async () => {
    try {
      await sessionClient.post("/auth/logout");
    } catch {
      // the server clears the cookies on its next answer; the page forgets now regardless
    } finally {
      useSessionStore.getState().setUser(null);
      options.onLoggedOut?.();
      queryClient.clear();
    }
  };
}
