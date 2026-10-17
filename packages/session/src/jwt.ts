const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export type SessionUser = { id: string; email: string; role: string };

export type Claims = SessionUser & { exp: number };

// Reads what the page shows (who, and which role) from the access token. It does NOT verify the
// signature: this server only reads a cookie it set itself, and what the token allows is decided
// by the services, which do verify it. A tampered cookie can change what the page displays for
// its own owner and nothing more.
export function readClaims(token: string | undefined): Claims | null {
  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
    const id = payload.sub;
    if (typeof id !== "string" || !id) return null;

    const role = payload[ROLE_CLAIM];
    return {
      id,
      email: typeof payload.email === "string" ? payload.email : "",
      role: typeof role === "string" ? role : "Customer",
      exp: typeof payload.exp === "number" ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

/** Seconds until the access token expires; negative once it has, and -Infinity for no token at all. */
export function secondsUntilExpiry(token: string | undefined, nowMs: number): number {
  const claims = readClaims(token);
  return claims ? claims.exp - nowMs / 1000 : -Infinity;
}
