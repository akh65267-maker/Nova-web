import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInventory, getInventory, listInventory, restockInventory } from "./api";

export function useInventory(productId: string) {
  return useQuery({
    queryKey: ["inventory", productId],
    queryFn: () => getInventory(productId),
    enabled: Boolean(productId),
  });
}

export function useInventoryList() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => listInventory(),
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      createInventory(productId, quantity),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", productId] });
    },
  });
}

export function useRestockInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      restockInventory(productId, quantity),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", productId] });
    },
  });
}
