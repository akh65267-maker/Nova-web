import type { SessionHandlers } from "@taskmanager/session/handlers";
import type { OrderDto } from "@taskmanager/api/orders-api";
import { DEMO_PRODUCTS, availabilityOf, demoBrands, demoCategories, demoReviews, listDemoProducts } from "./demo-data";

// The demo build's stand-in for the session and proxy handlers. There is no backend and no
// database: whoever signs in is accepted, and the little state there is (who is signed in, the
// basket, the orders placed) lives in the visitor's own cookies.

const USER = "demo_user";
const BASKET = "demo_basket";
const ORDERS = "demo_orders";
const MAX_ORDERS = 5;
const PREFIX = "/api/proxy";

const read = (request: Request, name: string): string | undefined =>
  request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .map((c) => c.split("="))
    .find(([key]) => key === name)?.[1];

const parse = <T,>(raw: string | undefined, fallback: T): T => {
  try {
    return raw ? (JSON.parse(decodeURIComponent(raw)) as T) : fallback;
  } catch {
    return fallback;
  }
};

const cookie = (request: Request, name: string, value: string | null) =>
  `${name}=${value === null ? "" : encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value === null ? 0 : 86_400}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;

function json(status: number, body: unknown, cookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const userFromEmail = (email: string) => ({
  id: `30000000-0000-4000-8000-${String(hash(email)).padStart(12, "0").slice(0, 12)}`,
  email,
  role: "Customer",
});

const currentEmail = (request: Request) => {
  const raw = read(request, USER);
  return raw ? decodeURIComponent(raw) : null;
};

const ASSISTANT_REPLY =
  "This is the demo, so I am not connected to the real assistant. In the full version I can look up products, compare them and read your cart. Try the Laptops or Audio categories, or the products on sale.";

export function createDemoHandlers(): SessionHandlers {
  return {
    async login(request) {
      let body: { email?: unknown; password?: unknown };
      try {
        body = await request.json();
      } catch {
        return json(400, { title: "Invalid request." });
      }
      if (typeof body.email !== "string" || !body.email.trim() || typeof body.password !== "string" || !body.password) {
        return json(400, { title: "Invalid request." });
      }
      const email = body.email.trim().toLowerCase();
      return json(200, { user: userFromEmail(email) }, [cookie(request, USER, email)]);
    },

    async logout(request) {
      return json(204, null, [cookie(request, USER, null), cookie(request, BASKET, null)]);
    },

    async session(request) {
      const email = currentEmail(request);
      return email ? json(200, { authenticated: true, user: userFromEmail(email) }) : json(200, { authenticated: false });
    },

    async proxy(request) {
      const url = new URL(request.url);
      const path = url.pathname.slice(PREFIX.length).replace(/\/+$/, "");
      const method = request.method.toUpperCase();
      const q = url.searchParams;
      const email = currentEmail(request);
      const parts = path.split("/").filter(Boolean);

      if (method === "GET" && path === "/products") {
        const num = (key: string) => (q.has(key) ? Number(q.get(key)) : undefined);
        return json(
          200,
          listDemoProducts({
            category: q.get("category") ?? undefined,
            brand: q.get("brand") ?? undefined,
            minPrice: num("minPrice"),
            maxPrice: num("maxPrice"),
            onSale: q.get("onSale") === "true",
            search: q.get("search") ?? undefined,
            sort: (q.get("sort") as never) ?? undefined,
            ids: q.get("ids")?.split(",").filter(Boolean),
            page: num("page"),
            pageSize: num("pageSize"),
          }),
        );
      }
      if (method === "GET" && path === "/products/brands") return json(200, demoBrands());
      if (method === "GET" && path === "/categories") return json(200, demoCategories());

      if (parts[0] === "products" && parts[1]) {
        const product = DEMO_PRODUCTS.find((p) => p.id === parts[1]);
        if (!product) return json(404, { title: "Not found" });
        if (method === "GET" && parts.length === 2) return json(200, product);
        if (method === "GET" && parts[2] === "related") {
          return json(200, DEMO_PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4));
        }
        if (method === "GET" && parts[2] === "reviews") return json(200, demoReviews(product.id));
        if (method === "GET" && parts[2] === "discount") return json(404, { title: "Not found" });
        if (parts[2] === "reviews") return json(204, null);
        return json(403, { title: "Not available in the demo." });
      }

      if (method === "GET" && path === "/inventory/availability") {
        const ids = q.getAll("ids").flatMap((v) => v.split(","));
        return json(200, ids.map(availabilityOf).filter(Boolean));
      }

      if (path === "/basket") {
        if (!email) return json(401, { title: "Sign in first." });
        const userId = userFromEmail(email).id;
        if (method === "PUT") {
          const { items } = (await request.json()) as { items: { productId: string; quantity: number }[] };
          return json(200, { userId, items }, [cookie(request, BASKET, JSON.stringify(items))]);
        }
        return json(200, { userId, items: parse(read(request, BASKET), []) });
      }

      if (method === "GET" && path === "/orders/top-selling") {
        return json(200, DEMO_PRODUCTS.slice(0, Number(q.get("limit")) || 5).map((p) => p.id));
      }

      if (parts[0] === "orders") {
        if (!email) return json(401, { title: "Sign in first." });
        const orders = parse<OrderDto[]>(read(request, ORDERS), []);
        if (method === "POST" && parts.length === 1) {
          const { items } = (await request.json()) as { items: { productId: string; quantity: number; unitPrice: number }[] };
          const now = new Date().toISOString();
          const order: OrderDto = {
            id: crypto.randomUUID(),
            userId: userFromEmail(email).id,
            items,
            totalAmount: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
            status: "Confirmed",
            createdAtUtc: now,
            cancellationReason: null,
            resolvedAtUtc: now,
          };
          const kept = [order, ...orders].slice(0, MAX_ORDERS);
          return json(202, { id: order.id }, [cookie(request, ORDERS, JSON.stringify(kept)), cookie(request, BASKET, JSON.stringify([]))]);
        }
        if (method === "GET" && parts.length === 1) return json(200, orders);
        if (method === "GET" && parts.length === 2) {
          const order = orders.find((o) => o.id === parts[1]);
          return order ? json(200, order) : json(404, { title: "Not found" });
        }
      }

      if (method === "POST" && path === "/users") {
        const body = (await request.json()) as { email?: string };
        return json(201, { id: userFromEmail(String(body.email ?? "demo").toLowerCase()).id });
      }
      if (method === "GET" && parts[0] === "users" && email) {
        return json(200, { id: parts[1], email, displayName: email.split("@")[0] });
      }

      if (method === "POST" && path === "/assistant/chat") return json(200, { reply: ASSISTANT_REPLY, toolsUsed: [] });

      return json(404, { title: "Not found" });
    },
  };
}
