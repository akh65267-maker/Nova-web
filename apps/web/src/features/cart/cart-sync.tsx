"use client";

import { useEffect } from "react";
import { useSessionStore } from "@taskmanager/auth/session-store";
import { getBasket, saveBasket, type BasketLine } from "@taskmanager/api/basket-api";
import { getProduct } from "@taskmanager/api/catalog-api";
import { MAX_PER_ORDER, useCartStore, type CartItem } from "@/store/cart-store";

const SAVE_DELAY_MS = 500;

const lines = (items: CartItem[]): BasketLine[] =>
  items.map(({ productId, quantity }) => ({ productId, quantity }));

/**
 * Keeps a signed-in customer's cart in BasketService so it follows them to another browser or
 * device. The browser's cart stays what the pages read; this only mirrors it.
 *
 * On sign-in the saved basket and the browser's cart are merged (the larger quantity of each
 * product wins), then every change is saved after a short pause. Best effort: a failed call never
 * blocks shopping, and the next change tries again. Nothing is saved for a signed-out visitor, and
 * signing out empties the browser's cart without touching the saved basket.
 */
export function CartSync() {
  const userId = useSessionStore((state) => state.user?.id ?? null);

  useEffect(() => {
    if (!userId) return;

    const signedIn = () => useSessionStore.getState().user?.id === userId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    const startSaving = () => {
      let saved = JSON.stringify(lines(useCartStore.getState().items));
      unsubscribe = useCartStore.subscribe((state) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          // Signing out clears the cart a moment after the session ends; that is not a change to save.
          if (cancelled || !signedIn()) return;
          const next = lines(state.items);
          const text = JSON.stringify(next);
          if (text === saved) return;
          saveBasket(next).then(() => (saved = text), () => undefined);
        }, SAVE_DELAY_MS);
      });
    };

    void (async () => {
      try {
        // The browser's cart is restored from storage by StoreHydrator; wait for it so a merge
        // does not run against an empty cart and then overwrite what was really in it.
        if (!useCartStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const stop = useCartStore.persist.onFinishHydration(() => {
              stop();
              resolve();
            });
          });
        }

        const basket = await getBasket();
        if (cancelled || !signedIn()) return;

        const local = useCartStore.getState().items;
        const merged = new Map(local.map((item) => [item.productId, { ...item }]));
        for (const line of basket.items) {
          const mine = merged.get(line.productId);
          if (mine) {
            mine.quantity = Math.min(MAX_PER_ORDER, Math.max(mine.quantity, line.quantity));
            continue;
          }
          try {
            const product = await getProduct(line.productId);
            merged.set(line.productId, {
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: Math.min(MAX_PER_ORDER, line.quantity),
            });
          } catch {
            // a product that no longer exists is simply dropped from the cart
          }
        }
        if (cancelled || !signedIn()) return;

        useCartStore.setState({ items: [...merged.values()] });
      } catch {
        // the basket could not be read: keep the browser's cart and save from here on
      }
      if (!cancelled && signedIn()) startSaving();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [userId]);

  return null;
}
