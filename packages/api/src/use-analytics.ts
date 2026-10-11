import { useQuery } from "@tanstack/react-query";
import { getOrderSummary } from "./analytics-api";

export function useOrderSummary(from: string, to: string) {
  return useQuery({
    queryKey: ["order-summary", from, to],
    queryFn: () => getOrderSummary(from, to),
  });
}
