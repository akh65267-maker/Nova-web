import { apiClient } from "./client";

export type LoginRequest = { email: string; password: string };

export type RegisterRequest = { email: string; displayName: string; password: string };
export type UserDto = { id: string; email: string; displayName: string };

export async function register(request: RegisterRequest): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>("/users", request);
  return data;
}

export async function getUser(id: string): Promise<UserDto> {
  const { data } = await apiClient.get<UserDto>(`/users/${id}`);
  return data;
}
