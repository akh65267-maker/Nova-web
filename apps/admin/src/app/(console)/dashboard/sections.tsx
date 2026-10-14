"use client";

import { useMemo } from "react";
import { Ban, CheckCircle2, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@taskmanager/ui/components/card";
import { EmptyState } from "@taskmanager/ui/components/empty-state";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@taskmanager/ui/components/table";
import { useCancellations, usePendingOrders, useTimeseries } from "@taskmanager/api/use-analytics";
import { useInventoryList } from "@taskmanager/api/use-inventory";
import { useProducts } from "@taskmanager/api/use-products";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { BarChart } from "@/components/bar-chart";

const LOW_STOCK_AT = 10;

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PanelSkeleton({ height = "h-40" }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} aria-hidden />;
}

const shortDay = (iso: string) => iso.slice(5); // MM-DD

export function DailyCharts({ from, to }: { from: string; to: string }) {
  const series = useTimeseries(from, to);

  if (series.isError) {
    return (
      <Panel title="Orders and revenue per day">
        <ErrorState
          description={getApiErrorMessage(series.error)}
          onRetry={() => series.refetch()}
          title="We couldn't load the daily figures"
        />
      </Panel>
    );
  }

  const days = series.data?.days;
  const totalOrders = days?.reduce((sum, d) => sum + d.orders, 0) ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Orders per day" description="By outcome, UTC days">
        {!days ? (
          <PanelSkeleton />
        ) : totalOrders === 0 ? (
          <EmptyState icon={PackageCheck} title="No orders in this period" className="py-10" />
        ) : (
          <BarChart
            ariaLabel={`Orders per day, ${totalOrders} in total`}
            format={(v) => String(Math.round(v))}
            data={days.map((d) => ({
              label: shortDay(d.day),
              values: { confirmed: d.confirmed, cancelled: d.cancelled, pending: d.pending },
            }))}
            series={[
              { key: "confirmed", label: "Confirmed", colorClass: "text-emerald-500" },
              { key: "cancelled", label: "Cancelled", colorClass: "text-destructive" },
              { key: "pending", label: "Pending", colorClass: "text-amber-500" },
            ]}
          />
        )}
      </Panel>
      <Panel title="Revenue per day" description="Confirmed orders, UTC days">
        {!days ? (
          <PanelSkeleton />
        ) : totalOrders === 0 ? (
          <EmptyState icon={PackageCheck} title="No revenue in this period" className="py-10" />
        ) : (
          <BarChart
            ariaLabel="Revenue per day"
            format={(v) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.round(v)}`}
            data={days.map((d) => ({ label: shortDay(d.day), values: { revenue: d.revenue } }))}
            series={[{ key: "revenue", label: "Revenue", colorClass: "text-primary" }]}
          />
        )}
      </Panel>
    </div>
  );
}

export function CancellationReasons({ from, to }: { from: string; to: string }) {
  const reasons = useCancellations(from, to);
  const max = Math.max(1, ...(reasons.data?.map((r) => r.count) ?? [0]));

  return (
    <Panel title="Why orders were cancelled" description="Cancelled orders in the period, by reason">
      {reasons.isPending && <PanelSkeleton height="h-24" />}
      {reasons.isError && (
        <ErrorState
          description={getApiErrorMessage(reasons.error)}
          onRetry={() => reasons.refetch()}
          title="We couldn't load the reasons"
        />
      )}
      {reasons.data && reasons.data.length === 0 && (
        <EmptyState icon={CheckCircle2} title="No cancellations" className="py-10" />
      )}
      {reasons.data && reasons.data.length > 0 && (
        <ul className="space-y-3">
          {reasons.data.map((r) => (
            <li key={r.reason} className="space-y-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate">{r.reason}</span>
                <span className="tabular-nums text-muted-foreground">{r.count.toLocaleString("en-US")}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-destructive" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function age(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
}

export function StuckOrders() {
  const pending = usePendingOrders();

  return (
    <Panel title="Stuck in Pending" description="Orders waiting more than two minutes for an outcome. Refreshes by itself.">
      {pending.isPending && <PanelSkeleton height="h-24" />}
      {pending.isError && (
        <ErrorState
          description={getApiErrorMessage(pending.error)}
          onRetry={() => pending.refetch()}
          title="We couldn't load the list"
        />
      )}
      {pending.data && pending.data.length === 0 && (
        <EmptyState icon={CheckCircle2} title="Nothing is stuck" description="Every order has an outcome." className="py-10" />
      )}
      {pending.data && pending.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.data.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs" title={`Order ${o.id}, user ${o.userId}`}>
                  {o.id.slice(0, 8)}
                </TableCell>
                <TableCell>{age(o.ageSeconds)}</TableCell>
                <TableCell className="text-right tabular-nums">${o.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

export function LowStock() {
  const inventory = useInventoryList();
  const products = useProducts({ pageSize: 100 });

  const low = useMemo(() => {
    if (!inventory.data) return undefined;
    const names = new Map(products.data?.items.map((p) => [p.id, p.name]) ?? []);
    return inventory.data
      .filter((i) => i.quantityAvailable <= LOW_STOCK_AT && names.has(i.productId))
      .map((i) => ({ ...i, name: names.get(i.productId)! }))
      .sort((a, b) => a.quantityAvailable - b.quantityAvailable)
      .slice(0, 8);
  }, [inventory.data, products.data]);

  const failed = inventory.isError || products.isError;

  return (
    <Panel title="Low stock" description={`Products with ${LOW_STOCK_AT} or fewer units left`}>
      {!failed && (inventory.isPending || products.isPending) && <PanelSkeleton height="h-24" />}
      {failed && (
        <ErrorState
          description={getApiErrorMessage(inventory.error ?? products.error)}
          onRetry={() => {
            inventory.refetch();
            products.refetch();
          }}
          title="We couldn't load the stock"
        />
      )}
      {low && low.length === 0 && <EmptyState icon={Ban} title="Nothing is running low" className="py-10" />}
      {low && low.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {low.map((i) => (
              <TableRow key={i.productId}>
                <TableCell className="max-w-48 truncate">{i.name}</TableCell>
                <TableCell className="text-right tabular-nums">{i.quantityAvailable}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
