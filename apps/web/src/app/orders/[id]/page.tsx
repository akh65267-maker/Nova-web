"use client";

import { use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUS } from "@/features/orders/status";
import { useOrder } from "@/features/orders/use-orders";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/features/auth/use-require-auth";

export default function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  const { id } = use(props.params);
  const { isReady } = useRequireAuth("/login");
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  if (isReady && isError && !order) {
    return <ErrorState className="py-24" error={error} onRetry={() => refetch()} title="Couldn't load this order" />;
  }

  if (!isReady || isLoading || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.Pending;
  const StatusIcon = status.icon;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          {/* Keyed by status so the icon replays its entrance when Pending becomes Confirmed or Cancelled. */}
          <div
            key={order.status}
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full animate-in zoom-in-50 fade-in duration-500 motion-reduce:animate-none",
              status.tone,
              order.status === "Pending" && "motion-safe:animate-pulse",
            )}
          >
            <StatusIcon className="size-6" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle className="text-2xl">{status.title}</CardTitle>
            <Badge variant={status.variant} className="w-fit gap-1">
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>

          {order.status === "Pending" && (
            <p className="text-sm text-muted-foreground">
              We&apos;re reserving your items and confirming this order — this page
              updates automatically.
            </p>
          )}

          {order.status === "Cancelled" && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {order.cancellationReason ?? "This order could not be fulfilled."}
            </p>
          )}

          <ul className="flex flex-col divide-y">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center justify-between py-3 text-sm">
                <span>Qty {item.quantity}</span>
                <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <Separator />

          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${order.totalAmount.toFixed(2)}</span>
          </div>

          <Button
            variant="outline"
            className="mt-2 w-fit"
            nativeButton={false}
            render={<Link href="/orders">View all orders</Link>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
