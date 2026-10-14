import { expect, test, type APIRequestContext } from "@playwright/test";

// Same resolution as src/lib/api-client.ts, so the test checks the gateway the
// app is actually configured to call rather than one it assumes.
const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Product = { id: string; name: string; price: number };
type InventoryItem = { productId: string; quantityAvailable: number };

/**
 * Picks a real product that can actually be bought, via the public endpoints,
 * instead of depending on fixed seed data. Requires a catalog entry and an
 * inventory record with stock; a non-zero price rules out placeholder rows.
 */
async function findPurchasableProduct(request: APIRequestContext): Promise<Product> {
  const productsResponse = await request.get(`${apiURL}/products?pageSize=100`);
  expect(productsResponse.ok(), "GET /products through the gateway").toBeTruthy();
  const { items } = (await productsResponse.json()) as { items: Product[] };

  const inventoryResponse = await request.get(`${apiURL}/inventory`);
  expect(inventoryResponse.ok(), "GET /inventory through the gateway").toBeTruthy();
  const inventory = (await inventoryResponse.json()) as InventoryItem[];

  const stock = new Map(inventory.map((i) => [i.productId, i.quantityAvailable]));
  const product = items.find((p) => p.price > 0 && (stock.get(p.id) ?? 0) > 0);

  // Locally an empty catalog just skips these tests. In CI it is a failure: the backend there
  // is started with a seeded product, and a skipped checkout test would pass for nothing.
  if (process.env.CI) {
    expect(product, "CI's backend should have a seeded product with stock").toBeTruthy();
  } else {
    test.skip(!product, "No product with price > 0 and stock available - seed one to run checkout");
  }
  return product!;
}

async function quantityAvailable(request: APIRequestContext, productId: string): Promise<number> {
  const response = await request.get(`${apiURL}/inventory/${productId}`);
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as InventoryItem).quantityAvailable;
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
  const stockBefore = await quantityAvailable(request, product.id);

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
  expect(await quantityAvailable(request, product.id)).toBe(stockBefore - 1);
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
  await page.getByRole("button", { name: "Cart" }).click();
  await expect(page.getByRole("dialog").getByText(product.name)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("tm-auth");
    return !stored || !JSON.parse(stored).state?.token;
  });

  await page.getByRole("button", { name: "Cart" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();

  // And it stays empty: nothing is left in storage for a reload to bring back.
  await page.reload();
  await page.getByRole("button", { name: "Cart" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("a token the gateway rejects signs the user out but keeps the cart", async ({ page, request }) => {
  // The other half of "signing out empties the cart": when the session simply ends (the gateway
  // answers 401), the person did not choose to leave, so their cart must survive.
  const product = await findPurchasableProduct(request);

  // Well-formed and not expired, so the app believes it is signed in, but not signed by us.
  const payload = Buffer.from(
    JSON.stringify({ sub: "00000000-0000-0000-0000-000000000000", email: "x@example.com", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const rejectedToken = `e30.${payload}.not-a-real-signature`;

  await page.addInitScript(
    ([token, item]) => {
      // Seed once: the redirect to /login loads a new page and would otherwise seed it again.
      if (localStorage.getItem("seeded")) return;
      localStorage.setItem("seeded", "1");
      localStorage.setItem("tm-auth", JSON.stringify({ state: { token, expiresAtUtc: new Date(Date.now() + 3600e3).toISOString() }, version: 0 }));
      localStorage.setItem("tm-cart", JSON.stringify({ state: { items: [item] }, version: 0 }));
    },
    [rejectedToken, { productId: product.id, name: product.name, price: product.price, quantity: 1 }] as const,
  );

  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);

  const stored = await page.evaluate(() => ({
    token: JSON.parse(localStorage.getItem("tm-auth") ?? "{}").state?.token ?? null,
    cartLines: JSON.parse(localStorage.getItem("tm-cart") ?? "{}").state?.items?.length ?? 0,
  }));
  expect(stored.token, "the rejected session is gone").toBeNull();
  expect(stored.cartLines, "the cart is still there").toBe(1);
});
