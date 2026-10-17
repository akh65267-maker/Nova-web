import { expect, test, type Page } from "@playwright/test";

const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const shopURL = process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3100";
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

// A real 1x1 PNG: what the browser has to decode for the picture to count as shown.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function signInToAdmin(page: Page) {
  await page.goto("/login?redirect=%2Fproducts");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Manage products" })).toBeVisible();
}

const decoded = (page: Page, alt: string) =>
  page.getByRole("img", { name: alt }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);

test("an administrator gives a product a picture, the shop shows it, and removing it brings the placeholder back", async ({
  page,
  request,
}) => {
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL and ADMIN_PASSWORD to run the administrator flow");

  // A product of its own, so the test depends on nothing already in the catalog.
  const login = await request.post(`${apiURL}/users/login`, { data: { email: adminEmail, password: adminPassword } });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const name = `Picture ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const created = await request.post(`${apiURL}/products`, {
    headers,
    data: { name, description: "A product with a picture.", price: 12.5, category: "Electronics" },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  await signInToAdmin(page);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText("None", { exact: true })).toBeVisible();

  // Something that is not a picture is refused by the server, whatever the browser called it.
  await row.getByLabel(`Choose a picture for ${name}`).setInputFiles({
    name: "evil.png",
    mimeType: "image/png",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  });
  await expect(page.getByText("The picture must be a JPEG, PNG or WebP image.")).toBeVisible();
  await expect(row.getByText("None", { exact: true })).toBeVisible();

  // A real one is accepted and shown.
  await row.getByLabel(`Choose a picture for ${name}`).setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Picture updated")).toBeVisible();
  await expect(row.getByRole("img", { name: `Picture of ${name}` })).toBeVisible();
  await expect.poll(() => decoded(page, `Picture of ${name}`)).toBe(true);

  // The shop shows it on the product's page, loaded from the shop's own origin, and a browser
  // may keep it for good.
  await page.goto(`${shopURL}/products/${id}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByRole("img", { name })).toBeVisible();
  await expect.poll(() => decoded(page, name)).toBe(true);
  const src = await page.getByRole("img", { name }).evaluate((img: HTMLImageElement) => img.currentSrc);
  expect(new URL(src).origin).toBe(new URL(shopURL).origin);
  const served = await page.request.get(src);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe("image/png");
  expect(served.headers()["cache-control"]).toContain("immutable");
  expect(Buffer.from(await served.body()).equals(PNG)).toBe(true);

  // Not a way to reach anything else behind the shop's server.
  expect((await page.request.get(`${shopURL}/products/..%2Fusers/image`)).status()).toBe(404);

  // Removed: the admin shows none, the shop falls back to its illustration, and the file is gone.
  await page.goto("/products");
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Picture removed")).toBeVisible();
  await expect(row.getByText("None", { exact: true })).toBeVisible();

  await page.goto(`${shopURL}/products/${id}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByRole("img", { name })).toHaveCount(0);
  expect((await page.request.get(src)).status()).toBe(404);
});
