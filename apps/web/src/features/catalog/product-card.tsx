"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import type { ProductDto } from "./api";
import { ProductIllustration } from "./product-illustration";

export function ProductCard({ product }: { product: ProductDto }) {
  const addItem = useCartStore((state) => state.addItem);
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
        <div className="aspect-square overflow-hidden">
          <ProductIllustration
            category={product.category}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {product.category}
        </p>
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 font-medium leading-snug transition-colors hover:text-primary"
        >
          {product.name}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <p className="mt-auto pt-2 text-lg font-semibold tabular-nums">
          ${product.price.toFixed(2)}
        </p>
      </CardContent>
      <CardFooter className="border-t-0 bg-transparent px-4 pt-0 pb-4">
        <Button
          className="w-full"
          variant={added ? "secondary" : "default"}
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
          ) : (
            "Add to cart"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
