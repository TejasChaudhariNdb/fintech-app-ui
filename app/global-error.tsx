"use client";

// BUG-069: last-resort error page, instead of Next.js's bare "Application error" screen.
// It replaces the root layout, so it brings its own <html>/<body> and needs no providers.
// A failed download of a build file (the usual cause right after a deploy) reloads once by itself.

import { useEffect } from "react";
import "./globals.css";
import { isChunkLoadError, reloadOnceForNewBuild } from "@/lib/chunkReload";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const newBuild = isChunkLoadError(error);

  useEffect(() => {
    console.error("[Arthavi] Unhandled app error:", error);
    // Reloads at most once per 30 s; if the guard stops it, the Reload button below is the way out.
    if (newBuild) reloadOnceForNewBuild();
  }, [error, newBuild]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <main className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-lg font-bold">
            {newBuild ? "A new version of Arthavi is available" : "Something went wrong"}
          </h1>
          <p className="text-sm text-neutral-400">
            {newBuild
              ? "Loading the latest version… If nothing happens, tap Reload. Your data is safe."
              : "This screen could not be shown. Your data is safe. Try again, or reload the app."}
          </p>
          <div className="flex gap-2 justify-center">
            {!newBuild && (
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold hover:bg-white/10">
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500">
              Reload
            </button>
          </div>
          {error?.digest && <p className="text-[11px] text-neutral-600">Error code: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
