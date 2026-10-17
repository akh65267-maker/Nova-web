import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The admin's session lives in HttpOnly cookies set by its own server routes, and only an
// administrator can have one. These tests check what a browser can and cannot see of it, that the
// admin and the shop keep separate sessions on one host, and that the server keeps the session
// alive and ends it for real.
const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const shopURL = process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3100";
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const sessionCookies = async (context: BrowserContext, prefix: string) =>
  (await context.cookies()).filter((c) => c.name.startsWith(prefix));

const cookieValue = async (context: BrowserContext, name: string) =>
  (await context.cookies()).find((c) => c.name === name)?.value;

test.beforeEach(() => {
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL and ADMIN_PASSWORD to run the administrator flow");
});

test("signing in puts the session in HttpOnly cookies and no token anywhere a script can read", async ({ page, context }) => {
  await signInAsAdmin(page);

  const cookies = await sessionCookies(context, "tm_admin_");
  expect(cookies.map((c) => c.name).sort()).toEqual(["tm_admin_at", "tm_admin_rt"]);
  for (const cookie of cookies) {
    expect(cookie.httpOnly, `${cookie.name} is HttpOnly`).toBe(true);
    expect(cookie.sameSite, `${cookie.name} is SameSite=Lax`).toBe("Lax");
    expect(cookie.path, `${cookie.name} is only sent to the app's API routes`).toBe("/api");
  }

  const readable = await page.evaluate(() => ({
    cookie: document.cookie,
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }));
  const refreshToken = (await cookieValue(context, "tm_admin_rt"))!;
  const accessToken = (await cookieValue(context, "tm_admin_at"))!;
  for (const [where, text] of Object.entries(readable)) {
    expect(text, `${where} holds no access token`).not.toContain(accessToken);
    expect(text, `${where} holds no refresh token`).not.toContain(refreshToken);
    expect(text, `${where} holds nothing shaped like a JWT`).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\./);
  }
});

test("the session survives a reload", async ({ page }) => {
  await signInAsAdmin(page);

  await page.reload();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("an expired access token is renewed quietly, and the refresh token is replaced", async ({ page, context }) => {
  await signInAsAdmin(page);
  const refreshBefore = (await cookieValue(context, "tm_admin_rt"))!;

  const kept = (await context.cookies()).filter((c) => c.name !== "tm_admin_at");
  await context.clearCookies();
  await context.addCookies(kept);
  expect(await cookieValue(context, "tm_admin_at")).toBeUndefined();

  await page.goto("/orders");
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  expect(await cookieValue(context, "tm_admin_at"), "a new access token was issued").toBeTruthy();
  const refreshAfter = await cookieValue(context, "tm_admin_rt");
  expect(refreshAfter, "the refresh token was rotated").toBeTruthy();
  expect(refreshAfter).not.toBe(refreshBefore);
});

test("signing out really ends the sign-in: the refresh token stops working at the backend", async ({ page, context, request }) => {
  await signInAsAdmin(page);
  const refreshToken = (await cookieValue(context, "tm_admin_rt"))!;

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect.poll(async () => (await sessionCookies(context, "tm_admin_")).length).toBe(0);

  const response = await request.post(`${apiURL}/users/refresh`, { data: { refreshToken } });
  expect(response.status()).toBe(401);
});

test("a customer is refused by the server itself: no cookie, and the sign-in it made is revoked", async ({ page, context, request }) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-admin-refused+${runId}@example.com`;
  const password = `E2e-${runId}`;
  expect((await request.post(`${apiURL}/users`, { data: { email, password, displayName: "E2E Customer" } })).ok()).toBeTruthy();

  // Straight to the admin's login route, as a script (not the page) would.
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
    headers: { origin: "http://localhost:3200" },
  });

  expect(response.status()).toBe(403);
  expect(await sessionCookies(context, "tm_admin_")).toHaveLength(0);
  expect(JSON.stringify(await response.json())).not.toMatch(/eyJ/);
});

test("a request that names another origin is refused, and changes nothing", async ({ page }) => {
  await signInAsAdmin(page);

  const forged = await page.request.post("/api/proxy/products", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { name: "x", description: "x", price: 1, category: "Electronics" },
  });
  expect(forged.status()).toBe(403);

  const signOutForged = await page.request.post("/api/auth/logout", { headers: { origin: "https://evil.example" } });
  expect(signOutForged.status()).toBe(403);

  const session = await (await page.request.get("/api/session")).json();
  expect(session.authenticated).toBe(true);
});

test("the admin and the shop keep separate sessions on one host", async ({ page, context, request }) => {
  // Cookies ignore ports, so the shop (3100), the admin (3200) and the gateway share them on
  // localhost. Only the names keep the two sessions apart.
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-both+${runId}@example.com`;
  const password = `E2e-${runId}`;
  expect((await request.post(`${apiURL}/users`, { data: { email, password, displayName: "E2E Both" } })).ok()).toBeTruthy();

  // Sign in to the SHOP as a customer.
  await page.goto(`${shopURL}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  // The form's button: the shop's header also has a "Sign in" icon button.
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  expect((await sessionCookies(context, "tm_shop_")).length).toBe(2);

  // The admin does not see that session...
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  // ...and signing in to the admin as an administrator leaves the shop's customer as they were.
  await signInAsAdmin(page);
  expect((await sessionCookies(context, "tm_admin_")).length).toBe(2);
  const shopSession = await (await page.request.get(`${shopURL}/api/session`)).json();
  expect(shopSession.authenticated).toBe(true);
  expect(shopSession.user.role).toBe("Customer");
  expect(shopSession.user.email).toBe(email);

  // And the other way: the admin's session is not the shop's.
  const adminSession = await (await page.request.get("/api/session")).json();
  expect(adminSession.user.role).toBe("Admin");
});
