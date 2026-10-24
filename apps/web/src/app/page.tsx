import type { CSSProperties } from "react";
import Link from "next/link";
import { Card, CardContent } from "@taskmanager/ui/components/card";
import { fetchCategories, fetchProducts } from "@/lib/catalog-server";
import { FeaturedHero } from "@/features/catalog/featured-hero";
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

  return (
    <div className="flex flex-1 flex-col">
      <FeaturedHero product={featured} />

      <NewArrivals />
      <TopSelling />
      <BestOffers />

      {/* ── Category grid ────────────────────────────── */}
      {categories.length > 0 && (
        <section className="reveal mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">
            Shop by category
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map(({ id, name: category }, i) => (
              <Link
                key={id}
                href={{ pathname: "/products", query: { category } }}
                style={{ "--i": i } as CSSProperties}
                className="reveal-item"
              >
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
      )}
    </div>
  );
}
