import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder, getOrder, listOrders, type CreateOrderItem } from "./api";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: CreateOrderItem[]) => createOrder(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "Pending" ? 1500 : false),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
  });
}
