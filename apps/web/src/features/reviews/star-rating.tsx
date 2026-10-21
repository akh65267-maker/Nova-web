import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five stars, filled to the nearest half-star's worth; the number is in the label for screen readers. */
export function StarRating({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn("size-4", value >= star - 0.25 ? "fill-warning text-warning" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}
