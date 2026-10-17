import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import { createSessionHandlers } from "./handlers.ts";

const ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const ORIGIN = "http://localhost:3100";

function jwt(payload: object): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part(payload)}.sig`;
}

const inSeconds = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;
const accessToken = (name: string, expiresInSeconds = 900, role = "Customer") =>
  jwt({ sub: `user-${name}`, email: `${name}@example.com`, exp: inSeconds(expiresInSeconds), [ROLE]: role, jti: Math.random().toString() });

// A stand-in for the gateway that records what it was sent.
type Recorded = { method: string; url: string; headers: IncomingMessage["headers"]; body: string };
let gateway: Server;
let gatewayUrl: string;
let received: Recorded[];
let validAccess: Set<string>;                 // access tokens the stand-in accepts
let refreshTokens: Map<string, { access: string; next: string }>;   // refresh token -> what a refresh returns
let refreshDelayMs = 0;

const pairResponse = (access: string, refresh: string) => ({
  token: access,
  expiresAtUtc: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: refresh,
  refreshExpiresAtUtc: new Date(Date.now() + 14 * 86_400_000).toISOString(),
});

before(async () => {
  gateway = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", async () => {
      const body = Buffer.concat(chunks).toString("utf8");
      received.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers, body });
      const json = (status: number, value?: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(value === undefined ? undefined : JSON.stringify(value));
      };

      if (req.url === "/users/login") {
        const { password } = JSON.parse(body);
        if (password !== "right") return json(401, { title: "Authentication failed." });
        const access = accessToken("login");
        validAccess.add(access);
        refreshTokens.set("login-refresh", { access: accessToken("after-login-refresh"), next: "login-refresh-2" });
        return json(200, pairResponse(access, "login-refresh"));
      }

      if (req.url === "/users/refresh") {
        if (refreshDelayMs) await new Promise((r) => setTimeout(r, refreshDelayMs));
        const { refreshToken } = JSON.parse(body);
        const next = refreshTokens.get(refreshToken);
        if (!next) return json(401, { title: "Authentication failed." });
        refreshTokens.delete(refreshToken);                       // spent
        validAccess.add(next.access);
        refreshTokens.set(next.next, { access: accessToken("later"), next: `${next.next}-again` });
        return json(200, pairResponse(next.access, next.next));
      }

      if (req.url === "/users/logout") return json(204);

      if (req.url?.startsWith("/products")) return json(200, { items: [] });   // public

      const bearer = req.headers.authorization?.replace(/^Bearer /, "");
      if (!bearer || !validAccess.has(bearer)) return json(401, { title: "Unauthorized" });
      return json(200, { ok: true, echoed: body });
    });
  });
  await new Promise<void>((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  gatewayUrl = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}`;
});

after(() => gateway.close());

beforeEach(() => {
  received = [];
  validAccess = new Set();
  refreshTokens = new Map();
  refreshDelayMs = 0;
});

// A fresh handler set per test, so one test's refresh memory cannot leak into the next.
const handlers = () => createSessionHandlers({ app: "shop", gatewayUrl, isolated: true });

const cookiesOf = (response: Response) => response.headers.getSetCookie();
const cookieValue = (response: Response, name: string) =>
  cookiesOf(response).find((c) => c.startsWith(`${name}=`))?.split(";")[0].slice(name.length + 1);
const cookieHeader = (cookies: Record<string, string>) =>
  Object.entries(cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; ");

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, ...headers }, body: JSON.stringify(body) });

// ── login ────────────────────────────────────────────────────────────────────────────────────

