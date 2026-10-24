"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { Badge } from "@taskmanager/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@taskmanager/ui/components/card";
import { EmptyState } from "@taskmanager/ui/components/empty-state";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@taskmanager/ui/components/table";
import { useAdminOrder, useCustomer } from "@taskmanager/api/use-analytics";
import { useProducts } from "@taskmanager/api/use-products";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { ORDER_STATUS } from "@/lib/order-status";
import { isNotFound } from "@/lib/http";
import { formatPrice } from "@taskmanager/ui/lib/utils";

const when = (iso: string) => `${new Date(iso).toISOString().replace("T", " ").slice(0, 19)} UTC`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useAdminOrder(id);
  const customer = useCustomer(order.data?.userId);
  const products = useProducts({ pageSize: 100 });
  const names = new Map(products.data?.items.map((p) => [p.id, p.name]) ?? []);

  const back = (
    <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden /> All orders
    </Link>
  );

  if (order.isPending) {
    return (
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (order.isError) {
    return (
      <div className="space-y-4">
        {back}
        {isNotFound(order.error) ? (
          <EmptyState icon={ReceiptText} title="Order not found" description="There is no order with this id." />
        ) : (
          <ErrorState
            description={getApiErrorMessage(order.error)}
            onRetry={() => order.refetch()}
            title="We couldn't load this order"
          />
        )}
      </div>
    );
  }

  const o = order.data;
  const s = ORDER_STATUS[o.status];

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-semibold tracking-tight">{o.id}</h1>
        <Badge variant={s.variant}>
          <s.icon aria-hidden />
          {s.label}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row label="Created">{when(o.createdAtUtc)}</Row>
              <Row label="Resolved">
                {o.resolvedAtUtc ? when(o.resolvedAtUtc) : o.status === "Pending" ? "Not yet" : "Not recorded"}
              </Row>
              {o.status === "Cancelled" && <Row label="Reason">{o.cancellationReason ?? "Not recorded"}</Row>}
              <Row label="Total">
                <span className="font-semibold tabular-nums">{formatPrice(o.totalAmount)}</span>
              </Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {customer.isPending && customer.fetchStatus !== "idle" ? (
                <Skeleton className="h-10 w-full" aria-hidden />
              ) : customer.data ? (
                <>
                  <Row label="Name">{customer.data.displayName}</Row>
                  <Row label="Email">{customer.data.email}</Row>
                </>
              ) : (
                <Row label="Name">Could not be looked up</Row>
              )}
              <Row label="User id">
                <span className="font-mono text-xs">{o.userId}</span>
              </Row>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.items.map((i) => (
                <TableRow key={i.productId}>
                  <TableCell>
                    {names.get(i.productId) ?? <span className="font-mono text-xs">{i.productId}</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(i.unitPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(i.quantity * i.unitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
