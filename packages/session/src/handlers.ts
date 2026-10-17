import { clearCookie, cookieNames, parseCookies, serializeCookie } from "./cookies.ts";
import { loginAtGateway, logoutAtGateway, refreshAtGateway } from "./gateway.ts";
import { readClaims, secondsUntilExpiry } from "./jwt.ts";
import { RefreshCoordinator, type TokenPair } from "./refresh-coordinator.ts";
import { clientAddress, isSecureRequest, originAllowed } from "./request-checks.ts";

export type SessionConfig = {
  /** Names this app's cookies (tm_<app>_at, tm_<app>_rt) so apps on one host keep separate sessions. */
  app: string;
  /** Where this server reaches the gateway. */
  gatewayUrl: string;
  /** Where the proxy route is mounted. Default "/api/proxy". */
  proxyPrefix?: string;
  /**
   * For tests: use a refresh coordinator of its own instead of the one shared by the whole server
   * process, so what one test refreshed cannot be remembered by the next.
   */
  isolated?: boolean;
};

export type SessionHandlers = {
  login: (request: Request) => Promise<Response>;
  logout: (request: Request) => Promise<Response>;
  session: (request: Request) => Promise<Response>;
  proxy: (request: Request) => Promise<Response>;
};

// An access token with less than this left is renewed before it is used, so a request does not
// travel to the gateway only to be refused on the way.
const RENEW_BELOW_SECONDS = 30;

