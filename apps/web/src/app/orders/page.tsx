"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@taskmanager/ui/components/badge";
import { Button } from "@taskmanager/ui/components/button";
import { Card, CardContent } from "@taskmanager/ui/components/card";
import { EmptyState } from "@taskmanager/ui/components/empty-state";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { useOrders } from "@taskmanager/api/use-orders";
import { useRequireSession } from "@taskmanager/auth/use-require-session";
import { ORDER_STATUS } from "@/features/orders/status";

export default function OrdersPage() {
  const { isReady } = useRequireSession("/login?redirect=/orders");
  const { data: orders, isLoading, isError, error, refetch } = useOrders();

  if (!isReady) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your orders</h1>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <ErrorState description={getApiErrorMessage(error, "Check your connection and try again.")} onRetry={() => refetch()} title="Couldn't load your orders" />
      ) : orders && orders.length > 0 ? (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAtUtc).toLocaleDateString()}
                    </p>
                    <p className="font-medium tabular-nums">${order.totalAmount.toFixed(2)}</p>
                  </div>
                  <Badge variant={(ORDER_STATUS[order.status] ?? ORDER_STATUS.Pending).variant}>
                    {(ORDER_STATUS[order.status] ?? ORDER_STATUS.Pending).label}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Once you place your first order, it'll show up here."
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/products">Browse products</Link>}
            />
          }
        />
      )}
    </div>
  );
}
