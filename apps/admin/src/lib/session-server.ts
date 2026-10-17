import { createSessionHandlers } from "@taskmanager/session/handlers";

// The admin's session lives in HttpOnly cookies set and read by these handlers; the browser never
// holds a token. The cookie names are the admin's own (tm_admin_at, tm_admin_rt): cookies ignore
// ports, so on localhost the shop's session would otherwise be this one. requiredRole means only
// an administrator can ever have a session here: a customer's sign-in is refused and revoked, and
// an administrator who is demoted loses access at the next renewal.
export const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8000";

export const sessionHandlers = createSessionHandlers({
  app: "admin",
  gatewayUrl,
  requiredRole: "Admin",
});
