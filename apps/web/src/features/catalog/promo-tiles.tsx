import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { cn } from "@/lib/utils";
import { ProductPicture } from "./product-picture";

type Tile = {
  eyebrow: string;
  title: string;
  /** One line under the title. */
  text?: string;
  href: string;
  cta: string;
  product: ProductDto | null;
  /** The tile's wash: a faint tint of a brand colour. */
  tint: string;
};

/**
 * Two large side-by-side tiles under the hero, Apple-store style: a headline, one link, and a product
 * picture when one is to hand. Without a picture the tile stands on its headline and wash alone.
 */
export function PromoTiles({ offer }: { offer: ProductDto | null }) {
  const tiles: Tile[] = [
    { eyebrow: "Limited time", title: "Best offers", href: "/products?onSale=true&sort=best-offer", cta: "See the offers", product: offer, tint: "from-primary/15" },
    {
      eyebrow: "On every order",
      title: "Free delivery and returns",
      text: "Free shipping on orders over $50, and free returns.",
      href: "/products",
      cta: "Start shopping",
      product: null,
      tint: "from-chart-2/15",
    },
  ];

  return (
    <section className="reveal mx-auto grid w-full max-w-7xl gap-4 px-4 pt-4 sm:px-6 md:grid-cols-2 lg:px-8">
      {tiles.map((tile) => (
        <Link
          key={tile.title}
          href={tile.href}
          className={cn(
            "group relative flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-b to-muted px-6 text-center",
            "min-h-56 justify-center py-12",
            tile.tint,
          )}
        >
          <p className="text-sm font-medium text-muted-foreground">{tile.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{tile.title}</h2>
          {tile.text && <p className="mt-2 max-w-sm text-muted-foreground">{tile.text}</p>}
          <span className="mt-3 inline-flex items-center text-base font-medium text-primary underline-offset-4 group-hover:underline">
            {tile.cta}
            <ChevronRight className="size-4" aria-hidden />
          </span>
          {tile.product?.imageUrl && (
            <div className="relative mt-8 aspect-[4/3] w-full max-w-sm overflow-hidden mix-blend-multiply dark:rounded-2xl dark:bg-white dark:mix-blend-normal">
              <ProductPicture
                product={tile.product}
                alt=""
                sizes="(min-width: 768px) 24rem, 80vw"
                className="object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}
        </Link>
      ))}
    </section>
  );
}
