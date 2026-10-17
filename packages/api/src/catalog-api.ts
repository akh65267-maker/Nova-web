import { apiClient } from "./client";

export type ProductDto = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  /** Where the picture is (the URL carries its version), or null when the product has none. */
  imageUrl: string | null;
};

export type ProductListResult = {
  items: ProductDto[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type ProductListParams = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
  page?: number;
  pageSize?: number;
};

export async function listProducts(params: ProductListParams): Promise<ProductListResult> {
  const { data } = await apiClient.get<ProductListResult>("/products", { params });
  return data;
}

export async function getProduct(id: string): Promise<ProductDto> {
  const { data } = await apiClient.get<ProductDto>(`/products/${id}`);
  return data;
}

export type CreateProductRequest = {
  name: string;
  description: string;
  price: number;
  category: string;
};

export async function createProduct(request: CreateProductRequest): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>("/products", request);
  return data;
}

/** Admin only. The body is the picture itself (JPEG, PNG or WebP, at most 2 MB), not a form. */
export async function uploadProductImage(id: string, file: Blob): Promise<{ imageUrl: string }> {
  const { data } = await apiClient.put<{ imageUrl: string }>(`/products/${id}/image`, file, {
    headers: { "Content-Type": file.type },
  });
  return data;
}

export async function deleteProductImage(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}/image`);
}
