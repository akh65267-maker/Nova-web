import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { OrderStatus } from "@taskmanager/api/orders-api";

// How an order status looks in the console. Wording is the system's (Pending), not the shop's
// softer "Processing": an administrator wants to see the real state.
export const ORDER_STATUS = {
  Pending: { label: "Pending", icon: Clock, variant: "warning" },
  Confirmed: { label: "Confirmed", icon: CheckCircle2, variant: "success" },
  Cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
} as const satisfies Record<OrderStatus, unknown>;

export const STATUSES: OrderStatus[] = ["Pending", "Confirmed", "Cancelled"];
