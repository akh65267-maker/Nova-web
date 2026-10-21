import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMyReview, listReviews, saveReview } from "./catalog-api";

export function useReviews(productId: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => listReviews(productId),
    enabled: Boolean(productId),
  });
}

// A review changes the product's average too, which the product page, lists and suggestions show.
function useRefreshAfterChange(productId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    queryClient.invalidateQueries({ queryKey: ["product", productId] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["related"] });
  };
}

export function useSaveReview(productId: string) {
  const refresh = useRefreshAfterChange(productId);

  return useMutation({
    mutationFn: (review: { rating: number; body: string }) => saveReview(productId, review),
    onSuccess: refresh,
  });
}

export function useDeleteMyReview(productId: string) {
  const refresh = useRefreshAfterChange(productId);

  return useMutation({
    mutationFn: () => deleteMyReview(productId),
    onSuccess: refresh,
  });
}
