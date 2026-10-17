"use client";

import { useEffect } from "react";
import { loadSession } from "@taskmanager/auth/use-session";
import { useCartStore } from "@/store/cart-store";

export function StoreHydrator() {
  useEffect(() => {
    // The session is in cookies the page cannot read: ask the server who is signed in.
    void loadSession();
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
