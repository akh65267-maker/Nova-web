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

export type DailyPoint = {
  day: string; // YYYY-MM-DD, UTC
  orders: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
};

export type Timeseries = { from: string; to: string; days: DailyPoint[] };

export async function getTimeseries(from: string, to: string): Promise<Timeseries> {
  const { data } = await apiClient.get<Timeseries>("/orders/admin/timeseries", { params: { from, to } });
  return data;
}

export type CancellationReasonCount = { reason: string; count: number };

export async function getCancellations(from: string, to: string): Promise<CancellationReasonCount[]> {
  const { data } = await apiClient.get<CancellationReasonCount[]>("/orders/admin/cancellations", {
    params: { from, to },
  });
  return data;
}

export type PendingOrder = { id: string; userId: string; createdAtUtc: string; total: number; ageSeconds: number };

export async function getPendingOrders(minAgeSeconds?: number): Promise<PendingOrder[]> {
  const { data } = await apiClient.get<PendingOrder[]>("/orders/admin/pending", { params: { minAgeSeconds } });
  return data;
}
