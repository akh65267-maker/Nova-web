import { expect, test } from "@playwright/test";

const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// The admin tests that need a real administrator read the account from the environment, so no
// credential is written in this repository. Run them with ADMIN_EMAIL and ADMIN_PASSWORD set (the
// same variables deploy/.env in the backend repo uses); without them those tests are skipped.
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

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
