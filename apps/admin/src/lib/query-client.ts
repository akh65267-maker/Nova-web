import { QueryClient } from "@tanstack/react-query";

// Singleton so the Axios 401 interceptor can clear the cache without
// going through a React hook. Safe for this app because all data
// fetching is client-side only (no SSR hydration).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});
