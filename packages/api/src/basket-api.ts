import { apiClient } from "./client";

// What BasketService keeps: a product and how many, nothing else. Names and prices are the
// catalog's to say, so the shop looks them up when it loads a basket.
export type BasketLine = { productId: string; quantity: number };
export type BasketDto = { userId: string; items: BasketLine[] };

export async function getBasket(): Promise<BasketDto> {
  const { data } = await apiClient.get<BasketDto>("/basket");
  return data;
}

// Replaces the whole basket, so the server holds exactly what the shop's cart holds.
export async function saveBasket(items: BasketLine[]): Promise<BasketDto> {
  const { data } = await apiClient.put<BasketDto>("/basket", { items });
  return data;
}
