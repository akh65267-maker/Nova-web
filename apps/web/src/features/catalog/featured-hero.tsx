import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { ProductPicture } from "./product-picture";
import { formatPrice } from "@taskmanager/ui/lib/utils";

// The first sentence of the description, as the stage's tagline.
function tagline(description: string) {
  const sentence = description.split(/(?<=[.!?])\s/)[0] ?? "";
  return sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
}

/**
 * The home hero as a product stage: one featured product, named large and centred, with its picture
 * underneath. Without a product (catalog unreachable, nothing pictured) it falls back to the shop's line.
 */
export function FeaturedHero({ product }: { product: ProductDto | null }) {
  return (
    <section className="relative overflow-hidden border-b">
      {/* Slow brand-colour aurora, CSS only (see .hero-aurora in globals.css) */}
      <div className="hero-aurora pointer-events-none absolute inset-0" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <div className="hero-scroll-text flex flex-col items-center gap-4">
          <p style={{ "--i": 0 } as CSSProperties} className="hero-rise text-sm font-medium text-primary">
            {product ? (product.discountPercent !== null ? `Save ${product.discountPercent}% now` : "Featured") : "Free shipping on orders over $50"}
          </p>

          <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise max-w-4xl text-5xl font-semibold tracking-tighter text-balance sm:text-6xl lg:text-7xl">
            {product ? product.name : "Everything you need, delivered fast."}
          </h1>

          <p style={{ "--i": 2 } as CSSProperties} className="hero-rise max-w-xl text-lg text-muted-foreground sm:text-xl">
            {product ? tagline(product.description) : "Browse every category, with fast checkout and real-time order tracking."}
          </p>

          {product && (
            <p style={{ "--i": 2 } as CSSProperties} className="hero-rise text-base tabular-nums">
              {formatPrice(product.price)}
              {product.discountPercent !== null && (
                <span className="ml-2 text-muted-foreground line-through">
                  <span className="sr-only">Was </span>{formatPrice(product.listPrice)}
                </span>
              )}
            </p>
          )}

          <div style={{ "--i": 3 } as CSSProperties} className="hero-rise mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Button size="lg" className="rounded-full px-6" nativeButton={false} render={<Link href={product ? `/products/${product.id}` : "/products"}>{product ? "Buy" : "Shop now"}</Link>} />
            <Link href={product ? `/products/${product.id}` : "/products?sort=newest"} className="group inline-flex items-center text-base font-medium text-primary hover:underline underline-offset-4">
              {product ? "Learn more" : "New arrivals"}
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Shop photos sit on white: multiply melts that into the light page; dark mode shows it on a light grey card. */}
        {product && (
          <div style={{ "--i": 4 } as CSSProperties} className="hero-rise hero-scroll-tiles relative mt-12 aspect-[16/10] w-full max-w-3xl overflow-hidden sm:mt-16 mix-blend-multiply dark:mb-12 dark:rounded-[2rem] dark:bg-zinc-300 dark:mix-blend-normal">
            <ProductPicture product={product} alt="" sizes="(min-width: 768px) 48rem, 100vw" className="object-contain mix-blend-multiply" priority />
          </div>
        )}

        {!product && <div className="h-16 sm:h-24" />}
      </div>
    </section>
  );
}
