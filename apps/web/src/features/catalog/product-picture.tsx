import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { ProductIllustration } from "./product-illustration";

/**
 * A product's picture, or the category illustration while it has none. `alt` is empty where the
 * product's name is already written beside it.
 */
export function ProductPicture({
  product,
  alt,
  sizes,
  className,
  priority,
}: {
  product: Pick<ProductDto, "name" | "category" | "imageUrl">;
  alt?: string;
  sizes: string;
  className?: string;
  /** Load at once (and not lazily): for pictures that can be the largest paint of the page. */
  priority?: boolean;
}) {
  if (!product.imageUrl) return <ProductIllustration category={product.category} className={cn("h-full w-full", className)} />;

  // unoptimized: the picture is served as uploaded, with its own caching; the image optimizer
  // would need to be told which sources it may fetch.
  return <Image src={product.imageUrl} alt={alt ?? product.name} fill sizes={sizes} priority={priority} fetchPriority={priority ? "high" : undefined} unoptimized className={cn("object-cover", className)} />;
}
