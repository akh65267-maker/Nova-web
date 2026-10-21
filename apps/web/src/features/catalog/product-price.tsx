import { cn } from "@/lib/utils";
import { Badge } from "@taskmanager/ui/components/badge";
import type { ProductDto } from "@taskmanager/api/catalog-api";

/** The price a customer pays; on sale, with the list price struck through and the percent off. */
export function ProductPrice({ product, className }: { product: ProductDto; className?: string }) {
  const onSale = product.discountPercent !== null;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold tabular-nums", className)}>
      <span>${product.price.toFixed(2)}</span>
      {onSale && (
        <>
          <span className="text-[0.7em] font-normal text-muted-foreground line-through">
            <span className="sr-only">Was </span>${product.listPrice.toFixed(2)}
          </span>
          <Badge variant="destructive">-{product.discountPercent}%</Badge>
        </>
      )}
    </p>
  );
}
