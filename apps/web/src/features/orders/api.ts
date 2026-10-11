import { apiClient } from "@/lib/api-client";

export type OrderItemDto = { productId: string; quantity: number; unitPrice: number };

export type OrderStatus = "Pending" | "Confirmed" | "Cancelled";

export type OrderDto = {
  id: string;
  userId: string;
  items: OrderItemDto[];
  totalAmount: number;
  status: OrderStatus;
  createdAtUtc: string;
  cancellationReason: string | null;
};

export type CreateOrderItem = { productId: string; quantity: number; unitPrice: number };

export async function createOrder(items: CreateOrderItem[]): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>("/orders", { items });
  return data;
}

export async function getOrder(id: string): Promise<OrderDto> {
  const { data } = await apiClient.get<OrderDto>(`/orders/${id}`);
  return data;
}

export async function listOrders(): Promise<OrderDto[]> {
  const { data } = await apiClient.get<OrderDto[]>("/orders");
  return data;
}
