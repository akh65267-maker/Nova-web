import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";

export type AssistantReply = { reply: string; toolsUsed: string[] };

/** Asks the shop assistant. It only reads (products, the caller's own basket). */
export async function askAssistant(message: string): Promise<AssistantReply> {
  const { data } = await apiClient.post<AssistantReply>("/assistant/chat", { message });
  return data;
}

export function useAskAssistant() {
  return useMutation({ mutationFn: askAssistant });
}
