import { useMutation } from "@tanstack/react-query";
import { register, type RegisterRequest } from "@taskmanager/api/auth-api";

// Signing in, the session and signing out are in use-session.ts. Registering needs no session: it
// only creates the account, and the shop signs the new customer in afterwards.
export function useRegister() {
  return useMutation({
    mutationFn: (request: RegisterRequest) => register(request),
  });
}
