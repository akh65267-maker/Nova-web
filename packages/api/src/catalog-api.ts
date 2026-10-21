import { apiClient } from "./client";

export type ProductAttribute = {
  name: string;
  value: string;
};

export type ProductDto = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  /** Optional. */
  brand: string | null;
  /** Named facts such as Colour: Black, in the order the admin gave them. */
  attributes: ProductAttribute[];
  /** Extra pictures beside the main one, in the order they were added. */
  gallery: string[];
  /** Where the picture is (the URL carries its version), or null when the product has none. */
  imageUrl: string | null;
  /** Off sale. Only the admin console is ever sent an archived product. */
  isArchived: boolean;
};

export type ProductListResult = {
  items: ProductDto[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type ProductListParams = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
  page?: number;
  pageSize?: number;
  /** Admin only: also list archived products (ignored for anyone else). */
  includeArchived?: boolean;
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
  /** Optional; blank means none. */
  brand?: string | null;
  /** Replaces the product's attributes; leave out to keep them. */
  attributes?: ProductAttribute[];
};

export async function createProduct(request: CreateProductRequest): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>("/products", request);
  return data;
}

/** Admin only. The body is the picture itself (JPEG, PNG or WebP, at most 2 MB), not a form. */
export async function updateProduct(id: string, request: CreateProductRequest): Promise<void> {
  await apiClient.put(`/products/${id}`, request);
}

/** Admin only. Archiving takes a product off sale without deleting it (orders still refer to it). */
export async function setProductArchived(id: string, archived: boolean): Promise<void> {
  await apiClient.post(`/products/${id}/${archived ? "archive" : "restore"}`);
}

export async function uploadProductImage(id: string, file: Blob): Promise<{ imageUrl: string }> {
  const { data } = await apiClient.put<{ imageUrl: string }>(`/products/${id}/image`, file, {
    headers: { "Content-Type": file.type },
  });
  return data;
}

export async function deleteProductImage(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}/image`);
}

/** Admin only. Adds a picture to the product's gallery (at most 8). */
export async function addGalleryImage(id: string, file: Blob): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>(`/products/${id}/gallery`, file, {
    headers: { "Content-Type": file.type },
  });
  return data;
}

/** Admin only. `version` is the last part of the picture's URL. */
export async function removeGalleryImage(id: string, version: string): Promise<void> {
  await apiClient.delete(`/products/${id}/gallery/${version}`);
}

export type CategoryDto = {
  id: string;
  name: string;
  /** Products on sale in it (archived ones are not counted). */
  productCount: number;
};

export async function listCategories(): Promise<CategoryDto[]> {
  const { data } = await apiClient.get<CategoryDto[]>("/categories");
  return data;
}

/** Admin only. */
export async function createCategory(name: string): Promise<CategoryDto> {
  const { data } = await apiClient.post<CategoryDto>("/categories", { name });
  return data;
}

/** Admin only. The category's products follow the new name. */
export async function renameCategory(id: string, name: string): Promise<void> {
  await apiClient.put(`/categories/${id}`, { name });
}

/** Admin only. Refused (409) while the category still has products. */
export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export type BrandDto = {
  name: string;
  /** Products on sale with this brand. */
  productCount: number;
};

/** The brands of products on sale. */
export async function listBrands(): Promise<BrandDto[]> {
  const { data } = await apiClient.get<BrandDto[]>("/products/brands");
  return data;
}
