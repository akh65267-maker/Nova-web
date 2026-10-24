"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { useInventory } from "@taskmanager/api/use-inventory";
import { cn } from "@/lib/utils";
import { ProductPicture } from "./product-picture";
import { ProductPrice } from "./product-price";

export function ProductCard({ product, priority }: { product: ProductDto; priority?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  // The same lookup (and cache entry) as the product page: a product with no stock, or none on record, cannot be added.
  const { data: inventory, isLoading: isInventoryLoading } = useInventory(product.id);
  const inStock = inventory !== null && inventory !== undefined && inventory.availability !== "OutOfStock";
  // Confirms the click on the button itself, so it does not rely on the toast alone.
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    // Image first and quiet: no border, the photo on a soft tile, name and price underneath. Where the pointer
    // can hover, Add to cart appears on hover or focus; on touch it is always there. "group" marks the card
    // (the e2e tests find it by that class).
    <div className="group flex h-full flex-col gap-3">
      <Link href={`/products/${product.id}`} tabIndex={-1} aria-hidden className={cn("relative block aspect-square overflow-hidden rounded-2xl bg-muted", product.imageUrl && "dark:bg-white")}>
        <ProductPicture
          product={product}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          // Shop photos sit on white: multiply melts that into the tile; in dark mode the tile itself turns white.
          className={product.imageUrl ? "object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-105 dark:mix-blend-normal" : undefined}
        />
        {product.discountPercent !== null && (
          <span className="absolute top-3 left-3 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-destructive backdrop-blur">Sale</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 px-1">
        <p className="text-xs text-muted-foreground">{product.brand ?? product.category}</p>
        <Link href={`/products/${product.id}`} className="line-clamp-2 font-medium leading-snug underline-offset-4 hover:underline">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <ProductPrice product={product} className="text-base [&_[data-slot=badge]]:hidden" />
          {typeof product.ratingAverage === "number" && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <Star className="size-3 fill-current" aria-hidden />
              {product.ratingAverage.toFixed(1)}
              <span className="sr-only"> out of 5, {product.ratingCount} reviews</span>
            </span>
          )}
        </div>
      </div>

      <Button
        size="sm"
        className={cn(
          "mx-1 rounded-full transition-opacity duration-200",
          inStock && !added && "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
        )}
        variant={added || (!isInventoryLoading && !inStock) ? "secondary" : "default"}
        disabled={isInventoryLoading || !inStock}
        onClick={() => {
          addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          });
          setAdded(true);
          toast.success(`${product.name} added to cart`);
        }}
      >
        {added ? (
          <>
            <Check className="size-4" /> Added
          </>
        ) : !isInventoryLoading && !inStock ? (
          "Out of stock"
        ) : (
          "Add to cart"
        )}
      </Button>
    </div>
  );
}
