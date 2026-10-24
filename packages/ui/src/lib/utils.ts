export { cn } from "cn";

// One fixed locale, so the server and the browser print the same text (no hydration mismatch).
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** A price in dollars with thousands separators: 9239.99 → "$9,239.99". */
export function formatPrice(amount: number): string {
  return usd.format(amount);
}
