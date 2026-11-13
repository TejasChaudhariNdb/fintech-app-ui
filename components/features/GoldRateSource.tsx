"use client";

import React from "react";

export interface GoldRateInfo {
  rate_24k_per_gram: number;
  rate_22k_per_gram: number;
  rate_18k_per_gram: number;
  currency?: string;
  last_updated?: string;
  source?: string;
  source_label?: string;
  is_fallback?: boolean;
  is_stale?: boolean;
  gst_included?: boolean;
}

export function formatRateTime(iso?: string): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

/** Plain-language rate line: estimated Indian market rate, excl. GST, and update time.
 *  The calculation details stay in the tooltip. */
export default function GoldRateSource({ rates, compact = false }: { rates: GoldRateInfo | null; compact?: boolean }) {
  if (!rates) return null;

  return (
    <div
      className={`text-neutral-500 dark:text-neutral-400 ${compact ? "text-[10px]" : "text-[11px]"}`}
      title={rates.source_label || rates.source}
    >
      Estimated Indian market rate · excl. GST · Updated {formatRateTime(rates.last_updated)}
    </div>
  );
}
