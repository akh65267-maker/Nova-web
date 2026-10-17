import { createProductImageHandler } from "@taskmanager/session/image";
import { gatewayUrl } from "@/lib/session-server";

export const dynamic = "force-dynamic";

// A product's picture. Public, and cached by the browser (its URL carries the picture's version),
// so it does not go through the API proxy, which marks everything it carries as private.
const productImage = createProductImageHandler(gatewayUrl);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return productImage(request, (await params).id);
}
