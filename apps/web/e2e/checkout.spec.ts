import { expect, test, type APIRequestContext } from "@playwright/test";

// Same resolution as src/lib/api-client.ts, so the test checks the gateway the
// app is actually configured to call rather than one it assumes.
const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Exact stock is for administrators only. The tests that need it read it with the administrator
// account from the environment (the same ADMIN_EMAIL / ADMIN_PASSWORD the admin app's tests use);
// without one they still run, and skip only the "stock really moved" check.
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

type Product = { id: string; name: string; price: number };

/**
 * Picks a real product that can actually be bought, through the public endpoints, instead of
 * depending on fixed seed data. Requires a catalog entry whose public availability is not
 * "OutOfStock"; a non-zero price rules out placeholder rows.
 */
async function findPurchasableProduct(request: APIRequestContext): Promise<Product> {
  const productsResponse = await request.get(`${apiURL}/products?pageSize=100`);
  expect(productsResponse.ok(), "GET /products through the gateway").toBeTruthy();
  const { items } = (await productsResponse.json()) as { items: Product[] };

  let product: Product | undefined;
  for (const candidate of items.filter((p) => p.price > 0)) {
    const response = await request.get(`${apiURL}/inventory/${candidate.id}`);
    if (!response.ok()) continue;
    const { availability } = (await response.json()) as { availability: string };
    if (availability !== "OutOfStock") {
      product = candidate;
      break;
    }
  }

  // Locally an empty catalog just skips these tests. In CI it is a failure: the backend there
  // is started with a seeded product, and a skipped checkout test would pass for nothing.
  if (process.env.CI) {
    expect(product, "CI's backend should have a seeded product with stock").toBeTruthy();
  } else {
    test.skip(!product, "No product with price > 0 and stock available - seed one to run checkout");
  }
  return product!;
}

// The exact quantity, which only an administrator may read; null when no administrator is configured.
async function exactQuantity(request: APIRequestContext, productId: string): Promise<number | null> {
  if (!adminEmail || !adminPassword) {
    // In CI the administrator exists, and the stock check must not be skipped silently.
    expect(process.env.CI, "CI should provide ADMIN_EMAIL and ADMIN_PASSWORD").toBeFalsy();
    return null;
  }
  const login = await request.post(`${apiURL}/users/login`, { data: { email: adminEmail, password: adminPassword } });
  expect(login.ok(), "signing in as the administrator").toBeTruthy();
  const { token } = (await login.json()) as { token: string };

  const response = await request.get(`${apiURL}/inventory/${productId}/quantity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), "reading exact stock as the administrator").toBeTruthy();
  return ((await response.json()) as { quantityAvailable: number }).quantityAvailable;
}

test("catalog loads products from the backend", async ({ page }) => {
  // Guards the frontend<->gateway wiring. A wrong NEXT_PUBLIC_API_URL leaves
  // this page on loading skeletons forever with no visible error, so assert on
  // the count text that only renders once the API has actually answered.
  await page.goto("/products");
  await expect(page.getByText(/^\d+ products?$/)).toBeVisible();
});

test("a new customer can check out and the order is confirmed", async ({ page, request }) => {
  const product = await findPurchasableProduct(request);
  const stockBefore = await exactQuantity(request, product.id);

  // A fresh account per run: no stored credentials, and no state shared with
  // earlier runs. Registration signs in and lands on /account.
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Customer");
  await page.getByLabel("Email").fill(`e2e+${runId}@example.com`);
  await page.getByLabel("Password").fill(`E2e-${runId}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto(`/products/${product.id}`);
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();

  await page.goto("/checkout");
  await expect(page.getByText("Review your order")).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();

  // The order is created Pending and resolved asynchronously by the saga in
  // OrderService; the detail page polls until it leaves Pending. Healthy
  // checkouts resolve in about a second, so a timeout here means the saga
  // stalled or cancelled - check the reason text on the failure screenshot.
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible({ timeout: 30_000 });

  // The UI saying Confirmed is not enough on its own: prove the reservation
  // really reached InventoryService by checking the stock moved.
  if (stockBefore !== null) {
    expect(await exactQuantity(request, product.id)).toBe(stockBefore - 1);
  }
});

test("signing out empties the cart", async ({ page, request }) => {
  // The cart lives in the browser, separately from the session. Signing out used to clear only
  // the session, so the next person on the same browser opened the previous person's cart.
  const product = await findPurchasableProduct(request);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Customer");
  await page.getByLabel("Email").fill(`e2e+${runId}@example.com`);
  await page.getByLabel("Password").fill(`E2e-${runId}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto(`/products/${product.id}`);
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();

  // The cart really holds it before signing out.
  await page.getByRole("button", { name: /^Cart\b/ }).click();
  await expect(page.getByRole("dialog").getByText(product.name)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  // The session is in cookies now: signing out must clear them.
  await expect.poll(async () => (await page.context().cookies()).filter((c) => c.name.startsWith("tm_shop_")).length).toBe(0);

  await page.getByRole("button", { name: /^Cart\b/ }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();

  // And it stays empty: nothing is left in storage for a reload to bring back.
  await page.reload();
  await page.getByRole("button", { name: /^Cart\b/ }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("a session the gateway rejects signs the user out but keeps the cart", async ({ page, request }) => {
  // The other half of "signing out empties the cart": when the session simply ends (the gateway
  // answers 401 and there is no refresh token to renew it), the person did not choose to leave,
  // so their cart must survive.
  const product = await findPurchasableProduct(request);

  // Well-formed and not expired, so the app believes it is signed in, but not signed by us.
  const payload = Buffer.from(
    JSON.stringify({ sub: "00000000-0000-0000-0000-000000000000", email: "x@example.com", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const rejectedToken = `e30.${payload}.not-a-real-signature`;

  await page.context().addCookies([
    { name: "tm_shop_at", value: rejectedToken, domain: "localhost", path: "/api", httpOnly: true, sameSite: "Lax" },
  ]);
  await page.addInitScript((item) => {
    // Seed once: the redirect to /login loads a new page and would otherwise seed it again.
    if (localStorage.getItem("seeded")) return;
    localStorage.setItem("seeded", "1");
    localStorage.setItem("tm-cart", JSON.stringify({ state: { items: [item] }, version: 0 }));
  }, { productId: product.id, name: product.name, price: product.price, quantity: 1 });

  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);

  const cartLines = await page.evaluate(() => JSON.parse(localStorage.getItem("tm-cart") ?? "{}").state?.items?.length ?? 0);
  const sessionCookies = (await page.context().cookies()).filter((c) => c.name.startsWith("tm_shop_"));
  expect(sessionCookies, "the rejected session is gone").toHaveLength(0);
  expect(cartLines, "the cart is still there").toBe(1);
});
