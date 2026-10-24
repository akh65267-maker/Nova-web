import { Cpu, UtensilsCrossed, Shirt, Dumbbell, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Config = { Icon: LucideIcon; glow: string };

// Full class strings so Tailwind v4 detects them statically. Each category keeps only a faint glow of
// its colour, so a grid of unpictured products reads as one calm surface rather than a row of swatches.
const CATEGORY_CONFIG: Record<string, Config> = {
  "Electronics": { Icon: Cpu, glow: "from-blue-200/40 dark:from-blue-500/10" },
  "Home & Kitchen": { Icon: UtensilsCrossed, glow: "from-amber-200/40 dark:from-amber-500/10" },
  "Fashion": { Icon: Shirt, glow: "from-pink-200/40 dark:from-pink-500/10" },
  "Sports & Outdoors": { Icon: Dumbbell, glow: "from-emerald-200/40 dark:from-emerald-500/10" },
};

const FALLBACK: Config = { Icon: Package, glow: "from-foreground/5" };

/**
 * Neutral placeholder for a product without a picture: a soft grey tile, a faint glow of the
 * category's colour from the top, and a thin outline icon.
 * Swap this out with <RivePlayer> when .riv files are available:
 *
 *   <RivePlayer
 *     src={`/animations/${category.toLowerCase().replace(/ /g, "-")}.riv`}
 *     fallback={<ProductIllustration category={category} className={className} />}
 *     className={className}
 *   />
 */
export function ProductIllustration({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const { Icon, glow } = CATEGORY_CONFIG[category] ?? FALLBACK;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-muted", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-b to-transparent to-70%", glow)} aria-hidden />
      <Icon className="relative size-14 text-foreground/15" strokeWidth={1} aria-hidden />
    </div>
  );
}
