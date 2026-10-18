import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";

/** One line of the cart as the shop shows it (the shop keeps the cart in the browser, so it is sent with the question). */
export type AssistantCartLine = { name: string; price: number; quantity: number };

export type AssistantReply = { reply: string; toolsUsed: string[] };

/** Asks the shop assistant. It only reads (products, the caller's own basket). */
export async function askAssistant(request: { message: string; cart: AssistantCartLine[] }): Promise<AssistantReply> {
  const { data } = await apiClient.post<AssistantReply>("/assistant/chat", request);
  return data;
}

export function useAskAssistant() {
  return useMutation({ mutationFn: askAssistant });
}