test("signing in sets the session in HttpOnly cookies and puts no token in the response", async () => {
  const response = await handlers().login(post("/api/auth/login", { email: "a@example.com", password: "right" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body), ["user"]);                       // the page is told who, never the token
  assert.equal(body.user.email, "login@example.com");

  const cookies = cookiesOf(response);
  assert.equal(cookies.length, 2);
  assert.ok(cookies.every((c) => /HttpOnly/.test(c) && /SameSite=Lax/.test(c) && /Path=\/api/.test(c)));
  assert.ok(cookieValue(response, "tm_shop_at"));
  assert.equal(cookieValue(response, "tm_shop_rt"), "login-refresh");
  assert.doesNotMatch(JSON.stringify(body), /login-refresh/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("a wrong password passes the gateway's answer through and sets no cookies", async () => {
  const response = await handlers().login(post("/api/auth/login", { email: "a@example.com", password: "wrong" }));

  assert.equal(response.status, 401);
  assert.equal(cookiesOf(response).length, 0);
});

test("signing in from another origin is refused before the gateway is asked", async () => {
  const response = await handlers().login(post("/api/auth/login", { email: "a@example.com", password: "right" }, { origin: "https://evil.example" }));

  assert.equal(response.status, 403);
  assert.equal(received.length, 0);
  assert.equal(cookiesOf(response).length, 0);
});

test("a malformed sign-in body is a 400, not a crash", async () => {
  const request = new Request(`${ORIGIN}/api/auth/login`, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: "not json" });

  assert.equal((await handlers().login(request)).status, 400);
  assert.equal(received.length, 0);
});

test("the caller's address goes to the gateway, so its limits apply per person and not per server", async () => {
  await handlers().login(post("/api/auth/login", { email: "a@example.com", password: "right" }, { "x-forwarded-for": "198.51.100.4, 203.0.113.9" }));

  assert.equal(received[0].headers["x-forwarded-for"], "203.0.113.9");
});

// ── proxy ────────────────────────────────────────────────────────────────────────────────────

test("a signed-in call goes to the gateway with the token, and the cookie goes no further", async () => {
  const access = accessToken("a");
  validAccess.add(access);

  const response = await handlers().proxy(
    new Request(`${ORIGIN}/api/proxy/orders?page=2`, { headers: { cookie: cookieHeader({ tm_shop_at: access, tm_shop_rt: "r" }) } }),
  );

  assert.equal(response.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].url, "/orders?page=2");
  assert.equal(received[0].headers.authorization, `Bearer ${access}`);
  assert.equal(received[0].headers.cookie, undefined);                 // the gateway never sees the browser's cookies
});

test("a public call needs no session and carries no token", async () => {
  const response = await handlers().proxy(new Request(`${ORIGIN}/api/proxy/products?pageSize=12`));

  assert.equal(response.status, 200);
  assert.equal(received[0].headers.authorization, undefined);
});

test("a change is forwarded with its body, and only from the app's own origin", async () => {
  const access = accessToken("a");
  validAccess.add(access);
  const cookie = cookieHeader({ tm_shop_at: access });

  const ok = await handlers().proxy(post("/api/proxy/orders", { items: [1] }, { cookie }));
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse((await ok.json()).echoed).items[0], 1);

  received.length = 0;
  const forged = await handlers().proxy(post("/api/proxy/orders", { items: [1] }, { cookie, origin: "https://evil.example" }));
  assert.equal(forged.status, 403);
  assert.equal(received.length, 0);
});

test("when the access cookie has expired, the refresh token quietly gets a new pair first", async () => {
  refreshTokens.set("r1", { access: accessToken("fresh"), next: "r2" });

  const response = await handlers().proxy(
    new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_rt: "r1" }) } }),
  );

  assert.equal(response.status, 200);
  assert.equal(received.filter((r) => r.url === "/users/refresh").length, 1);
  assert.match(received.find((r) => r.url === "/orders")!.headers.authorization ?? "", /^Bearer /);
  assert.equal(cookieValue(response, "tm_shop_rt"), "r2");              // the new pair is set on this very response
  assert.ok(cookieValue(response, "tm_shop_at"));
});

test("an access token about to expire is renewed before it is used", async () => {
  const nearlyDone = accessToken("a", 5);
  validAccess.add(nearlyDone);
  refreshTokens.set("r1", { access: accessToken("fresh"), next: "r2" });

  const response = await handlers().proxy(
    new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_at: nearlyDone, tm_shop_rt: "r1" }) } }),
  );

  assert.equal(response.status, 200);
  assert.equal(received.filter((r) => r.url === "/users/refresh").length, 1);
  assert.notEqual(received.find((r) => r.url === "/orders")!.headers.authorization, `Bearer ${nearlyDone}`);
});

