"use client";

import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RivePlayerProps = {
  /**
   * Path to a .riv file served from /public, e.g. "/animations/hero.riv".
   * The component renders `fallback` until the file loads.
   * Drop the .riv into /public and the animation activates automatically.
   */
  src: string;
  /** State machine name declared inside the .riv file. */
  stateMachine?: string;
  /** Rendered while loading or on error. */
  fallback?: ReactNode;
  className?: string;
};

/**
 * Thin wrapper around @rive-app/react-canvas.
 *
 * The design side creates animations in the Rive editor (rive.app),
 * exports the .riv file, and drops it into /public/animations/.
 * This component then plays it and falls back to `fallback` otherwise.
 *
 * Example:
 *   <RivePlayer
 *     src="/animations/product-hero.riv"
 *     stateMachine="HeroSM"
 *     fallback={<ProductIllustration category="Electronics" className="h-full w-full" />}
 *     className="h-full w-full"
 *   />
 */
export function RivePlayer({ src, stateMachine, fallback, className }: RivePlayerProps) {
  const { RiveComponent, rive } = useRive({
    src,
    stateMachines: stateMachine ? [stateMachine] : undefined,
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  });

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {rive ? <RiveComponent className="h-full w-full" /> : fallback}
    </div>
  );
}
