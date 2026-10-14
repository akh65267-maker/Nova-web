import { Cpu, UtensilsCrossed, Shirt, Dumbbell, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Config = { Icon: LucideIcon; bg: string; iconClass: string; dotClass: string };

// Full class strings so Tailwind v4 detects them statically.
const CATEGORY_CONFIG: Record<string, Config> = {
  "Electronics": {
    Icon: Cpu,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    iconClass: "text-blue-300 dark:text-blue-700",
    dotClass: "bg-blue-200/60 dark:bg-blue-800/40",
  },
  "Home & Kitchen": {
    Icon: UtensilsCrossed,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    iconClass: "text-amber-300 dark:text-amber-700",
    dotClass: "bg-amber-200/60 dark:bg-amber-800/40",
  },
  "Fashion": {
    Icon: Shirt,
    bg: "bg-pink-50 dark:bg-pink-950/40",
    iconClass: "text-pink-300 dark:text-pink-700",
    dotClass: "bg-pink-200/60 dark:bg-pink-800/40",
  },
  "Sports & Outdoors": {
    Icon: Dumbbell,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconClass: "text-emerald-300 dark:text-emerald-700",
    dotClass: "bg-emerald-200/60 dark:bg-emerald-800/40",
  },
};

const FALLBACK: Config = {
  Icon: Package,
  bg: "bg-muted",
  iconClass: "text-muted-foreground/30",
  dotClass: "bg-muted-foreground/10",
};

/**
 * Category-colored placeholder for product images.
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
  const { Icon, bg, iconClass, dotClass } = CATEGORY_CONFIG[category] ?? FALLBACK;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", bg, className)}>
      {/* Decorative corner dots */}
      <span className={cn("absolute left-3 top-3 h-2 w-2 rounded-full", dotClass)} aria-hidden />
      <span className={cn("absolute bottom-3 right-3 h-1.5 w-1.5 rounded-full opacity-70", dotClass)} aria-hidden />
      <span className={cn("absolute right-5 top-4 h-1 w-1 rounded-full opacity-40", dotClass)} aria-hidden />
      <Icon className={cn("h-16 w-16", iconClass)} strokeWidth={1} aria-hidden />
    </div>
  );
}
