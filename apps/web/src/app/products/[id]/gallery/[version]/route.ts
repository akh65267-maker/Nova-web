import { createGalleryImageHandler } from "@taskmanager/session/image";
import { gatewayUrl } from "@/lib/session-server";

export const dynamic = "force-dynamic";

// One of a product's gallery pictures. Public and cached like the main picture.
const galleryImage = createGalleryImageHandler(gatewayUrl);

export async function GET(request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await params;
  return galleryImage(request, id, version);
}
