import { cn } from "@taskmanager/ui/lib/utils";

const WIDTH = 120;
const HEIGHT = 36;
const PAD = 3;

/** A tiny trend line with a soft fill, drawn in currentColor. Decorative: the figure beside it says the same. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = (WIDTH - PAD * 2) / (values.length - 1);
  const points = values.map((v, i) => [PAD + i * step, PAD + (HEIGHT - PAD * 2) * (1 - (v - min) / span)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${HEIGHT} L${PAD} ${HEIGHT} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={cn("h-9 w-full", className)} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="currentColor" fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
