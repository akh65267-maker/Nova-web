import { configureApi } from "@taskmanager/api/client";
import { useAuthStore } from "@taskmanager/auth/auth-store";
import { queryClient } from "@/lib/query-client";

// How this app talks to the gateway: where it is, which token to send, and what a 401 means here.
configureApi({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    useAuthStore.getState().logout();
    queryClient.clear();
  },
});