test("when the gateway says 401, one refresh and one retry follow", async () => {
  // An access token the gateway does not know (revoked key, restarted stand-in): looks fine locally, fails there.
  const unknown = accessToken("unknown");
  refreshTokens.set("r1", { access: accessToken("fresh"), next: "r2" });

  const response = await handlers().proxy(
    new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_at: unknown, tm_shop_rt: "r1" }) } }),
  );

  assert.equal(response.status, 200);
  assert.equal(received.filter((r) => r.url === "/orders").length, 2);       // tried, refreshed, tried again
  assert.equal(received.filter((r) => r.url === "/users/refresh").length, 1);
});

test("when the refresh token is no good either, the session is cleared and the 401 stands", async () => {
  const response = await handlers().proxy(
    new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_at: accessToken("unknown"), tm_shop_rt: "spent" }) } }),
  );

  assert.equal(response.status, 401);
  const cookies = cookiesOf(response);
  assert.ok(cookies.some((c) => c.startsWith("tm_shop_at=;") && /Max-Age=0/.test(c)));
  assert.ok(cookies.some((c) => c.startsWith("tm_shop_rt=;") && /Max-Age=0/.test(c)));
});

test("a 401 with no refresh token to try ends the session: the dead cookie is cleared", async () => {
  const response = await handlers().proxy(
    new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_at: accessToken("unknown") }) } }),
  );

  assert.equal(response.status, 401);
  const cookies = cookiesOf(response);
  assert.ok(cookies.some((c) => c.startsWith("tm_shop_at=;") && /Max-Age=0/.test(c)));
  assert.ok(cookies.some((c) => c.startsWith("tm_shop_rt=;") && /Max-Age=0/.test(c)));
});

test("a 401 for someone with no session at all sets no cookies", async () => {
  const response = await handlers().proxy(new Request(`${ORIGIN}/api/proxy/orders`));

  assert.equal(response.status, 401);
  assert.equal(cookiesOf(response).length, 0);
});

test("a refresh that fails because the gateway is down does not end the session", async () => {
  const unreachable = createSessionHandlers({ app: "shop", gatewayUrl: "http://127.0.0.1:9", isolated: true });

  const response = await unreachable.proxy(
    new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_rt: "r1" }) } }),
  );

  assert.equal(response.status, 502);
  assert.equal(cookiesOf(response).length, 0);     // a passing outage must not sign anyone out
});

test("a body is not sent twice: a change that gets a 401 is retried once, with its body", async () => {
  refreshTokens.set("r1", { access: accessToken("fresh"), next: "r2" });

  const response = await handlers().proxy(
    post("/api/proxy/orders", { items: [7] }, { cookie: cookieHeader({ tm_shop_at: accessToken("unknown"), tm_shop_rt: "r1" }) }),
  );

  assert.equal(response.status, 200);
  const sent = received.filter((r) => r.url === "/orders");
  assert.equal(sent.length, 2);
  assert.ok(sent.every((r) => JSON.parse(r.body).items[0] === 7));
});

test("many calls at once with an expired token cause exactly one refresh", async () => {
  refreshDelayMs = 30;
  refreshTokens.set("r1", { access: accessToken("fresh"), next: "r2" });
  const h = handlers();
  const request = () => new Request(`${ORIGIN}/api/proxy/orders`, { headers: { cookie: cookieHeader({ tm_shop_rt: "r1" }) } });

  const responses = await Promise.all([1, 2, 3, 4, 5, 6].map(() => h.proxy(request())));

  assert.ok(responses.every((r) => r.status === 200));
  assert.equal(received.filter((r) => r.url === "/users/refresh").length, 1);
});

test("the response's own headers come through, but set-cookie from the gateway does not", async () => {
  const response = await handlers().proxy(new Request(`${ORIGIN}/api/proxy/products`));

  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("set-cookie"), null);
});

// ── session ──────────────────────────────────────────────────────────────────────────────────

test("asking who is signed in answers with the user and never the token", async () => {
  const access = accessToken("me", 900, "Admin");

  const response = await handlers().session(
    new Request(`${ORIGIN}/api/session`, { headers: { cookie: cookieHeader({ tm_shop_at: access }) } }),
  );
  const body = await response.json();

  assert.deepEqual(body, { authenticated: true, user: { id: "user-me", email: "me@example.com", role: "Admin" } });
  assert.doesNotMatch(JSON.stringify(body), new RegExp(access.slice(0, 20)));
  assert.equal(received.length, 0);                                    // nothing needed the gateway
});

