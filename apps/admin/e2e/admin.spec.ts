import { expect, test, type APIRequestContext } from "@playwright/test";

const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// The admin tests that need a real administrator read the account from the environment, so no
// credential is written in this repository. Run them with ADMIN_EMAIL and ADMIN_PASSWORD set (the
// same variables deploy/.env in the backend repo uses); without them those tests are skipped.
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

// An order to look at, made the way a customer would (through the API): a throwaway customer
// buys one unit of a product that can be bought, and the call returns once the order has left
// Pending. Without it the Orders test would depend on whatever the database happens to hold.
async function placeConfirmedOrder(request: APIRequestContext): Promise<string> {
  const { items } = (await (await request.get(`${apiURL}/products?pageSize=100`)).json()) as {
    items: { id: string; price: number }[];
  };
  const inventory = (await (await request.get(`${apiURL}/inventory`)).json()) as {
    productId: string;
    quantityAvailable: number;
  }[];
  const stock = new Map(inventory.map((i) => [i.productId, i.quantityAvailable]));
  const product = items.find((p) => p.price > 0 && (stock.get(p.id) ?? 0) > 0);
  expect(product, "a product with a price and stock to order").toBeTruthy();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-admin-orders+${runId}@example.com`;
  const password = `E2e-${runId}`;
  const registered = await request.post(`${apiURL}/users`, { data: { email, password, displayName: "E2E Orderer" } });
  expect(registered.ok(), "registering a throwaway customer").toBeTruthy();
  const login = await request.post(`${apiURL}/users/login`, { data: { email, password } });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };

  const created = await request.post(`${apiURL}/orders`, {
    headers,
    data: { items: [{ productId: product!.id, quantity: 1, unitPrice: product!.price }] },
  });
  expect(created.status(), "placing the order").toBe(201);
  const { id } = (await created.json()) as { id: string };

  await expect
    .poll(
      async () => ((await (await request.get(`${apiURL}/orders/${id}`, { headers })).json()) as { status: string }).status,
      { timeout: 30_000 },
    )
    .not.toBe("Pending");
  return id;
}

test("an anonymous visitor is sent to the sign-in page", async ({ page }) => {
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fproducts/);
  await expect(page.getByText("Admin sign in")).toBeVisible();
});

test("a customer account is refused, and is not left signed in", async ({ page, request }) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-admin-check+${runId}@example.com`;
  const password = `E2e-${runId}`;
  const registered = await request.post(`${apiURL}/users`, {
    data: { email, password, displayName: "E2E Customer" },
  });
  expect(registered.ok(), "registering a throwaway customer").toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("That account is not an administrator.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // Nothing of that session is kept, and the console stays closed.
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem("tm-auth") ?? "{}").state?.token ?? null);
  expect(token).toBeNull();
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login/);
});

test("an administrator signs in, sees the products and signs out", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL and ADMIN_PASSWORD to run the administrator flow");

  await page.goto("/products");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Back where they were headed, with real data from the backend.
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "Manage products" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New product" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login/);
});

test("an administrator sees the dashboard figures and can change the period", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL and ADMIN_PASSWORD to run the administrator flow");

  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Signing in without a destination lands on the dashboard.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  for (const title of ["Orders", "Revenue", "Average order value", "Cancellation rate"]) {
    // The card titles only: "Orders" is also the sidebar link.
    await expect(page.locator("[data-slot=card-title]").filter({ hasText: new RegExp(`^${title}$`) })).toBeVisible();
  }
  await expect(page.getByText("(UTC)")).toBeVisible();

  const thirty = page.getByRole("button", { name: "30 days" });
  await thirty.click();
  await expect(thirty).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Revenue excludes tax, shipping")).toBeVisible();

  // The rest of the dashboard: each panel shows data or its own empty state, never a stuck skeleton.
  for (const heading of ["Orders per day", "Revenue per day", "Why orders were cancelled", "Stuck in Pending", "Low stock"]) {
    await expect(page.getByText(heading, { exact: true })).toBeVisible();
  }
  await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0);
});

test("an administrator browses orders, filters them and opens one", async ({ page, request }) => {
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL and ADMIN_PASSWORD to run the administrator flow");

  const orderId = await placeConfirmedOrder(request);

  await page.goto("/login?redirect=%2Forders");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();

  // Filtering to one status leaves only that status in the table.
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmed", exact: true })).toHaveAttribute("aria-pressed", "true");
  const badges = page.getByRole("table").locator("tbody tr td:nth-child(3)");
  await expect(badges.first()).toContainText("Confirmed");
  for (const text of await badges.allTextContents()) expect(text).toContain("Confirmed");

  // The order just placed is in the list (the newest, so on the first page). Open it: its
  // lines and the customer who placed it.
  await page.locator(`tbody tr a[href="/orders/${orderId}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
  await expect(page.getByText("Items", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Orderer")).toBeVisible();
  await expect(page.getByText("Customer", { exact: true })).toBeVisible();

  // An id that does not exist says so instead of failing.
  await page.goto("/orders/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("Order not found")).toBeVisible();
});
