import { isServer, QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stock, prices and orders change behind the page: refetch on focus once 10s old, and poll a visible tab every 30s.
        staleTime: 10 * 1000,
        refetchInterval: 30 * 1000,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * A new cache for every server render, one for the life of the browser tab. A cache shared by the
 * whole server process outlived the requests: it kept a product list from an earlier render, and
 * because hydration does not overwrite a query the cache already holds until the page runs in the
 * browser, the server went on rendering that old list. It was also shared by every visitor.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}
