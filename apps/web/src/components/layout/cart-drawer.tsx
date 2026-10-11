"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MAX_PER_ORDER, useCartStore } from "@/store/cart-store";

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            Your cart
            {items.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Add items from the catalog to get started."
              action={
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href="/products" onClick={() => setOpen(false)}>
                      Browse products
                    </Link>
                  }
                />
              }
            />
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.productId} className="flex flex-col gap-3 py-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground tabular-nums">${item.price.toFixed(2)} each</p>
                    </div>
                    <span className="font-medium tabular-nums">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-lg border" role="group" aria-label={`Quantity of ${item.name}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-8 text-center tabular-nums" aria-live="polite">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.quantity >= MAX_PER_ORDER}
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
        <SheetFooter className="border-t px-4 pt-4">
          <div className="mb-4 flex w-full items-center justify-between text-sm font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            nativeButton={false}
            render={
              <Link href="/checkout" onClick={() => setOpen(false)}>
                Checkout
              </Link>
            }
          />
        </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
