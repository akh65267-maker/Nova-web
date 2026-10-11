import { apiClient } from "@/lib/api-client";

export type ProductDto = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
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
