// A page that outlives its build (a tab left open across a deploy, or across a dev-server restart)
// asks for script chunks that no longer exist. The fix is the same refresh a visitor would do by
// hand, so this does it once, and never twice within a minute: if the fresh page fails the same
// way, a reload loop would hide the real error.

const KEY = "nova:chunk-reload-at";
const WINDOW_MS = 60_000;

// The messages browsers and bundlers (webpack, Turbopack, native import()) give a missing chunk.
const CHUNK_ERROR = /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to load chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return CHUNK_ERROR.test(text);
}

/** Reloads the page for a chunk error, at most once a minute. Returns whether it did. */
export function reloadForChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // No storage (private mode, blocked): reloading without the guard could loop, so do not.
    return false;
  }
  window.location.reload();
  return true;
}
