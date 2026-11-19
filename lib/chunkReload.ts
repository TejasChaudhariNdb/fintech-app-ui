// BUG-069: after a deploy, a page or service-worker copy from the old build asks for code files
// ("chunks") that no longer exist. The download fails and Next.js showed its bare
// "Application error: a client-side exception has occurred" screen until a second refresh.
// These helpers spot that failure in every form it takes and reload the page once.

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk \S+ failed/i,
  /Loading CSS chunk/i,
  /Failed to load chunk/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
];

/** True when an error (or its message) is a failed download of a build file. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const parts: string[] = [];
  if (typeof error === "string") {
    parts.push(error);
  } else if (typeof error === "object") {
    const e = error as { name?: unknown; message?: unknown };
    if (typeof e.name === "string") parts.push(e.name);
    if (typeof e.message === "string") parts.push(e.message);
  }
  const text = parts.join(" ");
  return CHUNK_ERROR_PATTERNS.some((p) => p.test(text));
}

const RELOAD_KEY = "arthavi_chunk_reload_at";
const RELOAD_GUARD_MS = 30_000;

/**
 * Reload the page to pick up the new build, at most once per 30 seconds, so a file that is
 * really missing cannot cause a reload loop. Returns false when the guard stopped the reload.
 */
export function reloadOnceForNewBuild(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (last && Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked (private mode): still reload once; the browser keeps no state to loop on.
  }
  window.location.reload();
  return true;
}
