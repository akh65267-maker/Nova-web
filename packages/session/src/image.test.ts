import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import { createGalleryImageHandler, createProductImageHandler } from "./image.ts";

const ID = "3f2b8c1e-5a47-4c0e-9d11-0a1b2c3d4e5f";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

// A stand-in for the gateway that records what it was sent.
let gateway: Server;
let handler: (request: Request, id: string) => Promise<Response>;
let galleryHandler: (request: Request, id: string, version: string) => Promise<Response>;
let received: { url: string; headers: Record<string, string | string[] | undefined> }[];
let respond: (url: string, ifNoneMatch?: string) => { status: number; headers?: Record<string, string>; body?: Buffer };

before(async () => {
  gateway = createServer((req, res) => {
    received.push({ url: req.url ?? "", headers: req.headers });
    const out = respond(req.url ?? "", req.headers["if-none-match"] as string | undefined);
    res.writeHead(out.status, out.headers);
    res.end(out.body);
  });
  await new Promise<void>((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  galleryHandler = createGalleryImageHandler(`http://127.0.0.1:${(gateway.address() as AddressInfo).port}`);
  handler = createProductImageHandler(`http://127.0.0.1:${(gateway.address() as AddressInfo).port}`);
});

after(() => new Promise<void>((resolve) => gateway.close(() => resolve())));

beforeEach(() => {
  received = [];
  respond = () => ({
    status: 200,
    headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable", etag: '"abc"', "x-content-type-options": "nosniff" },
    body: PNG,
  });
});

const get = (id: string, query = "", headers: Record<string, string> = {}) =>
  handler(new Request(`http://localhost:3100/products/${id}/image${query}`, { headers }), id);

test("the picture comes through with the backend's caching headers and its type", async () => {
  const response = await get(ID, "?v=abc123");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(response.headers.get("etag"), '"abc"');
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
  assert.equal(received[0].url, `/products/${ID}/image?v=abc123`);
});

test("no cookie, token or other header of the browser's is passed on", async () => {
  await get(ID, "", { cookie: "tm_shop_at=secret", authorization: "Bearer secret" });

  assert.equal(received[0].headers.cookie, undefined);
  assert.equal(received[0].headers.authorization, undefined);
});

test("a revalidation that finds nothing changed is answered 304 without a body", async () => {
  respond = (_url, ifNoneMatch) => (ifNoneMatch === '"abc"' ? { status: 304, headers: { etag: '"abc"' } } : { status: 200, body: PNG });

  const response = await get(ID, "", { "if-none-match": '"abc"' });

  assert.equal(response.status, 304);
  assert.equal(response.body, null);
  assert.equal(response.headers.get("etag"), '"abc"');
});

test("an id that is not a product id never reaches the gateway", async () => {
  for (const id of ["../users/login", "1", "3f2b8c1e-5a47-4c0e-9d11-0a1b2c3d4e5f/../x", "%2e%2e"]) {
    assert.equal((await get(id)).status, 404);
  }
  assert.equal(received.length, 0);
});

test("a version that is not hexadecimal is dropped, not forwarded", async () => {
  await get(ID, "?v=../../x&w=1");

  assert.equal(received[0].url, `/products/${ID}/image`);
});

test("a product without a picture is a 404, and a failing gateway is a 502", async () => {
  respond = () => ({ status: 404 });
  assert.equal((await get(ID)).status, 404);

  respond = () => ({ status: 500 });
  assert.equal((await get(ID)).status, 502);
});

test("a gallery picture comes through with the backend's caching headers", async () => {
  const response = await galleryHandler(new Request("http://localhost:3100/x"), ID, "abc123");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
  assert.equal(received[0].url, `/products/${ID}/gallery/abc123`);
});

test("a gallery request with a bad id or version never reaches the gateway", async () => {
  assert.equal((await galleryHandler(new Request("http://localhost:3100/x"), ID, "../x")).status, 404);
  assert.equal((await galleryHandler(new Request("http://localhost:3100/x"), "1", "abc")).status, 404);
  assert.equal(received.length, 0);
});
