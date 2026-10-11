"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { useCartStore, useCartSubtotal } from "@/store/cart-store";
import { useCreateOrder } from "@/features/orders/use-orders";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { getApiErrorMessage } from "@/lib/api-error";

export default function CheckoutPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth("/login?redirect=/checkout");
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const subtotal = useCartSubtotal();
  const createOrder = useCreateOrder();

  if (!isReady) {
    return null;
  }

  function handlePlaceOrder() {
    createOrder.mutate(
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      {
        onSuccess: ({ id }) => {
          clearCart();
          router.push(`/orders/${id}`);
        },
      },
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="py-24"
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Add something from the catalog before checking out."
        action={
          <Button nativeButton={false} render={<Link href="/products">Continue shopping</Link>} />
        }
      />
    );
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Review your order</CardTitle>
          <p className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground tabular-nums">
                    {item.quantity} × ${item.price.toFixed(2)}
                  </p>
                </div>
                <span className="font-medium tabular-nums">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="tabular-nums">${subtotal.toFixed(2)}</span>
          </div>

          {createOrder.isError && (
            <ErrorMessage>{getApiErrorMessage(createOrder.error)}</ErrorMessage>
          )}

          <Button
            size="lg"
            className="mt-2 w-full"
            disabled={createOrder.isPending}
            onClick={handlePlaceOrder}
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Placing order…
              </>
            ) : (
              "Place order"
            )}
          </Button>

          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/products">Continue shopping</Link>}
          />

          <p className="text-center text-xs text-muted-foreground">
            Shipping address and payment are not collected yet — this places a demo
            order against the order-fulfillment saga.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
