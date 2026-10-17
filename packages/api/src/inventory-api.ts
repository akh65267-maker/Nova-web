import { apiClient } from "./client";

// Exact stock, for administrators (the list, restock and create answer with it).
export type InventoryItemDto = { productId: string; quantityAvailable: number };

// What anyone may see of a product's stock: a status, and the exact number only when it is small
// (10 or fewer: the shop limits an order to 10). Above that, `remaining` is null on purpose.
export type Availability = {
  productId: string;
  availability: "InStock" | "LowStock" | "OutOfStock";
  remaining: number | null;
};

export async function getInventory(productId: string): Promise<Availability | null> {
  try {
    const { data } = await apiClient.get<Availability>(`/inventory/${productId}`);
    return data;
  } catch (error) {
    if (error && typeof error === "object" && "response" in error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
    }
    throw error;
  }
}

export async function createInventory(productId: string, quantityAvailable: number): Promise<InventoryItemDto> {
  const { data } = await apiClient.post<InventoryItemDto>("/inventory", { productId, quantityAvailable });
  return data;
}

export async function restockInventory(productId: string, quantity: number): Promise<InventoryItemDto> {
  const { data } = await apiClient.post<InventoryItemDto>(`/inventory/${productId}/restock`, { quantity });
  return data;
}

// Administrators only: every product's exact quantity.
export async function listInventory(): Promise<InventoryItemDto[]> {
  const { data } = await apiClient.get<InventoryItemDto[]>("/inventory");
  return data;
}