test("with no session, the answer is simply 'not signed in'", async () => {
  const response = await handlers().session(new Request(`${ORIGIN}/api/session`));

  assert.deepEqual(await response.json(), { authenticated: false });
  assert.equal(response.status, 200);
});

test("with an expired access token and a good refresh token, the session is renewed", async () => {
  refreshTokens.set("r1", { access: accessToken("renewed"), next: "r2" });

  const response = await handlers().session(
    new Request(`${ORIGIN}/api/session`, { headers: { cookie: cookieHeader({ tm_shop_at: accessToken("old", -60), tm_shop_rt: "r1" }) } }),
  );
  const body = await response.json();

  assert.equal(body.authenticated, true);
  assert.equal(body.user.id, "user-renewed");
  assert.equal(cookieValue(response, "tm_shop_rt"), "r2");
});

test("with an expired access token and a dead refresh token, the cookies are cleared", async () => {
  const response = await handlers().session(
    new Request(`${ORIGIN}/api/session`, { headers: { cookie: cookieHeader({ tm_shop_at: accessToken("old", -60), tm_shop_rt: "spent" }) } }),
  );

  assert.deepEqual(await response.json(), { authenticated: false });
  assert.ok(cookiesOf(response).some((c) => c.startsWith("tm_shop_rt=;") && /Max-Age=0/.test(c)));
});

test("another app's cookies are not this app's session", async () => {
  const access = accessToken("admin-session", 900, "Admin");

  const response = await handlers().session(
    new Request(`${ORIGIN}/api/session`, { headers: { cookie: cookieHeader({ tm_admin_at: access }) } }),
  );

  assert.deepEqual(await response.json(), { authenticated: false });
});

// ── logout ───────────────────────────────────────────────────────────────────────────────────

test("signing out ends the sign-in at the backend and clears both cookies", async () => {
  const response = await handlers().logout(
    post("/api/auth/logout", {}, { cookie: cookieHeader({ tm_shop_at: accessToken("a"), tm_shop_rt: "r1" }) }),
  );

  assert.equal(response.status, 204);
  const logout = received.find((r) => r.url === "/users/logout");
  assert.equal(JSON.parse(logout!.body).refreshToken, "r1");
  const cookies = cookiesOf(response);
  assert.ok(cookies.some((c) => c.startsWith("tm_shop_at=;")));
  assert.ok(cookies.some((c) => c.startsWith("tm_shop_rt=;")));
});

test("signing out with no session is quiet, and still clears", async () => {
  const response = await handlers().logout(post("/api/auth/logout", {}));

  assert.equal(response.status, 204);
  assert.equal(received.length, 0);
  assert.equal(cookiesOf(response).length, 2);
});

test("signing out from another origin is refused", async () => {
  const response = await handlers().logout(post("/api/auth/logout", {}, { origin: "https://evil.example", cookie: cookieHeader({ tm_shop_rt: "r1" }) }));

  assert.equal(response.status, 403);
  assert.equal(received.length, 0);
});

test("signing out still clears the cookies when the gateway cannot be reached", async () => {
  const unreachable = createSessionHandlers({ app: "shop", gatewayUrl: "http://127.0.0.1:9", isolated: true });

  const response = await unreachable.logout(post("/api/auth/logout", {}, { cookie: cookieHeader({ tm_shop_rt: "r1" }) }));

  assert.equal(response.status, 204);
  assert.equal(cookiesOf(response).length, 2);
});

test("handlers made for the same app share one refresh, even when created separately", async () => {
  refreshDelayMs = 30;
  refreshTokens.set("shared-r1", { access: accessToken("fresh"), next: "shared-r2" });
  // As when each route is bundled on its own: two handler sets, one server process.
  const first = createSessionHandlers({ app: "shared-test", gatewayUrl });
  const second = createSessionHandlers({ app: "shared-test", gatewayUrl });
  const withCookie = (path: string) => new Request(`${ORIGIN}${path}`, { headers: { cookie: cookieHeader({ "tm_shared-test_rt": "shared-r1" }) } });

  const [a, b] = await Promise.all([first.session(withCookie("/api/session")), second.proxy(withCookie("/api/proxy/orders"))]);

  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(received.filter((r) => r.url === "/users/refresh").length, 1);
});
