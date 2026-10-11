"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, PackageSearch, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/features/catalog/use-products";
import { useInventory } from "@/features/inventory/use-inventory";
import { MAX_PER_ORDER, useCartStore } from "@/store/cart-store";
import { ProductIllustration } from "@/features/catalog/product-illustration";
import { cn } from "@/lib/utils";

const LOW_STOCK = 5;

export default function ProductDetailPage(props: PageProps<"/products/[id]">) {
  const { id } = use(props.params);
  const { data: product, isLoading, isError } = useProduct(id);
  const { data: inventory, isLoading: isInventoryLoading } = useInventory(id);
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-48" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <EmptyState
        className="py-24"
        icon={PackageSearch}
        title="Product not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/products">Browse products</Link>}
          />
        }
      />
    );
  }

  const available = inventory?.quantityAvailable ?? 0;
  const inStock = available > 0;
  const canAddToCart = !isInventoryLoading && inStock;
  const maxQuantity = Math.min(available, MAX_PER_ORDER);
  const lowStock = inStock && available <= LOW_STOCK;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div className="aspect-square overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <ProductIllustration category={product.category} className="h-full w-full" />
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href={{ pathname: "/products", query: { category: product.category } }}
            className="w-fit text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            {product.category}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-balance">{product.name}</h1>
          <p className="text-3xl font-semibold tabular-nums">${product.price.toFixed(2)}</p>
          <p className="leading-relaxed text-muted-foreground">{product.description}</p>

          {isInventoryLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <p
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                !inStock && "text-destructive",
                lowStock && "text-warning-foreground dark:text-warning",
                inStock && !lowStock && "text-success",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  !inStock && "bg-destructive",
                  lowStock && "bg-warning",
                  inStock && !lowStock && "bg-success",
                )}
              />
              {!inStock ? "Currently unavailable" : lowStock ? `Only ${available} left` : "In stock"}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {canAddToCart && (
              <div className="flex items-center rounded-lg border" role="group" aria-label="Quantity">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                  {Math.min(quantity, maxQuantity)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Increase quantity"
                  disabled={quantity >= maxQuantity}
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            )}

            <Button
              size="lg"
              variant={added ? "secondary" : "default"}
              disabled={!canAddToCart}
              onClick={() => {
                const count = Math.min(quantity, maxQuantity);
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  quantity: count,
                });
                setAdded(true);
                toast.success(
                  count > 1
                    ? `${count} × ${product.name} added to cart`
                    : `${product.name} added to cart`,
                );
              }}
            >
              {added ? (
                <>
                  <Check className="size-4" /> Added
                </>
              ) : canAddToCart ? (
                "Add to cart"
              ) : (
                "Out of stock"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
