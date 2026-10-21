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

// The most ids the server answers in one call (InventoryItemsService.MaxBatch).
const MAX_BATCH = 100;

export async function getAvailabilityMany(productIds: string[]): Promise<Availability[]> {
  const { data } = await apiClient.get<Availability[]>("/inventory/availability", {
    params: { ids: productIds },
    paramsSerializer: { indexes: null }, // ?ids=a&ids=b, the form the server reads
  });
  return data;
}

type Waiting = { resolve: (value: Availability | null) => void; reject: (reason: unknown) => void };
const waiting = new Map<string, Waiting[]>();

/**
 * One product's availability (null when it has no stock record). Lookups made in the same tick -
 * a grid of cards each asking about its own product - go out as a single request, so the
 * per-product cache keys and callers stay as they were.
 */
export function getInventory(productId: string): Promise<Availability | null> {
  return new Promise((resolve, reject) => {
    const callers = waiting.get(productId);
    if (callers) callers.push({ resolve, reject });
    else waiting.set(productId, [{ resolve, reject }]);
    if (waiting.size === 1 && !callers) setTimeout(flushWaiting, 0);
  });
}

async function flushWaiting(): Promise<void> {
  const batch = new Map(waiting);
  waiting.clear();
  const ids = [...batch.keys()];

  for (let start = 0; start < ids.length; start += MAX_BATCH) {
    const chunk = ids.slice(start, start + MAX_BATCH);
    try {
      const found = new Map((await getAvailabilityMany(chunk)).map((a) => [a.productId, a]));
      for (const id of chunk) for (const caller of batch.get(id)!) caller.resolve(found.get(id) ?? null);
    } catch (error) {
      for (const id of chunk) for (const caller of batch.get(id)!) caller.reject(error);
    }
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
