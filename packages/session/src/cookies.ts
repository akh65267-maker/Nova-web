// The session lives in two cookies the page's scripts can never read (HttpOnly): a short-lived
// access token and a longer-lived refresh token. Cookies ignore ports, so on localhost the shop
// (3100), the admin (3200) and the gateway (8000) would all see each other's cookies; each app
// therefore has its own names, and the two sessions stay apart.

export function cookieNames(app: string): { access: string; refresh: string } {
  return { access: `tm_${app}_at`, refresh: `tm_${app}_rt` };
}

// Both cookies are scoped to /api: the browser sends them to the app's own API routes and to
// nothing else (not on page loads, not on image requests).
const COOKIE_PATH = "/api";

export function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;

    const raw = part.slice(index + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(raw));
    } catch {
      cookies.set(name, raw);
    }
  }

  return cookies;
}

export function serializeCookie(name: string, value: string, options: { maxAgeSeconds: number; secure: boolean }): string {
  const maxAge = Math.max(0, Math.floor(options.maxAgeSeconds));

  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    // Lax: not sent with a request another site causes by form post or script, only with a
    // top-level navigation. The origin check on every change is the second layer.
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    // Secure only over https; plain http (local development) would refuse to store it.
    ...(options.secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearCookie(name: string, secure: boolean): string {
  // The same name and path as when it was set, or the browser keeps the old one.
  return serializeCookie(name, "", { maxAgeSeconds: 0, secure });
}
