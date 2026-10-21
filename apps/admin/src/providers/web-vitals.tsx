"use client";

import { useReportWebVitals } from "next/web-vitals";

// Logs each Core Web Vital as it settles (LCP, CLS, INP, FCP, TTFB) with its rating.
// Dev-only for now: it gives a baseline to compare the redesign against.
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[web-vitals] ${metric.name} ${Math.round(metric.value * 100) / 100} (${metric.rating})`);
    }
  });
  return null;
}
