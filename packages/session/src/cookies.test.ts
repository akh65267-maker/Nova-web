import assert from "node:assert/strict";
import { test } from "node:test";
import { clearCookie, cookieNames, parseCookies, serializeCookie } from "./cookies.ts";

test("each app gets its own cookie names, because cookies ignore ports", () => {
  assert.deepEqual(cookieNames("shop"), { access: "tm_shop_at", refresh: "tm_shop_rt" });
  assert.deepEqual(cookieNames("admin"), { access: "tm_admin_at", refresh: "tm_admin_rt" });
  assert.notEqual(cookieNames("shop").access, cookieNames("admin").access);
});

test("parsing reads every cookie of a header, and tolerates none", () => {
  const cookies = parseCookies("a=1; tm_shop_at=abc.def-ghi_jkl; b=two%20words");
  assert.equal(cookies.get("a"), "1");
  assert.equal(cookies.get("tm_shop_at"), "abc.def-ghi_jkl");
  assert.equal(cookies.get("b"), "two words");
  assert.equal(parseCookies(null).size, 0);
  assert.equal(parseCookies("").size, 0);
});

test("a session cookie can never be read by a script, or sent from another site", () => {
  const cookie = serializeCookie("tm_shop_at", "token-value", { maxAgeSeconds: 900, secure: false });

  assert.match(cookie, /^tm_shop_at=token-value;/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Path=\/api(;|$)/);       // sent to the app's own API routes only, not on every page load
  assert.match(cookie, /; Max-Age=900/);
  assert.doesNotMatch(cookie, /Secure/);           // plain http (local development) could not store a Secure cookie
});

test("the cookie is Secure whenever the request was over https", () => {
  assert.match(serializeCookie("n", "v", { maxAgeSeconds: 60, secure: true }), /; Secure/);
});

test("a negative or fractional lifetime becomes a whole, non-negative number of seconds", () => {
  assert.match(serializeCookie("n", "v", { maxAgeSeconds: 899.7, secure: false }), /Max-Age=899(;|$)/);
  assert.match(serializeCookie("n", "v", { maxAgeSeconds: -5, secure: false }), /Max-Age=0(;|$)/);
});

test("clearing sets the same name and path to expire at once", () => {
  const cookie = clearCookie("tm_shop_at", false);

  assert.match(cookie, /^tm_shop_at=;/);
  assert.match(cookie, /; Max-Age=0/);
  assert.match(cookie, /; Path=\/api/);     // it only clears the cookie it set if the path matches
  assert.match(cookie, /; HttpOnly/);
});
