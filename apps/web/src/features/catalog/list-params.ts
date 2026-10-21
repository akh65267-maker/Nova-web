import type { ProductListParams } from "@taskmanager/api/catalog-api";

export const MAX_PRICE = 200;
export const PAGE_SIZE = 12;

/**
 * What the products page shows for a URL's query string, and the API request that fills it. The
 * server (to prefetch the first render) and the browser both call this, so they ask for the same
 * query key and the prefetched data is the data the page reads.
 */
export function readListState(get: (name: string) => string | null | undefined) {
  const filters = {
    category: get("category") ?? null,
    minPrice: Number(get("minPrice") ?? 0),
    maxPrice: Number(get("maxPrice") ?? MAX_PRICE),
    search: get("search") ?? "",
  };
  const sort = (get("sort") ?? "newest") as ProductListParams["sort"];
  const page = Number(get("page") ?? 1);
  const params: ProductListParams = {
    category: filters.category ?? undefined,
    minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
    maxPrice: filters.maxPrice < MAX_PRICE ? filters.maxPrice : undefined,
    search: filters.search || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };
  return { filters, sort, page, params };
}
