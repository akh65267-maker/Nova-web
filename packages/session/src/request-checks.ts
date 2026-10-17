const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Forgery check for anything that changes data. A browser attaches the cookie to a request that
 * another site caused, but it also says where the request came from (the Origin header), and a
 * page cannot forge that. A change is allowed only from the app's own origin. A request with no
 * Origin at all is refused: browsers always send one on a change, so a missing one is not a
 * browser, and a non-browser has no use for a session cookie.
 */
export function originAllowed(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;      // "null" (a sandboxed page) or garbage
  }

  // Behind a proxy the request's own URL is the internal one; the host the browser used is in
  // X-Forwarded-Host (or Host).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  return originHost === host;
}

/**
 * The caller's address, from the last entry of X-Forwarded-For: the one the trusted proxy in front
 * of this server added itself. Earlier entries are whatever the client claimed. Undefined when
 * there is no proxy (local development, where the browser connects directly).
 */
export function clientAddress(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return undefined;

  const last = forwarded.split(",").pop()?.trim();
  return last ? last : undefined;
}

export function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProto === "https" || new URL(request.url).protocol === "https:";
}
