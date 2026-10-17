const PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION = /^[0-9a-f]{1,64}$/i;
const TIMEOUT_MS = 15_000;

/**
 * Serves a product's picture from the gateway. Pictures are public, and a picture's URL carries its
 * version (`?v=`), so unlike the API proxy (which says `no-store` about everything, because it
 * carries a person's own data) this passes the backend's caching headers through: a browser keeps
 * a picture for good, and revalidates one asked for without a version.
 *
 * Only a well-formed id and version reach the gateway's URL, and no cookie or token is sent.
 */
export function createProductImageHandler(gatewayUrl: string) {
  return async function productImage(request: Request, id: string): Promise<Response> {
    if (!PRODUCT_ID.test(id)) return new Response(null, { status: 404 });

    const version = new URL(request.url).searchParams.get("v");
    const query = version !== null && VERSION.test(version) ? `?v=${version}` : "";
    const headers = new Headers();
    const etag = request.headers.get("if-none-match");
    if (etag) headers.set("if-none-match", etag);

    let upstream: Response;
    try {
      upstream = await fetch(`${gatewayUrl}/products/${id}/image${query}`, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return new Response(null, { status: 502 });
    }

    if (upstream.status === 404) return new Response(null, { status: 404 });
    if (upstream.status !== 200 && upstream.status !== 304) return new Response(null, { status: 502 });

    const out = new Headers();
    for (const name of ["content-type", "cache-control", "etag", "x-content-type-options"]) {
      const value = upstream.headers.get(name);
      if (value) out.set(name, value);
    }

    return new Response(upstream.status === 304 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: out });
  };
}
