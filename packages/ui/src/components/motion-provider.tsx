"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

// One place for how both apps animate. LazyMotion with domAnimation keeps the library to the
// small feature set we use (animate, exit, layout); components use `m`, not `motion`.
// reducedMotion="user" makes every transform animation instant when the visitor has asked for less motion.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
