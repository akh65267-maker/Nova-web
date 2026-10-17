import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProductImage,
  getProduct,
  listProducts,
  uploadProductImage,
  type CreateProductRequest,
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

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProductRequest) => createProduct(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
