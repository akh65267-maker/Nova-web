import type { CSSProperties } from "react";
import Link from "next/link";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { fetchCategories, fetchProducts } from "@/lib/catalog-server";
import { FeaturedHero } from "@/features/catalog/featured-hero";
import { PromoTiles } from "@/features/catalog/promo-tiles";
import { ProductIllustration } from "@/features/catalog/product-illustration";
import { BestOffers, NewArrivals, TopSelling } from "@/features/catalog/product-row";

export default async function Home() {
  const [categoryList, offers, newest] = await Promise.all([
    fetchCategories(),
    fetchProducts({ sort: "best-offer", onSale: true, pageSize: 12 }),
    fetchProducts({ sort: "newest", pageSize: 12 }),
  ]);
  const categories = categoryList ?? [];
  // The stage needs a picture: the deepest offer that has one, else the newest that has one.
  const featured = [...(offers?.items ?? []), ...(newest?.items ?? [])].find((product) => product.imageUrl) ?? null;
  // The tiles prefer a pictured product other than the one on stage.
  const pictured = (items: ProductDto[] = []): ProductDto | null => items.find((product) => product.imageUrl && product.id !== featured?.id) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <FeaturedHero product={featured} />

      <PromoTiles offer={pictured(offers?.items)} />

      <NewArrivals />
      <TopSelling />

      {/* ── Category band: full width, on its own surface ── */}
      {categories.length > 0 && (
        <section className="reveal mt-20 bg-muted/60 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight sm:text-4xl">Shop by category</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categories.map(({ id, name: category, productCount }, i) => (
                <Link
                  key={id}
                  href={{ pathname: "/products", query: { category } }}
                  style={{ "--i": i } as CSSProperties}
                  className="reveal-item group flex flex-col overflow-hidden rounded-3xl bg-card"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <ProductIllustration category={category} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 p-4">
                    <span className="font-medium">{category}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{productCount} items</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <BestOffers />
      <div className="h-20" />
    </div>
  );
}
