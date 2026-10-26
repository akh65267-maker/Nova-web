import type { BrandDto, CategoryDto, ProductDto, ProductListParams, ProductListResult } from "@taskmanager/api/catalog-api";

// The demo build has no backend: these products stand in for the catalogue. Pictures are left null,
// so every product shows its category illustration.

type Seed = [name: string, category: string, brand: string, price: number, discountPercent: number | null, stock: number, rating: number, ratings: number, description: string, colour: string];

const SEEDS: Seed[] = [
  ["Aero 14 Ultrabook", "Laptops", "Nimbus", 1299, 10, 24, 4.6, 128, "A light 14-inch laptop with an all-day battery and a bright 2.8K display.", "Silver"],
  ["Forge 16 Creator", "Laptops", "Nimbus", 1899, null, 9, 4.8, 64, "A 16-inch workstation for editing and 3D, with a dedicated graphics card.", "Graphite"],
  ["Pocket 13 Air", "Laptops", "Kite", 899, 15, 40, 4.3, 211, "A 13-inch everyday laptop that fits any bag.", "Sky blue"],
  ["Studio 15 Pro", "Laptops", "Kite", 1499, null, 0, 4.5, 47, "A quiet, fast 15-inch laptop for long working days.", "Space grey"],
  ["Orbit X Phone", "Phones", "Lumen", 999, null, 60, 4.7, 340, "A flagship phone with a 120 Hz screen and a three-lens camera.", "Midnight"],
  ["Orbit Lite", "Phones", "Lumen", 449, 20, 85, 4.2, 502, "Everything you need from a phone, at a friendly price.", "Mint"],
  ["Pulse 5G", "Phones", "Kite", 699, null, 7, 4.4, 156, "A fast 5G phone with a battery that lasts two days.", "Coral"],
  ["Fold Z", "Phones", "Lumen", 1799, 5, 12, 4.1, 38, "A phone that opens into a small tablet.", "Black"],
  ["Halo ANC Headphones", "Audio", "Echo", 349, 25, 33, 4.7, 289, "Over-ear headphones with deep noise cancelling and 40 hours of playback.", "Black"],
  ["Halo Buds", "Audio", "Echo", 149, null, 120, 4.4, 701, "True wireless earbuds with a pocket-sized charging case.", "White"],
  ["Beat Mini Speaker", "Audio", "Echo", 79, 10, 8, 4.0, 190, "A small waterproof speaker with big sound.", "Teal"],
  ["Studio Soundbar", "Audio", "Nimbus", 279, null, 18, 4.5, 92, "A slim soundbar that makes films sound like the cinema.", "Black"],
  ["Tempo Watch S", "Wearables", "Lumen", 329, null, 45, 4.5, 260, "A smartwatch with sleep, heart and workout tracking.", "Silver"],
  ["Tempo Band", "Wearables", "Kite", 59, 30, 150, 4.1, 840, "A light fitness band with a seven-day battery.", "Black"],
  ["Trail GPS Watch", "Wearables", "Nimbus", 449, null, 6, 4.8, 77, "A rugged GPS watch for runs, hikes and rides.", "Olive"],
  ["Fast Charge 65W", "Accessories", "Volt", 39, null, 200, 4.6, 412, "A compact 65 W charger for laptop, phone and tablet.", "White"],
  ["Dock Hub 8-in-1", "Accessories", "Volt", 89, 15, 55, 4.3, 133, "One cable for two displays, wired network, cards and power.", "Grey"],
  ["Sleeve 14", "Accessories", "Kite", 35, null, 0, 4.2, 58, "A padded sleeve for a 14-inch laptop.", "Navy"],
  ["Wireless Mouse M2", "Accessories", "Volt", 49, null, 90, 4.4, 327, "A quiet ergonomic mouse that pairs with three devices.", "Graphite"],
  ["Mech Keyboard K75", "Accessories", "Volt", 129, 10, 30, 4.7, 205, "A compact mechanical keyboard with hot-swappable switches.", "Cream"],
];

const DAY = 86_400_000;

