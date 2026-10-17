import { configureApi } from "@taskmanager/api/client";
import { useSessionStore } from "@taskmanager/auth/session-store";
import { queryClient } from "@/lib/query-client";

// How this app talks to the backend: through its own /api/proxy routes, which hold the session
// cookies and add the token, so there is no token here to send. A 401 that gets this far means the
// server could not keep the session alive (the refresh token was refused too), so the page forgets it.
configureApi({
  baseURL: "/api/proxy",
  onUnauthorized: () => {
    useSessionStore.getState().setUser(null);
    queryClient.clear();
  },
});
