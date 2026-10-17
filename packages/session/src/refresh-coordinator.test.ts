import assert from "node:assert/strict";
import { test } from "node:test";
import { RefreshCoordinator, type RefreshOutcome } from "./refresh-coordinator.ts";

const pair = (n: number): RefreshOutcome => ({
  ok: true,
  pair: { token: `access-${n}`, expiresAtUtc: "2026-10-18T12:15:00Z", refreshToken: `refresh-${n}`, refreshExpiresAtUtc: "2026-11-01T12:00:00Z" },
});

test("requests that arrive together share one refresh", async () => {
  let calls = 0;
  const coordinator = new RefreshCoordinator(async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return pair(1);
  });

  const results = await Promise.all([1, 2, 3, 4, 5].map(() => coordinator.refresh("old", undefined)));

  // The backend spends a refresh token once; five parallel requests must not present it five times.
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.ok && r.pair.refreshToken === "refresh-1"));
});

test("a request that arrives just after still gets the new pair, not a second refresh", async () => {
  let calls = 0;
  let now = 1_000;
  const coordinator = new RefreshCoordinator(async () => { calls++; return pair(calls); }, () => now);

  await coordinator.refresh("old", undefined);
  now += 3_000;                       // its cookie still holds "old" for a moment
  const late = await coordinator.refresh("old", undefined);

  assert.equal(calls, 1);
  assert.ok(late.ok && late.pair.refreshToken === "refresh-1");
});

test("after the window the same token is presented to the backend again", async () => {
  let calls = 0;
  let now = 1_000;
  const coordinator = new RefreshCoordinator(async () => { calls++; return { ok: false, status: 401 }; }, () => now);

  await coordinator.refresh("old", undefined);
  now += 60_000;
  await coordinator.refresh("old", undefined);

  assert.equal(calls, 2);
});

test("a failed refresh is not remembered as a success", async () => {
  let calls = 0;
  const coordinator = new RefreshCoordinator(async () => {
    calls++;
    return calls === 1 ? { ok: false, status: 503 } : pair(2);
  });

  const first = await coordinator.refresh("old", undefined);
  const second = await coordinator.refresh("old", undefined);

  assert.equal(first.ok, false);
  assert.equal(second.ok, true);
  assert.equal(calls, 2);
});

test("different tokens are different sign-ins and never share a result", async () => {
  const coordinator = new RefreshCoordinator(async (token) => pair(token === "a" ? 1 : 2));

  const [a, b] = await Promise.all([coordinator.refresh("a", undefined), coordinator.refresh("b", undefined)]);

  assert.ok(a.ok && b.ok && a.pair.refreshToken !== b.pair.refreshToken);
});

test("the caller's address is passed on to the backend", async () => {
  let seen: string | undefined;
  const coordinator = new RefreshCoordinator(async (_token, address) => { seen = address; return pair(1); });

  await coordinator.refresh("old", "203.0.113.9");

  assert.equal(seen, "203.0.113.9");
});
