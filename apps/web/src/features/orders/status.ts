import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { OrderStatus } from "./api";

// One place for how an order status looks, shared by the list and the detail page.
export const ORDER_STATUS = {
  Pending: {
    label: "Processing",
    title: "Confirming your order",
    icon: Clock,
    variant: "warning",
    tone: "bg-warning/15 text-warning-foreground dark:text-warning",
  },
  Confirmed: {
    label: "Confirmed",
    title: "Order confirmed",
    icon: CheckCircle2,
    variant: "success",
    tone: "bg-success/15 text-success",
  },
  Cancelled: {
    label: "Cancelled",
    title: "Order cancelled",
    icon: XCircle,
    variant: "destructive",
    tone: "bg-destructive/10 text-destructive",
  },
} as const satisfies Record<OrderStatus, unknown>;
