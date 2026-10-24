"use client";

import { useEffect } from "react";
import { reloadForChunkError } from "@/lib/chunk-reload";

// Catches a missing chunk wherever it surfaces outside React's error boundaries: a failed
// dynamic import (the lazy header menus, the assistant) or a script that did not load.
export function ChunkReloader() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reloadForChunkError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reloadForChunkError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
