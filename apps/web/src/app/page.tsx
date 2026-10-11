import type { CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from "@/features/catalog/categories";
import { NewArrivals } from "@/features/catalog/product-row";
import { ProductIllustration } from "@/features/catalog/product-illustration";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        {/* Subtle background gradient */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          {/* ── Left: text content ──────────────────── */}
          <div className="hero-scroll-text flex flex-1 flex-col items-start gap-6">
            <span style={{ "--i": 0 } as CSSProperties} className="hero-rise inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Free shipping on orders over $50
            </span>

            <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise max-w-xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Everything you need,{" "}
              <span className="text-foreground/50">delivered fast.</span>
            </h1>

            <p style={{ "--i": 2 } as CSSProperties} className="hero-rise max-w-md text-lg text-muted-foreground">
              Browse across every category with fast checkout and real-time order
              tracking.
            </p>

            <div style={{ "--i": 3 } as CSSProperties} className="hero-rise flex flex-wrap gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/products">Shop now</Link>}
              />
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/products?sort=newest">New arrivals</Link>}
              />
            </div>

            {/* Stats strip */}
            <div style={{ "--i": 4 } as CSSProperties} className="hero-rise flex items-center gap-6 pt-2">
              <div>
                <p className="text-xl font-bold tabular-nums">4</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xl font-bold">Free</p>
                <p className="text-xs text-muted-foreground">Returns</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xl font-bold">24/7</p>
                <p className="text-xs text-muted-foreground">Support</p>
              </div>
            </div>
          </div>

          {/* ── Right: decorative category grid ─────── */}
          <div className="hero-scroll-tiles relative hidden shrink-0 lg:block" aria-hidden>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((category, i) => (
                <div
                  key={category}
                  style={{ "--i": i + 2 } as CSSProperties}
                  className={cn("hero-rise", i === 1 && "mt-5", i === 3 && "-mt-5")}
                >
                  <div
                    style={{ "--i": i } as CSSProperties}
                    className="hero-float h-32 w-32 overflow-hidden rounded-2xl border border-border/50 shadow-sm"
                  >
                    <ProductIllustration category={category} className="h-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <NewArrivals />

      {/* ── Category grid ────────────────────────────── */}
      <section className="reveal mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Link key={category} href={{ pathname: "/products", query: { category } }}>
              <Card className="group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div className="aspect-[4/3] overflow-hidden">
                  <ProductIllustration
                    category={category}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{category}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
