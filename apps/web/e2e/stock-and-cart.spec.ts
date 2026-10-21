import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// The header's cart button: its name is Cart, with the count in front once the cart has items.
const CART_BUTTON = /^(\d+ )?Cart$/;

const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Product = { id: string; name: string; price: number };

async function listProducts(request: APIRequestContext): Promise<Product[]> {
  const response = await request.get(`${apiURL}/products?pageSize=100`);
  expect(response.ok(), "GET /products through the gateway").toBeTruthy();
  return ((await response.json()) as { items: Product[] }).items;
}

// What the shop itself treats as buyable: stock on record and not "OutOfStock".
async function canBeBought(request: APIRequestContext, product: Product): Promise<boolean> {
  const response = await request.get(`${apiURL}/inventory/${product.id}`);
  if (!response.ok()) return false;
  return ((await response.json()) as { availability: string }).availability !== "OutOfStock";
}

function card(page: Page, product: Product) {
  // The card is the nearest ancestor carrying the "group" class that holds the product's name.
  return page.getByText(product.name, { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"group")][1]');
}

async function register(page: Page, runId: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Customer");
  await page.getByLabel("Email").fill(`e2e+${runId}@example.com`);
  await page.getByLabel("Password").fill(`E2e-${runId}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test("a product card offers Add to cart only for what can be bought, and asks for stock in one batch", async ({ page, request }) => {
  const products = await listProducts(request);
  const bought: Product[] = [];
  const gone: Product[] = [];
  for (const product of products.slice(0, 12)) (await canBeBought(request, product) ? bought : gone).push(product);
  test.skip(bought.length === 0 || gone.length === 0, "needs one product that can be bought and one that cannot");

  const singleLookups: string[] = [];
  const batches: string[] = [];
  page.on("request", (r) => {
    const { pathname } = new URL(r.url());
    if (/\/inventory\/availability$/.test(pathname)) batches.push(r.url());
    else if (/\/inventory\/[0-9a-f-]{36}$/.test(pathname)) singleLookups.push(r.url());
  });

  await page.goto("/products");
  await expect(page.getByText(/^\d+ products?$/)).toBeVisible();

  const unavailable = card(page, gone[0]);
  await expect(unavailable.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  await expect(card(page, bought[0]).getByRole("button", { name: "Add to cart" })).toBeEnabled();

  expect(singleLookups, "a grid must not ask for each product's stock separately").toEqual([]);
  expect(batches.length, "the grid's stock lookups go out as batches").toBeGreaterThan(0);
});

test("a signed-in cart follows the customer to another browser", async ({ page, browser, request }) => {
  const products = await listProducts(request);
  let product: Product | undefined;
  for (const candidate of products.filter((p) => p.price > 0)) {
    if (await canBeBought(request, candidate)) {
      product = candidate;
      break;
    }
  }
  test.skip(!product, "needs a product that can be bought");

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await register(page, runId);

  await page.goto(`/products/${product!.id}`);
  const saved = page.waitForResponse((r) => r.url().endsWith("/basket") && r.request().method() === "PUT" && r.ok());
  await page.getByRole("button", { name: "Add to cart" }).click();
  await saved;

  // A second browser knows nothing of the first one's storage: only the saved basket can bring the cart over.
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await second.goto("/login");
    await second.getByLabel("Email").fill(`e2e+${runId}@example.com`);
    await second.getByLabel("Password").fill(`E2e-${runId}`);
    await second.getByRole("main").getByRole("button", { name: "Sign in" }).click();
    await expect(second).not.toHaveURL(/\/login/);

    await second.getByRole("button", { name: CART_BUTTON }).click();
    await expect(second.getByText(product!.name).first()).toBeVisible();
  } finally {
    await other.close();
  }
});
