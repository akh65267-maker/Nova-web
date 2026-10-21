import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, deleteCategory, listCategories, renameCategory } from "./catalog-api";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    // The list changes rarely and is read on every page.
    staleTime: 5 * 60_000,
  });
}

// A renamed category changes its products, and a product's category counts toward the totals.
function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: ["categories"] }), queryClient.invalidateQueries({ queryKey: ["products"] })]);
}

export function useCreateCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: createCategory, onSuccess: invalidate });
}

export function useRenameCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => renameCategory(id, name), onSuccess: invalidate });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: deleteCategory, onSuccess: invalidate });
}
