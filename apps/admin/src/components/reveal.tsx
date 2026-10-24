"use client";

import { m } from "motion/react";

// Fades and lifts its content in when it first appears. The easing is a tween, not the provider's
// spring: a spring on opacity can overshoot and flicker. Reduced motion is handled by MotionProvider.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </m.div>
  );
}
