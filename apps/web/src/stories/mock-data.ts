import type { QueryClient } from "@tanstack/react-query";
import type { CategoryDto, ProductDto } from "@taskmanager/api/catalog-api";
import type { Availability } from "@taskmanager/api/inventory-api";
import products from "./products.json";

// Storybook's stand-in for the backend: a handful of real-looking products (from DummyJSON, a free
// test-data service; pictures load from its CDN) and the answers the components would ask for.
export const mockProducts = products as ProductDto[];

export const byName = (name: string) => {
  const product = mockProducts.find((p) => p.name === name);
  if (!product) throw new Error(`No mock product named ${name}`);
  return product;
};

/** A product with no picture, to show the placeholder tile. */
export const unpictured: ProductDto = { ...mockProducts[0], id: "mock-unpictured", name: "Trail Running Shoes", brand: "SwiftRacer", category: "Sports & Outdoors", imageUrl: null, gallery: [], discountPercent: null, price: 129, listPrice: 129 };

export const mockCategories: CategoryDto[] = [
  { id: "c1", name: "Electronics", productCount: 40 },
  { id: "c2", name: "Fashion", productCount: 49 },
  { id: "c3", name: "Home & Kitchen", productCount: 40 },
  { id: "c4", name: "Sports & Outdoors", productCount: 23 },
];

// Most things are in stock; one is running low and one is gone, so the cards show every state.
function availabilityOf(id: string): Availability {
  if (id === byName("Nike Air Jordan 1 Red And Black").id) return { productId: id, availability: "OutOfStock", remaining: 0 };
  if (id === byName("Rolex Cellini Moonphase").id) return { productId: id, availability: "LowStock", remaining: 3 };
  return { productId: id, availability: "InStock", remaining: null };
}

/** Fills a story's cache with what the components would fetch, under the same keys as the hooks. */
export function seedQueries(queryClient: QueryClient) {
  for (const product of [...mockProducts, unpictured]) {
    queryClient.setQueryData(["inventory", product.id], availabilityOf(product.id));
    queryClient.setQueryData(["product", product.id], product);
  }
  const page = (items: ProductDto[]) => ({ items, totalCount: items.length, page: 1, pageSize: 8 });
  queryClient.setQueryData(["products", { sort: "newest", page: 1, pageSize: 8 }], page(mockProducts));
  queryClient.setQueryData(["products", { onSale: true, sort: "best-offer", page: 1, pageSize: 8 }], page(mockProducts.filter((p) => p.discountPercent !== null)));
  queryClient.setQueryData(["top-selling", 8], [...mockProducts].reverse());
  queryClient.setQueryData(["categories"], mockCategories);
}
