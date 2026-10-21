"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardFooter } from "@taskmanager/ui/components/card";
import { Button } from "@taskmanager/ui/components/button";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { useInventory } from "@taskmanager/api/use-inventory";
import { StarRating } from "@/features/reviews/star-rating";
import { ProductPicture } from "./product-picture";

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
    <Card className="group flex h-full flex-col gap-0 overflow-hidden py-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={`/products/${product.id}`} tabIndex={-1} aria-hidden>
        <div className="relative aspect-square overflow-hidden">
          <ProductPicture
            product={product}
            alt=""
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {product.brand ? `${product.brand} · ${product.category}` : product.category}
        </p>
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 font-medium leading-snug transition-colors hover:text-primary"
        >
          {product.name}
        </Link>
        {product.ratingAverage !== null && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StarRating value={product.ratingAverage} className="[&_svg]:size-3.5" />
            {product.ratingAverage.toFixed(1)} ({product.ratingCount})
          </span>
        )}
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <p className="mt-auto pt-2 text-lg font-semibold tabular-nums">
          ${product.price.toFixed(2)}
        </p>
      </CardContent>
      <CardFooter className="border-t-0 bg-transparent px-4 pt-0 pb-4">
        <Button
          className="w-full"
          variant={added ? "secondary" : "default"}
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
      </CardFooter>
    </Card>
  );
}
