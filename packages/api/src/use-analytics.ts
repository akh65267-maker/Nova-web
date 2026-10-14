import { useQuery } from "@tanstack/react-query";
import { getCancellations, getOrderSummary, getPendingOrders, getTimeseries } from "./analytics-api";

export function useOrderSummary(from: string, to: string) {
  return useQuery({
    queryKey: ["order-summary", from, to],
    queryFn: () => getOrderSummary(from, to),
  });
}

export function useTimeseries(from: string, to: string) {
  return useQuery({
    queryKey: ["order-timeseries", from, to],
    queryFn: () => getTimeseries(from, to),
  });
}

export function useCancellations(from: string, to: string) {
  return useQuery({
    queryKey: ["order-cancellations", from, to],
    queryFn: () => getCancellations(from, to),
  });
}

// Orders that have been Pending for a while. Refreshed, because the point of the list is to
// notice something stuck right now.
export function usePendingOrders(minAgeSeconds = 120) {
  return useQuery({
    queryKey: ["orders-pending", minAgeSeconds],
    queryFn: () => getPendingOrders(minAgeSeconds),
    refetchInterval: 15_000,
  });
}
