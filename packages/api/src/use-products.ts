import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearDiscount,
  createProduct,
  addGalleryImage,
  deleteProductImage,
  removeGalleryImage,
  getDiscount,
  getProduct,
  listProducts,
  listTopSelling,
  listRelatedProducts,
  setDiscount,
  setProductArchived,
  updateProduct,
  uploadProductImage,
  type CreateProductRequest,
  type DiscountDto,
  type ProductListParams,
} from "./catalog-api";

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => listProducts(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

export function useTopSelling(limit = 8) {
  return useQuery({
    queryKey: ["top-selling", limit],
    queryFn: () => listTopSelling(limit),
    staleTime: 5 * 60_000,
  });
}

export function useRelatedProducts(id: string) {
  return useQuery({
    queryKey: ["related", id],
    queryFn: () => listRelatedProducts(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

export function useDiscount(id: string) {
  return useQuery({
    queryKey: ["discount", id],
    queryFn: () => getDiscount(id),
  });
}

// A discount changes the price shown wherever the product is.
function useRefreshAfterDiscount(id: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["discount", id] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product", id] });
    queryClient.invalidateQueries({ queryKey: ["related"] });
  };
}

export function useSetDiscount(id: string) {
  const refresh = useRefreshAfterDiscount(id);

  return useMutation({
    mutationFn: (discount: DiscountDto) => setDiscount(id, discount),
    onSuccess: refresh,
  });
}

export function useClearDiscount(id: string) {
  const refresh = useRefreshAfterDiscount(id);

  return useMutation({
    mutationFn: () => clearDiscount(id),
    onSuccess: refresh,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProductRequest) => createProduct(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...request }: CreateProductRequest & { id: string }) => updateProduct(id, request),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useSetProductArchived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setProductArchived(id, archived),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadProductImage(id, file),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProductImage(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}

export function useAddGalleryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => addGalleryImage(id, file),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}

export function useRemoveGalleryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => removeGalleryImage(id, version),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}
