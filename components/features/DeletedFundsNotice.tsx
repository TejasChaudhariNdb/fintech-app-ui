"use client";

import React, { useState } from "react";
import { EyeOff, RotateCcw, Info } from "lucide-react";
import Button from "@/components/ui/Button";

export interface DeletedFundInfo {
  restore_key: string;
  folio: string | null;
  scheme: string | null;
  units?: number | null;
  value?: number | null;
  deleted_on?: string | null;
  new_transactions?: number;
}

interface Props {
  skipped: DeletedFundInfo[];
  restoredWithNewActivity: DeletedFundInfo[];
  /** Re-sends the same statement asking for these funds back. */
  onRestore: (keys: string[]) => Promise<void>;
}

const inr = (n?: number | null) =>
  `₹${Math.abs(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

/**
 * Upload result: funds the user deleted earlier were skipped (tick to add back), and
 * deleted funds that came back because they have new transactions.
 */
export default function DeletedFundsNotice({ skipped, restoredWithNewActivity, onRestore }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  if (skipped.length === 0 && restoredWithNewActivity.length === 0) return null;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allSelected = skipped.length > 0 && selected.size === skipped.length;

  const restore = async () => {
    if (selected.size === 0) return;
    setRestoring(true);
    setError("");
    try {
      await onRestore(Array.from(selected));
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : "Could not add the funds back. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="w-full space-y-3 mb-6 text-left">
      {skipped.length > 0 && (
        <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <EyeOff size={16} className="text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {skipped.length === 1
                  ? "1 fund you deleted earlier was skipped"
                  : `${skipped.length} funds you deleted earlier were skipped`}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                They stay hidden on future uploads too. Tick any you want back.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-white/10 divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-[#151A23]">
            {skipped.length > 1 && (
              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary-600"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(skipped.map((s) => s.restore_key)))
                  }
                />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Select all</span>
              </label>
            )}
            {skipped.map((s) => (
              <label key={s.restore_key} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 mt-0.5 accent-primary-600 shrink-0"
                  checked={selected.has(s.restore_key)}
                  onChange={() => toggle(s.restore_key)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-neutral-900 dark:text-white truncate">{s.scheme}</span>
                  <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                    Folio {s.folio}
                    {s.deleted_on ? ` · deleted ${fmtDate(s.deleted_on)}` : ""}
                  </span>
                </span>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 shrink-0">
                  {s.value ? inr(s.value) : "₹0"}
                </span>
              </label>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <Button
            type="button"
            variant="outline"
            onClick={restore}
            disabled={restoring || selected.size === 0}
            className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            <RotateCcw size={15} />
            {restoring
              ? "Adding back..."
              : selected.size > 0
                ? `Add ${selected.size} back to portfolio`
                : "Add selected back"}
          </Button>
        </div>
      )}

      {restoredWithNewActivity.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {restoredWithNewActivity.length === 1
                ? "1 deleted fund was added back because it has new transactions"
                : `${restoredWithNewActivity.length} deleted funds were added back because they have new transactions`}
            </p>
          </div>
          <ul className="space-y-1 pl-6">
            {restoredWithNewActivity.map((s) => (
              <li key={s.restore_key} className="text-xs text-amber-800/90 dark:text-amber-200/90">
                {s.scheme} · Folio {s.folio}
                {s.new_transactions ? ` · ${s.new_transactions} new` : ""}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70 pl-6">
            Delete it again from Mutual Funds if it still isn&apos;t yours to track.
          </p>
        </div>
      )}
    </div>
  );
}
