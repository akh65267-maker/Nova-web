"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchX } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/features/catalog/use-products";
import { ProductCard } from "@/features/catalog/product-card";
import { ProductFilters, MAX_PRICE, type FilterState } from "@/features/catalog/product-filters";
import type { ProductListParams } from "@/features/catalog/api";

const PAGE_SIZE = 12;

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  name: "Name",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: FilterState = {
    category: searchParams.get("category"),
    minPrice: Number(searchParams.get("minPrice") ?? 0),
    maxPrice: Number(searchParams.get("maxPrice") ?? MAX_PRICE),
    search: searchParams.get("search") ?? "",
  };
  const sort = (searchParams.get("sort") ?? "newest") as ProductListParams["sort"];
  const page = Number(searchParams.get("page") ?? 1);

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

  const { data, isLoading, isFetching, isError, error, refetch } = useProducts({
    category: filters.category ?? undefined,
    minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
    maxPrice: filters.maxPrice < MAX_PRICE ? filters.maxPrice : undefined,
    search: filters.search || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <ProductFilters
            filters={filters}
            onChange={(next) => {
              updateParams({
                category: next.category !== undefined ? next.category : filters.category,
                minPrice: next.minPrice !== undefined ? next.minPrice : filters.minPrice,
                maxPrice: next.maxPrice !== undefined ? next.maxPrice : filters.maxPrice,
                search: next.search !== undefined ? next.search : filters.search,
              });
            }}
          />
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            {data ? (
              <p className="text-sm text-muted-foreground">
                {data.totalCount} {data.totalCount === 1 ? "product" : "products"}
                {filters.search && ` for "${filters.search}"`}
              </p>
            ) : (
              <Skeleton className="h-5 w-24" />
            )}

            <Select value={sort} onValueChange={(value) => updateParams({ sort: value as string })}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by">{(value) => SORT_LABELS[value as string]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : isError && !data ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load products" />
          ) : data && data.items.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-4 transition-opacity duration-200 sm:grid-cols-3 lg:grid-cols-4"
              style={{ opacity: isFetching ? 0.6 : 1 }}
            >
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
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
