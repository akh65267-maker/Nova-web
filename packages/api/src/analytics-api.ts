import { apiClient } from "./client";

// Figures for one period. Dates are UTC; revenue is over confirmed orders only (see the
// backend's docs/admin-dashboard-plan.md). Null means "nothing to average", not zero.
export type PeriodTotals = {
  orders: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
  averageOrderValue: number | null;
  cancellationRate: number | null;
};

export type OrderSummary = {
  from: string;
  to: string;
  current: PeriodTotals;
  previousFrom: string;
  previousTo: string;
  previous: PeriodTotals;
};

export async function getOrderSummary(from: string, to: string): Promise<OrderSummary> {
  const { data } = await apiClient.get<OrderSummary>("/orders/admin/summary", { params: { from, to } });
  return data;
}
