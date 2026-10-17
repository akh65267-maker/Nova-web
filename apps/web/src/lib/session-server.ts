import { createSessionHandlers } from "@taskmanager/session/handlers";

// The shop's session lives in HttpOnly cookies set and read by these handlers; the browser never
// holds a token. GATEWAY_URL is where this server reaches the gateway (not a NEXT_PUBLIC_ value:
// the browser no longer talks to the gateway at all, only to this app's /api routes).
export const sessionHandlers = createSessionHandlers({
  app: "shop",
  gatewayUrl: process.env.GATEWAY_URL ?? "http://localhost:8000",
});
