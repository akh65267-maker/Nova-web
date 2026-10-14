"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@taskmanager/ui/components/card";
import { Button } from "@taskmanager/ui/components/button";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { cn } from "@taskmanager/ui/lib/utils";
import { useOrderSummary } from "@taskmanager/api/use-analytics";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { change, firstDay, lastDay, PERIODS, periodRange } from "@/lib/period";
import { CancellationReasons, DailyCharts, LowStock, StuckOrders } from "./sections";

const number = (n: number) => n.toLocaleString("en-US");
const money = (n: number | null) =>
  n === null ? "None yet" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const percent = (n: number | null) => (n === null ? "None yet" : `${(n * 100).toFixed(1)}%`);

// "Good" depends on the figure: more orders is good, more cancellations is not.
function Change({
  value,
  higherIsBetter = true,
  points = false,
}: {
  value: number | null;
  higherIsBetter?: boolean;
  /** The value is a difference between two rates, shown in percentage points, not a relative change. */
  points?: boolean;
}) {
  if (value === null) return <span className="text-xs text-muted-foreground">No earlier data to compare</span>;
  if (Math.abs(value) < 0.0005) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> No change
      </span>
    );
  }
  const up = value > 0;
  const good = up === higherIsBetter;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      )}
    >
      <Icon className="size-3" />
      {up ? "+" : "−"}
      {Math.abs(value * 100).toFixed(1)}
      {points ? " points" : "%"} vs previous period
    </span>
  );
}

function Kpi({ title, value, note, delta }: { title: string; value: string; note: string; delta: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
        {delta}
      </CardContent>
    </Card>
  );
}

function KpiSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState<number>(7);
  const { from, to } = periodRange(days);
  const summary = useOrderSummary(from, to);
  const data = summary.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Orders created ${firstDay(data.from)} to ${lastDay(data.to)} (UTC)`
              : "Orders by creation date (UTC)"}
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              aria-pressed={days === p.days}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {summary.isPending && <KpiSkeletons />}

      {summary.isError && (
        <ErrorState
          description={getApiErrorMessage(summary.error)}
          onRetry={() => summary.refetch()}
          title="We couldn't load the figures"
        />
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              title="Orders"
              value={number(data.current.orders)}
              note={`${number(data.current.confirmed)} confirmed · ${number(data.current.cancelled)} cancelled · ${number(data.current.pending)} pending`}
              delta={<Change value={change(data.current.orders, data.previous.orders)} />}
            />
            <Kpi
              title="Revenue"
              value={money(data.current.revenue)}
              note="Confirmed orders, at the price charged"
              delta={<Change value={change(data.current.revenue, data.previous.revenue)} />}
            />
            <Kpi
              title="Average order value"
              value={money(data.current.averageOrderValue)}
              note="Revenue per confirmed order"
              delta={<Change value={change(data.current.averageOrderValue, data.previous.averageOrderValue)} />}
            />
            <Kpi
              title="Cancellation rate"
              value={percent(data.current.cancellationRate)}
              note="Of orders that have been decided"
              delta={
                <Change
                  higherIsBetter={false}
                  points
                  value={
                    data.current.cancellationRate === null || data.previous.cancellationRate === null
                      ? null
                      : data.current.cancellationRate - data.previous.cancellationRate
                  }
                />
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Compared with {firstDay(data.previousFrom)} to {lastDay(data.previousTo)}. Revenue excludes tax, shipping
            and refunds, which this system does not have.
          </p>
        </>
      )}

      <DailyCharts from={from} to={to} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CancellationReasons from={from} to={to} />
        <StuckOrders />
      </div>

      <LowStock />
    </div>
  );
}
