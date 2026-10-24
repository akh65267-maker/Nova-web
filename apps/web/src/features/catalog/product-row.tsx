"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { useProducts, useTopSelling } from "@taskmanager/api/use-products";
import { ProductCard } from "./product-card";

const ITEM = "w-56 shrink-0 snap-start sm:w-60";

export function NewArrivals() {
  const { data, isLoading } = useProducts({ sort: "newest", page: 1, pageSize: 8 });

  return <ProductStrip title="New arrivals" href="/products?sort=newest" products={data?.items} isLoading={isLoading} />;
}

export function TopSelling() {
  const { data, isLoading } = useTopSelling();

  return <ProductStrip title="Top selling" products={data} isLoading={isLoading} />;
}

export function BestOffers() {
  const { data, isLoading } = useProducts({ onSale: true, sort: "best-offer", page: 1, pageSize: 8 });

  return <ProductStrip title="Best offers" href="/products?onSale=true&sort=best-offer" products={data?.items} isLoading={isLoading} />;
}

// A horizontally scrolling strip of products. It is decoration on the home page, so a failure
// or no products renders nothing rather than an error in the middle of it.
function ProductStrip({ title, href, products, isLoading }: { title: string; href?: string; products?: ProductDto[]; isLoading: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);

  if (!isLoading && (!products || products.length === 0)) return null;

  function scrollBy(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    // Respect reduced motion: jump instead of gliding.
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: smooth ? "smooth" : "auto" });
  }

  return (
    <section className="reveal mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        <div className="flex items-center gap-2">
          {href && (
            <Link href={href} className="mr-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              View all
            </Link>
          )}
          <Button variant="outline" size="icon" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Scroll right" onClick={() => scrollBy(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scroller}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] motion-reduce:scroll-auto scroll-pl-4 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:-mx-8 lg:scroll-pl-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${ITEM} flex flex-col`}>
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-[14.3rem] w-full" />
              </div>
            ))
          : products?.map((product, index) => (
              <div key={product.id} className={ITEM}>
                <ProductCard product={product} priority={index < 2} />
              </div>
            ))}
      </div>
    </section>
  );
}
