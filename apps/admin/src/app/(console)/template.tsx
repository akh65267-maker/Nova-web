"use client";

import { m } from "motion/react";

// A template, unlike a layout, mounts again on every navigation: each section fades in.
export default function ConsoleTemplate({ children }: { children: React.ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {children}
    </m.div>
  );
}
