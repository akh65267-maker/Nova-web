"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { Badge } from "@taskmanager/ui/components/badge";
import { Button } from "@taskmanager/ui/components/button";
import { EmptyState } from "@taskmanager/ui/components/empty-state";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@taskmanager/ui/components/table";
import type { OrderStatus } from "@taskmanager/api/orders-api";
import { useAdminOrders } from "@taskmanager/api/use-analytics";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { ORDER_STATUS, STATUSES } from "@/lib/order-status";
import { PERIODS, periodRange } from "@/lib/period";
import { formatPrice } from "@taskmanager/ui/lib/utils";

const PAGE_SIZE = 25;

const when = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 16);

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [days, setDays] = useState<number>(30);
  const [page, setPage] = useState(1);

  const { from, to } = periodRange(days);
  const orders = useAdminOrders({ status, from, to, page, pageSize: PAGE_SIZE });
  const data = orders.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  // Any change to the filters starts again from the first page.
  const changeStatus = (next: OrderStatus | undefined) => {
    setStatus(next);
    setPage(1);
  };
  const changeDays = (next: number) => {
    setDays(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString("en-US")} orders created in the last ${days} days (UTC)` : "Every customer's orders"}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-1" role="group" aria-label="Status">
            <Button size="sm" variant={status === undefined ? "default" : "outline"} aria-pressed={status === undefined} onClick={() => changeStatus(undefined)}>
              All
            </Button>
            {STATUSES.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} aria-pressed={status === s} onClick={() => changeStatus(s)}>
                {ORDER_STATUS[s].label}
              </Button>
            ))}
          </div>
          <div className="flex gap-1" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <Button key={p.days} size="sm" variant={days === p.days ? "default" : "outline"} aria-pressed={days === p.days} onClick={() => changeDays(p.days)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {orders.isPending && (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {orders.isError && (
        <ErrorState
          description={getApiErrorMessage(orders.error)}
          onRetry={() => orders.refetch()}
          title="We couldn't load the orders"
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState icon={ReceiptText} title="No orders match" description="Try another status or a longer period." />
      )}

      {data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created (UTC)</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => {
                const s = ORDER_STATUS[o.status];
                return (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{when(o.createdAtUtc)}</TableCell>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs underline-offset-4 hover:underline">
                        {o.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>
                        <s.icon aria-hidden />
                        {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{o.lineCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(o.total)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground" title={o.userId}>
                      {o.userId.slice(0, 8)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {pages.toLocaleString("en-US")}
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft aria-hidden /> Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
