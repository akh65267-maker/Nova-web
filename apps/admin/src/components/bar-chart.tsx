import { cn } from "@taskmanager/ui/lib/utils";

// A small stacked bar chart drawn by hand in SVG: one bar per day, no charting library. It
// covers what the dashboard needs (a daily series, optionally split into parts) and nothing
// more; reach for a library only if the charts need interaction this cannot give.

export type BarSeries = {
  key: string;
  label: string;
  /** A Tailwind text colour class; the bar is drawn in currentColor. */
  colorClass: string;
};

export type BarDatum = {
  label: string;
  values: Record<string, number>;
};

const WIDTH = 600;
const HEIGHT = 180;
const LEFT = 50;
const BOTTOM = 24;
const TOP = 8;

// The next "round" number at or above the maximum, so the gridlines read cleanly.
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function BarChart({
  data,
  series,
  format,
  ariaLabel,
  className,
}: {
  data: BarDatum[];
  series: BarSeries[];
  format: (value: number) => string;
  ariaLabel: string;
  className?: string;
}) {
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0));
  const top = niceMax(Math.max(0, ...totals));
  const plotWidth = WIDTH - LEFT;
  const plotHeight = HEIGHT - BOTTOM - TOP;
  const slot = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.max(1, slot * 0.7);
  const y = (value: number) => TOP + plotHeight - (value / top) * plotHeight;
  const labelAt = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  return (
    <div className={cn("space-y-2", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full text-muted-foreground"
      >
        {[0, 0.5, 1].map((fraction) => {
          const value = top * fraction;
          return (
            <g key={fraction}>
              <line
                x1={LEFT}
                x2={WIDTH}
                y1={y(value)}
                y2={y(value)}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeDasharray={fraction === 0 ? undefined : "3 3"}
              />
              <text x={LEFT - 6} y={y(value) + 3} textAnchor="end" fontSize={12} fill="currentColor">
                {format(value)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          let stacked = 0;
          const x = LEFT + i * slot + (slot - barWidth) / 2;
          return (
            <g key={d.label}>
              <title>
                {d.label}: {series.map((s) => `${s.label} ${format(d.values[s.key] ?? 0)}`).join(", ")}
              </title>
              {series.map((s) => {
                const value = d.values[s.key] ?? 0;
                if (value <= 0) return null;
                const barTop = y(stacked + value);
                const barHeight = y(stacked) - barTop;
                stacked += value;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={barTop}
                    width={barWidth}
                    height={barHeight}
                    rx={barWidth > 4 ? 1.5 : 0}
                    className={s.colorClass}
                    fill="currentColor"
                  />
                );
              })}
              {labelAt.has(i) && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 7}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  fontSize={12}
                  fill="currentColor"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={cn("inline-block size-2.5 rounded-sm bg-current", s.colorClass)} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