const TIMEOUT_MS = 30_000;
const NO_BODY_METHODS = new Set(["GET", "HEAD"]);
// Headers that describe the connection or the encoding of the response as the gateway sent it,
// not as this server will send it (fetch has already decoded the body).
const DROP_FROM_RESPONSE = new Set(["set-cookie", "content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);
const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "accept-language"];

const newCoordinator = (gatewayUrl: string) =>
  new RefreshCoordinator((refreshToken, address) => refreshAtGateway(gatewayUrl, refreshToken, address));

// One coordinator per app for the whole server process. Next may bundle each route on its own, so
// a module-level instance could be duplicated, and the session route and the proxy route would
// then each present the same refresh token. Parking it on globalThis keeps it to one.
function sharedCoordinator(app: string, gatewayUrl: string): RefreshCoordinator {
  const registry = ((globalThis as { __tmRefreshCoordinators?: Map<string, RefreshCoordinator> }).__tmRefreshCoordinators ??= new Map());
  const key = `${app}|${gatewayUrl}`;

  let coordinator = registry.get(key);
  if (!coordinator) {
    coordinator = newCoordinator(gatewayUrl);
    registry.set(key, coordinator);
  }
  return coordinator;
}

export function createSessionHandlers(config: SessionConfig): SessionHandlers {
  const names = cookieNames(config.app);
  const gatewayUrl = config.gatewayUrl.replace(/\/+$/, "");
  const prefix = (config.proxyPrefix ?? "/api/proxy").replace(/\/+$/, "");
  const coordinator = config.isolated ? newCoordinator(gatewayUrl) : sharedCoordinator(config.app, gatewayUrl);

  const json = (status: number, body: unknown, setCookies: string[] = []): Response => {
    const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
    for (const cookie of setCookies) headers.append("set-cookie", cookie);
    return new Response(JSON.stringify(body), { status, headers });
  };

  const sessionCookies = (pair: TokenPair, secure: boolean): string[] => [
    serializeCookie(names.access, pair.token, { maxAgeSeconds: (Date.parse(pair.expiresAtUtc) - Date.now()) / 1000, secure }),
    serializeCookie(names.refresh, pair.refreshToken, { maxAgeSeconds: (Date.parse(pair.refreshExpiresAtUtc) - Date.now()) / 1000, secure }),
  ];

  const clearedCookies = (secure: boolean): string[] => [clearCookie(names.access, secure), clearCookie(names.refresh, secure)];

  return {
    async login(request) {
      if (!originAllowed(request)) return json(403, { title: "Forbidden" });

      let credentials: { email?: unknown; password?: unknown };
      try {
        credentials = await request.json();
      } catch {
        return json(400, { title: "Invalid request." });
      }
      if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
        return json(400, { title: "Invalid request." });
      }

      let gatewayResponse: Response;
      try {
        gatewayResponse = await loginAtGateway(gatewayUrl, credentials.email, credentials.password, clientAddress(request.headers));
      } catch {
        return json(502, { title: "The service could not be reached." });
      }

      // A refusal (wrong password, locked account, too many attempts) goes back as the gateway said it.
      if (!gatewayResponse.ok) {
        return new Response(await gatewayResponse.text(), {
          status: gatewayResponse.status,
          headers: { "content-type": gatewayResponse.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
        });
      }

      const pair = (await gatewayResponse.json()) as TokenPair;
      const claims = readClaims(pair.token);
      if (!claims) return json(502, { title: "The service answered with something unreadable." });

      // The page is told who signed in, never the tokens.
      return json(200, { user: { id: claims.id, email: claims.email, role: claims.role } }, sessionCookies(pair, isSecureRequest(request)));
    },

    async logout(request) {
      if (!originAllowed(request)) return json(403, { title: "Forbidden" });

      const secure = isSecureRequest(request);
      const refreshToken = parseCookies(request.headers.get("cookie")).get(names.refresh);
      if (refreshToken) await logoutAtGateway(gatewayUrl, refreshToken, clientAddress(request.headers));

      const headers = new Headers({ "cache-control": "no-store" });
      for (const cookie of clearedCookies(secure)) headers.append("set-cookie", cookie);
      return new Response(null, { status: 204, headers });
    },

    async session(request) {
      const secure = isSecureRequest(request);
      const cookies = parseCookies(request.headers.get("cookie"));
      let access = cookies.get(names.access);
      const refresh = cookies.get(names.refresh);
      let setCookies: string[] = [];

      if (refresh && secondsUntilExpiry(access, Date.now()) < RENEW_BELOW_SECONDS) {
        const outcome = await coordinator.refresh(refresh, clientAddress(request.headers));
        if (outcome.ok) {
          access = outcome.pair.token;
          setCookies = sessionCookies(outcome.pair, secure);
        } else if (outcome.status === 401) {
          // The refresh token is dead for good: forget the session.
          access = undefined;
          setCookies = clearedCookies(secure);
        }
      }

      const claims = secondsUntilExpiry(access, Date.now()) > 0 ? readClaims(access) : null;
      if (!claims) return json(200, { authenticated: false }, setCookies);

      return json(200, { authenticated: true, user: { id: claims.id, email: claims.email, role: claims.role } }, setCookies);
    },

    async proxy(request) {
      if (!originAllowed(request)) return json(403, { title: "Forbidden" });

      const url = new URL(request.url);
      if (!url.pathname.startsWith(prefix)) return json(404, { title: "Not found" });
      const target = `${gatewayUrl}${url.pathname.slice(prefix.length)}${url.search}`;

      const secure = isSecureRequest(request);
      const address = clientAddress(request.headers);
      const cookies = parseCookies(request.headers.get("cookie"));
      let access = cookies.get(names.access);
      const refresh = cookies.get(names.refresh);
      let setCookies: string[] = [];
      let refreshed = false;

      const renew = async (): Promise<boolean> => {
        if (!refresh || refreshed) return false;
        refreshed = true;
        const outcome = await coordinator.refresh(refresh, address);
        if (outcome.ok) {
          access = outcome.pair.token;
          setCookies = sessionCookies(outcome.pair, secure);
          return true;
        }
        if (outcome.status === 401) {
          access = undefined;
          setCookies = clearedCookies(secure);
        }
        return false;
      };

      if (secondsUntilExpiry(access, Date.now()) < RENEW_BELOW_SECONDS) await renew();

      // Read once: a change that has to be retried is sent again with the same body.
      const body = NO_BODY_METHODS.has(request.method.toUpperCase()) ? undefined : await request.arrayBuffer();

      const forward = (): Promise<Response> => {
        const headers = new Headers();
        for (const name of FORWARD_REQUEST_HEADERS) {
          const value = request.headers.get(name);
          if (value) headers.set(name, value);
        }
        if (address) headers.set("x-forwarded-for", address);
        // The gateway is given the token and never the browser's cookies.
        if (access) headers.set("authorization", `Bearer ${access}`);

        return fetch(target, { method: request.method, headers, body, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
      };

      let gatewayResponse: Response;
      try {
        gatewayResponse = await forward();
        if (gatewayResponse.status === 401 && (await renew())) gatewayResponse = await forward();
      } catch {
        return json(502, { title: "The service could not be reached." });
      }

      // The gateway refused the token and there is no refresh token to try: the session is over,
      // and the dead cookie must not linger (the page would keep believing it is signed in). With a
      // refresh token the branches above already decided: renewed, or cleared if it was refused
      // too, or left alone if the gateway could not be reached, since a passing outage must not
      // sign anyone out.
      if (gatewayResponse.status === 401 && !refresh && setCookies.length === 0 && cookies.has(names.access)) {
        setCookies = clearedCookies(secure);
      }

      const headers = new Headers();
      gatewayResponse.headers.forEach((value, name) => {
        if (!DROP_FROM_RESPONSE.has(name.toLowerCase())) headers.set(name, value);
      });
      headers.set("cache-control", "no-store");
      for (const cookie of setCookies) headers.append("set-cookie", cookie);

      const noContent = gatewayResponse.status === 204 || gatewayResponse.status === 205 || gatewayResponse.status === 304;
      return new Response(noContent ? null : await gatewayResponse.arrayBuffer(), { status: gatewayResponse.status, headers });
    },
  };
}
