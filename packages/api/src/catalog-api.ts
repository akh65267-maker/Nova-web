import { apiClient } from "./client";

export type ProductAttribute = {
  name: string;
  value: string;
};

export type ProductDto = {
  id: string;
  name: string;
  description: string;
  /** What the customer pays now: the list price less an active discount. */
  price: number;
  /** The price before any discount; this is the one an admin edits. */
  listPrice: number;
  /** How much cheaper the product is now, rounded; null when no discount is active. */
  discountPercent: number | null;
  /** When the active discount ends, or null when it has no end (or none is active). */
  discountEndsAtUtc: string | null;
  category: string;
  /** Optional. */
  brand: string | null;
  /** Named facts such as Colour: Black, in the order the admin gave them. */
  attributes: ProductAttribute[];
  /** Extra pictures beside the main one, in the order they were added. */
  gallery: string[];
  /** Null while the product has no reviews. */
  ratingAverage: number | null;
  ratingCount: number;
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
  /** Only products with an active discount. */
  onSale?: boolean;
  search?: string;
  /** "best-offer": the deepest discount first. */
  sort?: "newest" | "price-asc" | "price-desc" | "name" | "best-offer";
  /** Only these products (at most 100). */
  ids?: string[];
  page?: number;
  pageSize?: number;
  /** Admin only: also list archived products (ignored for anyone else). */
  includeArchived?: boolean;
};

export async function listProducts(params: ProductListParams): Promise<ProductListResult> {
  const { ids, ...rest } = params;
  const { data } = await apiClient.get<ProductListResult>("/products", { params: { ...rest, ids: ids?.join(",") } });
  return data;
}

/** The products customers bought most in the last 30 days, best first. */
export async function listTopSelling(limit = 8): Promise<ProductDto[]> {
  const { data: ids } = await apiClient.get<string[]>("/orders/top-selling", { params: { limit } });
  if (ids.length === 0) return [];

  const { items } = await listProducts({ ids, pageSize: ids.length });
  const rank = new Map(ids.map((id, index) => [id, index]));

  return items.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
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

/** Products on sale like this one (same brand or category), never the product itself. */
export async function listRelatedProducts(id: string): Promise<ProductDto[]> {
  const { data } = await apiClient.get<ProductDto[]>(`/products/${id}/related`);
  return data;
}

export type DiscountDto = {
  kind: "Percent" | "Fixed";
  value: number;
  /** Null: starts at once. */
  startsAtUtc: string | null;
  /** Null: never ends. */
  endsAtUtc: string | null;
};

/** Admin only. The discount as set (active or not), or null when the product has none. */
export async function getDiscount(id: string): Promise<DiscountDto | null> {
  const { data, status } = await apiClient.get<DiscountDto>(`/products/${id}/discount`);
  return status === 204 ? null : data;
}

/** Admin only. Replaces the product's discount; refused (400) when it is not valid. */
export async function setDiscount(id: string, discount: DiscountDto): Promise<void> {
  await apiClient.put(`/products/${id}/discount`, discount);
}

/** Admin only. */
export async function clearDiscount(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}/discount`);
}

export type ReviewDto = {
  id: string;
  /** Only the first letter of the author's email, then stars. */
  authorName: string;
  rating: number;
  body: string;
  createdAtUtc: string;
  isMine: boolean;
};

export type ProductReviewsDto = {
  summary: {
    average: number | null;
    count: number;
    /** How many reviews gave 1, 2, 3, 4 and 5 stars, in that order. */
    breakdown: number[];
  };
  /** The newest reviews. */
  items: ReviewDto[];
  /** The signed-in caller's own review, when they have written one. */
  mine: ReviewDto | null;
};

export async function listReviews(id: string): Promise<ProductReviewsDto> {
  const { data } = await apiClient.get<ProductReviewsDto>(`/products/${id}/reviews`);
  return data;
}

/** Signed in. Writes the caller's review, replacing the one they had. */
export async function saveReview(id: string, review: { rating: number; body: string }): Promise<void> {
  await apiClient.put(`/products/${id}/reviews`, review);
}

/** Signed in. Removes the caller's own review. */
export async function deleteMyReview(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}/reviews`);
}

/** Admin only. Removes anyone's review. */
export async function deleteReview(id: string, reviewId: string): Promise<void> {
  await apiClient.delete(`/products/${id}/reviews/${reviewId}`);
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
