import assert from "node:assert/strict";
import { test } from "node:test";
import { readClaims, secondsUntilExpiry } from "./jwt.ts";

const ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function jwt(payload: object): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part(payload)}.signature`;
}

test("the claims the app shows are read from the token", () => {
  const token = jwt({ sub: "user-1", email: "a@example.com", exp: 2000, [ROLE]: "Admin" });

  assert.deepEqual(readClaims(token), { id: "user-1", email: "a@example.com", role: "Admin", exp: 2000 });
});

test("a token without a role is a customer", () => {
  assert.equal(readClaims(jwt({ sub: "user-1", email: "a@example.com", exp: 2000 }))?.role, "Customer");
});

test("anything that is not a token reads as nothing, never as a crash", () => {
  assert.equal(readClaims(undefined), null);
  assert.equal(readClaims(""), null);
  assert.equal(readClaims("not-a-jwt"), null);
  assert.equal(readClaims("a.b.c"), null);
  assert.equal(readClaims(jwt({ email: "no-subject@example.com", exp: 5 })), null);
});

test("the seconds left are counted from the expiry claim", () => {
  const token = jwt({ sub: "u", email: "e", exp: 1_000 });

  assert.equal(secondsUntilExpiry(token, 400_000), 600);
  assert.equal(secondsUntilExpiry(token, 1_000_000), 0);
  assert.equal(secondsUntilExpiry(token, 2_000_000), -1000);
  assert.equal(secondsUntilExpiry(undefined, 0), -Infinity);
});
