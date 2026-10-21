import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { readListState } from "@/features/catalog/list-params";
import { ProductsView } from "@/features/catalog/products-view";
import { fetchProducts } from "@/lib/catalog-server";

// Rendered per request so the first page of products is in the HTML: the browser can start loading
// the pictures at once instead of after the scripts have run and asked for the list.
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const { params } = readListState((name) => {
    const value = query[name];
    return Array.isArray(value) ? value[0] : value;
  });

  const queryClient = new QueryClient();
  const products = await fetchProducts(params);
  if (products) queryClient.setQueryData(["products", params], products);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsView />
    </HydrationBoundary>
  );
}
