import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The shop's session lives in HttpOnly cookies set by its own server routes. These tests check
// what a browser can and cannot see of it, and that the server keeps the session alive and ends
// it for real.
const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function register(page: Page): Promise<void> {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Session");
  await page.getByLabel("Email").fill(`e2e-session+${runId}@example.com`);
  await page.getByLabel("Password").fill(`E2e-${runId}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

const sessionCookies = async (context: BrowserContext) =>
  (await context.cookies()).filter((c) => c.name.startsWith("tm_shop_"));

const cookieValue = async (context: BrowserContext, name: string) =>
  (await sessionCookies(context)).find((c) => c.name === name)?.value;

test("signing in puts the session in HttpOnly cookies and no token anywhere a script can read", async ({ page, context }) => {
  await register(page);

  const cookies = await sessionCookies(context);
  expect(cookies.map((c) => c.name).sort()).toEqual(["tm_shop_at", "tm_shop_rt"]);
  for (const cookie of cookies) {
    expect(cookie.httpOnly, `${cookie.name} is HttpOnly`).toBe(true);
    expect(cookie.sameSite, `${cookie.name} is SameSite=Lax`).toBe("Lax");
    expect(cookie.path, `${cookie.name} is only sent to the app's API routes`).toBe("/api");
  }

  // Everything a script on the page can read: cookies, localStorage, sessionStorage.
  const readable = await page.evaluate(() => ({
    cookie: document.cookie,
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }));
  const refreshToken = (await cookieValue(context, "tm_shop_rt"))!;
  const accessToken = (await cookieValue(context, "tm_shop_at"))!;
  for (const [where, text] of Object.entries(readable)) {
    expect(text, `${where} holds no access token`).not.toContain(accessToken);
    expect(text, `${where} holds no refresh token`).not.toContain(refreshToken);
    expect(text, `${where} holds nothing shaped like a JWT`).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\./);
  }
});

test("the session survives a reload, because the server knows who is signed in", async ({ page }) => {
  await register(page);

  await page.reload();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Your account")).toBeVisible();
});

test("an expired access token is renewed quietly, and the refresh token is replaced", async ({ page, context }) => {
  await register(page);
  const refreshBefore = (await cookieValue(context, "tm_shop_rt"))!;

  // Lose the access cookie, as happens when its short life runs out.
  const kept = (await context.cookies()).filter((c) => c.name !== "tm_shop_at");
  await context.clearCookies();
  await context.addCookies(kept);
  expect(await cookieValue(context, "tm_shop_at")).toBeUndefined();

  // A page that needs the session still works...
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();

  // ...because the server used the refresh token, which it spent and replaced.
  expect(await cookieValue(context, "tm_shop_at"), "a new access token was issued").toBeTruthy();
  const refreshAfter = await cookieValue(context, "tm_shop_rt");
  expect(refreshAfter, "the refresh token was rotated").toBeTruthy();
  expect(refreshAfter).not.toBe(refreshBefore);
});

test("signing out really ends the sign-in: the refresh token stops working at the backend", async ({ page, context, request }) => {
  await register(page);
  const refreshToken = (await cookieValue(context, "tm_shop_rt"))!;

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect.poll(async () => (await sessionCookies(context)).length).toBe(0);

  // Straight to the gateway with the token the browser had: refused, not merely forgotten.
  const response = await request.post(`${apiURL}/users/refresh`, { data: { refreshToken } });
  expect(response.status()).toBe(401);
});

test("a request that names another origin is refused, and changes nothing", async ({ page }) => {
  await register(page);

  // The browser context's own request client sends the session cookies, as a browser would for a
  // request another site caused; the foreign Origin is what such a request carries.
  const forged = await page.request.post("/api/proxy/orders", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { items: [] },
  });
  expect(forged.status()).toBe(403);

  const signOutForged = await page.request.post("/api/auth/logout", { headers: { origin: "https://evil.example" } });
  expect(signOutForged.status()).toBe(403);

  // The session is untouched.
  const session = await (await page.request.get("/api/session")).json();
  expect(session.authenticated).toBe(true);
});

test("the session endpoint says who is signed in and never hands out a token", async ({ page }) => {
  await register(page);

  const body = await (await page.request.get("/api/session")).json();

  expect(Object.keys(body).sort()).toEqual(["authenticated", "user"]);
  expect(Object.keys(body.user).sort()).toEqual(["email", "id", "role"]);
  expect(body.user.role).toBe("Customer");
});
