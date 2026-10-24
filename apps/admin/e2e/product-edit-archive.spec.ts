import { expect, test, type Page } from "@playwright/test";

const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const shopURL = process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3100";
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

async function signInToAdmin(page: Page) {
  await page.goto("/login?redirect=%2Fproducts");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Products", exact: true })).toBeVisible();
}

test("an administrator edits a product, takes it off sale, and brings it back", async ({ page, request }) => {
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL and ADMIN_PASSWORD to run the administrator flow");

  // A product of its own, so the test depends on nothing already in the catalog.
  const login = await request.post(`${apiURL}/users/login`, { data: { email: adminEmail, password: adminPassword } });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const name = `Edit ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const created = await request.post(`${apiURL}/products`, {
    headers,
    data: { name, description: "Before the edit.", price: 10, category: "Electronics" },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  const inShop = async () => (await request.get(`${apiURL}/products/${id}`)).status();

  await signInToAdmin(page);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();

  // Edit: the new name and price show in the list, and the shop serves them.
  const renamed = `${name} renamed`;
  await row.getByRole("button", { name: `Edit ${name}` }).click();
  await page.getByLabel("Name", { exact: true }).fill(renamed);
  await page.getByLabel("Price", { exact: true }).fill("12.5");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(`${renamed} updated`)).toBeVisible();
  const renamedRow = page.getByRole("row").filter({ hasText: renamed });
  await expect(renamedRow).toContainText("$12.50");
  const shown = (await (await request.get(`${apiURL}/products/${id}`)).json()) as { name: string; price: number };
  expect(shown).toMatchObject({ name: renamed, price: 12.5 });

  // Archive: off sale in the shop (not found), still listed for the admin and marked.
  expect(await inShop()).toBe(200);
  await renamedRow.getByRole("button", { name: `Archive ${renamed}` }).click();
  await expect(page.getByText(`${renamed} archived`)).toBeVisible();
  await expect(renamedRow).toContainText("Archived");
  expect(await inShop()).toBe(404);
  await page.goto(`${shopURL}/products?search=${encodeURIComponent(renamed)}`);
  await expect(page.getByText("No products found")).toBeVisible();

  // Restore: on sale again.
  await page.goto("/products");
  await page.getByRole("row").filter({ hasText: renamed }).getByRole("button", { name: `Restore ${renamed}` }).click();
  await expect(page.getByText(`${renamed} is on sale again`)).toBeVisible();
  expect(await inShop()).toBe(200);
});
