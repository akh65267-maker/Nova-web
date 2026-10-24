"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, PackageSearch, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@taskmanager/ui/components/button";
import { EmptyState } from "@taskmanager/ui/components/empty-state";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { useProduct } from "@taskmanager/api/use-products";
import { useInventory } from "@taskmanager/api/use-inventory";
import { MAX_PER_ORDER, useCartStore } from "@/store/cart-store";
import { ProductGallery } from "@/features/catalog/product-gallery";
import { ProductPrice } from "@/features/catalog/product-price";
import { RelatedProducts } from "@/features/catalog/related-products";
import { ProductReviews } from "@/features/reviews/product-reviews";
import { StarRating } from "@/features/reviews/star-rating";
import { cn } from "@/lib/utils";

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

  // The server tells the public a status, and the exact number only when it is 10 or fewer, so
  // the cap is the real number when that is the smaller one and the per-order limit otherwise.
  const inStock = inventory !== null && inventory !== undefined && inventory.availability !== "OutOfStock";
  const canAddToCart = !isInventoryLoading && inStock;
  const maxQuantity = Math.min(inventory?.remaining ?? MAX_PER_ORDER, MAX_PER_ORDER);
  const lowStock = inventory?.availability === "LowStock";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery product={product} />

        <div className="flex flex-col gap-4">
          {product.brand && (
            <Link
              href={{ pathname: "/products", query: { brand: product.brand } }}
              className="w-fit text-sm font-semibold transition-colors hover:text-primary"
            >
              {product.brand}
            </Link>
          )}
          <Link
            href={{ pathname: "/products", query: { category: product.category } }}
            className="w-fit text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            {product.category}
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">{product.name}</h1>
          {typeof product.ratingAverage === "number" && (
            <a href="#reviews" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <StarRating value={product.ratingAverage} />
              {product.ratingAverage.toFixed(1)} ({product.ratingCount})
            </a>
          )}
          <ProductPrice product={product} className="text-3xl" />
          {product.discountEndsAtUtc && (
            <p className="text-sm text-muted-foreground">Offer ends {new Date(product.discountEndsAtUtc).toLocaleDateString()}</p>
          )}
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
              {!inStock ? "Currently unavailable" : lowStock ? `Only ${inventory?.remaining} left` : "In stock"}
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

      {product.attributes.length > 0 && (
        <section className="mt-12" aria-labelledby="specifications">
          <h2 id="specifications" className="mb-4 text-lg font-semibold">
            Specifications
          </h2>
          <dl className="divide-y rounded-xl ring-1 ring-foreground/10">
            {product.attributes.map(({ name, value }) => (
              <div key={name} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="col-span-2">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <ProductReviews productId={product.id} />

      <RelatedProducts productId={product.id} />
    </div>
  );
}
