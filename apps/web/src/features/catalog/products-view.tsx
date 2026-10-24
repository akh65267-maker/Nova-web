"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@taskmanager/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@taskmanager/ui/components/select";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@taskmanager/ui/components/sheet";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { EmptyState } from "@taskmanager/ui/components/empty-state";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { useProducts } from "@taskmanager/api/use-products";
import { ProductCard } from "./product-card";
import { ProductFilters } from "./product-filters";
import { PAGE_SIZE, readListState } from "./list-params";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  name: "Name",
  "best-offer": "Best offers",
};

export function ProductsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { filters, sort, page, params } = readListState((name) => searchParams.get(name));

  function updateParams(next: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "" || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    if (!("page" in next)) {
      params.delete("page");
    }
    router.push(`/products?${params.toString()}`);
  }

  const { data, isLoading, isPlaceholderData, isError, error, refetch } = useProducts(params);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  const filterPanel = (
    <ProductFilters
      filters={filters}
      onChange={(next) => {
        updateParams({
          category: next.category !== undefined ? next.category : filters.category,
          brand: next.brand !== undefined ? next.brand : filters.brand,
          minPrice: next.minPrice !== undefined ? next.minPrice : filters.minPrice,
          maxPrice: next.maxPrice !== undefined ? next.maxPrice : filters.maxPrice,
          onSale: (next.onSale !== undefined ? next.onSale : filters.onSale) ? "true" : null,
          search: next.search !== undefined ? next.search : filters.search,
        });
      }}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        {/* Beside the grid from md up; on phones the same panel opens from the Filters button. */}
        <aside className="hidden md:sticky md:top-20 md:block md:self-start">{filterPanel}</aside>

        {/* min-h: the footer would otherwise jump when the cards replace the skeletons */}
        <div className="min-h-[100svh]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            {data ? (
              <p className="w-full text-sm text-muted-foreground sm:w-auto">
                {data.totalCount} {data.totalCount === 1 ? "product" : "products"}
                {filters.search && ` for "${filters.search}"`}
              </p>
            ) : (
              <Skeleton className="h-5 w-24" />
            )}

            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" className="md:hidden">
                    <SlidersHorizontal className="size-4" /> Filters
                  </Button>
                }
              />
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto px-4 pb-6">{filterPanel}</div>
              </SheetContent>
            </Sheet>

            <Select value={sort} onValueChange={(value) => updateParams({ sort: value as string })}>
              <SelectTrigger className="w-44 sm:w-48">
                <SelectValue placeholder="Sort by">{(value) => SORT_LABELS[value as string]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="best-offer">Best offers</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : isError && !data ? (
            <ErrorState description={getApiErrorMessage(error, "Check your connection and try again.")} onRetry={() => refetch()} title="Couldn't load products" />
          ) : data && data.items.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-4 transition-opacity duration-200 sm:grid-cols-3 lg:grid-cols-4"
              // Dimmed only while the previous filter's results stand in for the new ones. A background refetch
              // must not dim: the server renders it pending, the client settled, and React keeps the server's style.
              style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
            >
              {data.items.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No products found"
              description="Nothing matches your filters. Try widening the price range or clearing them."
              action={
                <Button variant="outline" onClick={() => router.push("/products")}>
                  Clear filters
                </Button>
              }
            />
          )}

          {data && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
