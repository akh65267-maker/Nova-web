"use client";

import { useEffect, useRef, useState } from "react";

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

// Soft 3D shapes drifting behind the hero. Decoration only: it stays off for reduced motion, data saver,
// and browsers without WebGL, and it waits until the page is idle so it never competes with the hero's
// own paint (the heading is the LCP element).
export function HeroShapes() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as NavigatorWithConnection).connection?.saveData) return;

    let stop: (() => void) | undefined;
    let cancelled = false;

    const start = () => {
      import("./hero-scene")
        .then(({ mountScene }) => {
          if (cancelled) return;
          stop = mountScene(element, { compact: window.innerWidth < 768 });
          setReady(true);
        })
        // No WebGL (or the chunk failed): the hero is complete without the shapes.
        .catch((error) => {
          if (process.env.NODE_ENV !== "production") console.warn("Hero shapes did not start", error);
        });
    };

    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 600));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(start, { timeout: 2000 });

    return () => {
      cancelled = true;
      cancelIdle(handle);
      stop?.();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      data-ready={ready}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-1000 data-[ready=true]:opacity-100 max-md:data-[ready=true]:opacity-50"
    />
  );
}
