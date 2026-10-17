import { sessionHandlers } from "@/lib/session-server";

export const dynamic = "force-dynamic";

// Every call the shop makes to the backend goes through here, so the session cookies are read on
// the server and the token is added there.
export const GET = sessionHandlers.proxy;
export const POST = sessionHandlers.proxy;
export const PUT = sessionHandlers.proxy;
export const PATCH = sessionHandlers.proxy;
export const DELETE = sessionHandlers.proxy;
