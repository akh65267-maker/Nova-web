import type { RefreshOutcome } from "./refresh-coordinator.ts";

// How long to wait for the gateway before giving up on a sign-in step.
const TIMEOUT_MS = 10_000;

async function postJson(gatewayUrl: string, path: string, body: unknown, clientAddress: string | undefined): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };

  // The gateway limits sign-in attempts per caller. Every call from this server would otherwise
  // look like the same caller, and a handful of failed sign-ins from anyone would block everyone.
  if (clientAddress) headers["x-forwarded-for"] = clientAddress;

  return fetch(`${gatewayUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export function loginAtGateway(gatewayUrl: string, email: string, password: string, clientAddress: string | undefined): Promise<Response> {
  return postJson(gatewayUrl, "/users/login", { email, password }, clientAddress);
}

export async function refreshAtGateway(gatewayUrl: string, refreshToken: string, clientAddress: string | undefined): Promise<RefreshOutcome> {
  try {
    const response = await postJson(gatewayUrl, "/users/refresh", { refreshToken }, clientAddress);
    if (!response.ok) return { ok: false, status: response.status };

    const pair = await response.json();
    if (typeof pair?.token !== "string" || typeof pair?.refreshToken !== "string") return { ok: false, status: 502 };
    return { ok: true, pair };
  } catch {
    // The gateway could not be reached: not the same as the token being refused, so no 401.
    return { ok: false, status: 502 };
  }
}

/** Best effort: the cookies are cleared whether or not the backend could be told. */
export async function logoutAtGateway(gatewayUrl: string, refreshToken: string, clientAddress: string | undefined): Promise<void> {
  try {
    await postJson(gatewayUrl, "/users/logout", { refreshToken }, clientAddress);
  } catch {
    // ignored on purpose
  }
}
