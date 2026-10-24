"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { ProductPicture } from "./product-picture";

/** The main picture and, when the product has more, a row of thumbnails that swap it. */
export function ProductGallery({ product }: { product: ProductDto }) {
  const pictures = [product.imageUrl, ...product.gallery].filter((url): url is string => Boolean(url));
  const [selected, setSelected] = useState(0);
  const current = pictures[Math.min(selected, pictures.length - 1)] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("relative aspect-square overflow-hidden rounded-3xl bg-muted", current && "dark:bg-white")}>
        {/* Shop photos sit on white: multiply melts that into the soft tile. */}
        <ProductPicture
          product={{ ...product, imageUrl: current }}
          sizes="(min-width: 768px) 55vw, 100vw"
          priority
          className={current ? "object-contain p-10 mix-blend-multiply dark:mix-blend-normal" : undefined}
        />
      </div>
      {pictures.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pictures of this product">
          {pictures.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`Show picture ${index + 1} of ${pictures.length}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 dark:bg-white ring-transparent focus-visible:ring-2 focus-visible:ring-ring",
                index === selected && "ring-2 ring-primary",
              )}
            >
              <Image src={url} alt="" fill sizes="64px" unoptimized className="object-contain p-1.5 mix-blend-multiply dark:mix-blend-normal" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
