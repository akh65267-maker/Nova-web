"use client";

import { useRelatedProducts } from "@taskmanager/api/use-products";
import { ProductCard } from "./product-card";

/** "You may like": products of the same brand or category. Shown only when there are any. */
export function RelatedProducts({ productId }: { productId: string }) {
  const { data: related = [] } = useRelatedProducts(productId);

  if (related.length === 0) return null;

  return (
    <section className="mt-20" aria-labelledby="you-may-like">
      <h2 id="you-may-like" className="mb-6 text-2xl font-semibold tracking-tight">
        You may like
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
