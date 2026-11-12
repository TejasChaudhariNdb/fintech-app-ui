"use client";

import { useEffect, useState } from "react";
import { subscribeToCacheState } from "@/lib/api";

// BUG-021: shown while any figure comes from the saved copy because the server could not be reached.
export default function StaleDataNotice() {
  const [endpoints, setEndpoints] = useState<string[]>([]);

  useEffect(() => subscribeToCacheState(setEndpoints), []);

  if (endpoints.length === 0) return null;

  return (
    <div
      role="status"
      className="mx-3 mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 sm:mx-4 lg:mx-8"
    >
      Showing saved data: the server could not be reached, so some figures may be out of date.
      They will update when the connection returns.
    </div>
  );
}
