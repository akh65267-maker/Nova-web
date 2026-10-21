import { QueryClient } from "@tanstack/react-query";

// Singleton so the Axios 401 interceptor can clear the cache without
// going through a React hook. Safe for this app because all data
// fetching is client-side only (no SSR hydration).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stock, prices and orders change behind the page: refetch on focus once 10s old, and poll a visible tab every 30s.
      staleTime: 10 * 1000,
      refetchInterval: 30 * 1000,
      retry: 1,
    },
  },
});
