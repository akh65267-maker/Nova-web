import assert from "node:assert/strict";
import { test } from "node:test";
import { clientAddress, isSecureRequest, originAllowed } from "./request-checks.ts";

const post = (headers: Record<string, string>, url = "http://localhost:3100/api/proxy/orders") =>
  new Request(url, { method: "POST", headers });

test("a read is never a forgery risk", () => {
  assert.equal(originAllowed(new Request("http://localhost:3100/api/proxy/orders")), true);
  assert.equal(originAllowed(new Request("http://localhost:3100/api/proxy/orders", { method: "HEAD" })), true);
});

test("a change from the app's own origin is allowed", () => {
  assert.equal(originAllowed(post({ origin: "http://localhost:3100" })), true);
});

test("a change that names another origin is refused", () => {
  assert.equal(originAllowed(post({ origin: "https://evil.example" })), false);
  // Same host, different port: cookies are shared between ports, but this is not the app's origin.
  assert.equal(originAllowed(post({ origin: "http://localhost:3200" })), false);
});

test("a change that names no origin is refused", () => {
  assert.equal(originAllowed(post({})), false);
});

test("an origin that is not even a URL is refused, not a crash", () => {
  assert.equal(originAllowed(post({ origin: "null" })), false);
  assert.equal(originAllowed(post({ origin: "not a url" })), false);
});

test("behind a proxy the origin is compared with the host the browser used", () => {
  const request = post({ origin: "https://shop.example.com", "x-forwarded-host": "shop.example.com", host: "internal:3000" }, "http://internal:3000/api/proxy/orders");
  assert.equal(originAllowed(request), true);
  assert.equal(
    originAllowed(post({ origin: "https://evil.example", "x-forwarded-host": "shop.example.com" }, "http://internal:3000/api/proxy/orders")),
    false,
  );
});

test("the client address is the last entry of X-Forwarded-For, the one the trusted proxy added", () => {
  assert.equal(clientAddress(new Headers({ "x-forwarded-for": "203.0.113.9" })), "203.0.113.9");
  // The client sent 6.6.6.6; the proxy appended what it really saw.
  assert.equal(clientAddress(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })), "203.0.113.9");
  assert.equal(clientAddress(new Headers()), undefined);
  assert.equal(clientAddress(new Headers({ "x-forwarded-for": "  " })), undefined);
});

test("https is recognised directly and through a proxy", () => {
  assert.equal(isSecureRequest(new Request("https://shop.example.com/x")), true);
  assert.equal(isSecureRequest(new Request("http://internal:3000/x", { headers: { "x-forwarded-proto": "https" } })), true);
  assert.equal(isSecureRequest(new Request("http://localhost:3100/x")), false);
});