export const DEMO_PRODUCTS: ProductDto[] = SEEDS.map(([name, category, brand, listPrice, discount, , rating, ratings, description, colour], i) => {
  const price = discount ? Math.round(listPrice * (1 - discount / 100)) : listPrice;
  return {
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name,
    description,
    price,
    listPrice,
    discountPercent: discount,
    discountEndsAtUtc: discount ? new Date(Date.now() + 5 * DAY).toISOString() : null,
    category,
    brand,
    attributes: [
      { name: "Colour", value: colour },
      { name: "Warranty", value: "2 years" },
    ],
    gallery: [],
    ratingAverage: rating,
    ratingCount: ratings,
    imageUrl: null,
    isArchived: false,
  };
});

const stockById = new Map(DEMO_PRODUCTS.map((p, i) => [p.id, SEEDS[i][5]]));

export function availabilityOf(id: string) {
  const quantity = stockById.get(id);
  if (quantity === undefined) return null;
  if (quantity <= 0) return { productId: id, availability: "OutOfStock" as const, remaining: 0 };
  if (quantity <= 10) return { productId: id, availability: "LowStock" as const, remaining: quantity };
  return { productId: id, availability: "InStock" as const, remaining: null };
}

export function listDemoProducts(params: ProductListParams): ProductListResult {
  let items = DEMO_PRODUCTS.slice();
  if (params.ids?.length) items = items.filter((p) => params.ids!.includes(p.id));
  if (params.category) items = items.filter((p) => p.category.toLowerCase() === params.category!.toLowerCase());
  if (params.brand) items = items.filter((p) => p.brand?.toLowerCase() === params.brand!.toLowerCase());
  if (params.minPrice !== undefined) items = items.filter((p) => p.price >= Number(params.minPrice));
  if (params.maxPrice !== undefined) items = items.filter((p) => p.price <= Number(params.maxPrice));
  if (params.onSale) items = items.filter((p) => p.discountPercent !== null);
  if (params.search) {
    const term = params.search.toLowerCase();
    items = items.filter((p) => [p.name, p.description, p.category, p.brand ?? ""].some((s) => s.toLowerCase().includes(term)));
  }
  switch (params.sort) {
    case "price-asc": items.sort((a, b) => a.price - b.price); break;
    case "price-desc": items.sort((a, b) => b.price - a.price); break;
    case "name": items.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "best-offer": items.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0)); break;
    default: items.reverse();
  }
  const pageSize = Math.max(1, Number(params.pageSize) || 12);
  const page = Math.max(1, Number(params.page) || 1);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), totalCount: items.length, page, pageSize };
}

export function demoCategories(): CategoryDto[] {
  const names = [...new Set(DEMO_PRODUCTS.map((p) => p.category))];
  return names.map((name, i) => ({ id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, name, productCount: DEMO_PRODUCTS.filter((p) => p.category === name).length }));
}

export function demoBrands(): BrandDto[] {
  const names = [...new Set(DEMO_PRODUCTS.map((p) => p.brand!))];
  return names.map((name) => ({ name, productCount: DEMO_PRODUCTS.filter((p) => p.brand === name).length }));
}

const REVIEW_TEXT = [
  [5, "Exactly what I hoped for. Great build and it arrived fast."],
  [4, "Very good for the price. A couple of small things I would change."],
  [5, "Easily the best one I have owned."],
  [3, "Fine, but not quite as good as the pictures suggest."],
];

export function demoReviews(productId: string) {
  const product = DEMO_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;
  const items = REVIEW_TEXT.map(([rating, body], i) => ({
    id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    authorName: `${"ADJM"[i]}***`,
    rating: rating as number,
    body: body as string,
    createdAtUtc: new Date(Date.now() - (i + 1) * 9 * DAY).toISOString(),
    isMine: false,
  }));
  const breakdown = [0, 0, 0, 0, 0];
  for (const r of items) breakdown[r.rating - 1]++;
  const average = items.reduce((sum, r) => sum + r.rating, 0) / items.length;
  return { summary: { average, count: items.length, breakdown }, items, mine: null };
}
