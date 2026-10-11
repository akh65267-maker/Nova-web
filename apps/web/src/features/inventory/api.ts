import { apiClient } from "@/lib/api-client";

export type InventoryItemDto = { productId: string; quantityAvailable: number };

export async function getInventory(productId: string): Promise<InventoryItemDto | null> {
  try {
    const { data } = await apiClient.get<InventoryItemDto>(`/inventory/${productId}`);
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

export async function listInventory(): Promise<InventoryItemDto[]> {
  const { data } = await apiClient.get<InventoryItemDto[]>("/inventory");
  return data;
}
