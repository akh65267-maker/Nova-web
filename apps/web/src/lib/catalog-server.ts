import type { CategoryDto, ProductListParams, ProductListResult } from "@taskmanager/api/catalog-api";
import { demoMode, gatewayUrl } from "@/lib/session-server";
import { demoCategories, listDemoProducts } from "@/lib/demo-data";

/** The public product list, read from the gateway on the server. Null when it cannot be read (the browser then asks for itself). */
export async function fetchProducts(params: ProductListParams): Promise<ProductListResult | null> {
  if (demoMode) return listDemoProducts(params);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  try {
    const response = await fetch(`${gatewayUrl}/products?${query}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    return response.ok ? ((await response.json()) as ProductListResult) : null;
  } catch {
    return null;
  }
}

/** The category list for the home page, read on the server and kept for a minute. Null when it cannot be read. */
export async function fetchCategories(): Promise<CategoryDto[] | null> {
  if (demoMode) return demoCategories();
  try {
    const response = await fetch(`${gatewayUrl}/categories`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) });
    return response.ok ? ((await response.json()) as CategoryDto[]) : null;
  } catch {
    return null;
  }
}
