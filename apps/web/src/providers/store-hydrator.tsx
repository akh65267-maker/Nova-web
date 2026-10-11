"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

export function StoreHydrator() {
  useEffect(() => {
    Promise.resolve(useAuthStore.persist.rehydrate()).finally(() => {
      useAuthStore.getState().setHasHydrated(true);
    });
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
