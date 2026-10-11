"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "./use-products";
import { ProductCard } from "./product-card";

const ITEM = "w-56 shrink-0 snap-start sm:w-60";

// A horizontally scrolling strip of the newest products. It is decoration on the home page,
// so a failure or an empty catalog renders nothing rather than an error in the middle of it.
export function NewArrivals() {
  const scroller = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useProducts({ sort: "newest", page: 1, pageSize: 8 });

  if (!isLoading && (!data || data.items.length === 0)) return null;

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
        <h2 className="text-2xl font-semibold tracking-tight">New arrivals</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/products?sort=newest"
            className="mr-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
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
              <Skeleton key={i} className={`${ITEM} aspect-[3/4]`} />
            ))
          : data?.items.map((product) => (
              <div key={product.id} className={ITEM}>
                <ProductCard product={product} />
              </div>
            ))}
      </div>
    </section>
  );
}
