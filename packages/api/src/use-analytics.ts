import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getAdminOrder,
  getAdminOrders,
  getCancellations,
  getOrderSummary,
  getPendingOrders,
  getTimeseries,
  type AdminOrderQuery,
} from "./analytics-api";
import { getUser } from "./auth-api";

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

// A page of orders. The previous page stays on screen while the next one loads, so paging and
// changing a filter do not flash an empty table.
export function useAdminOrders(query: AdminOrderQuery) {
  return useQuery({
    queryKey: ["admin-orders", query],
    queryFn: () => getAdminOrders(query),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => getAdminOrder(id),
    enabled: Boolean(id),
  });
}

// One customer, for the order detail page. Admins may read any user.
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => getUser(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
