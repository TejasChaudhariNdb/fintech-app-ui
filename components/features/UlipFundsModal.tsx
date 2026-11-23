"use client";

// BUG-106: the funds inside a ULIP (units x NAV = fund value), copied by the user from the
// insurer's statement or app. Saving replaces the whole list.
import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";

export interface UlipFundRow {
  fund_name: string;
  units: number;
  nav: number;
  nav_date?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  policyName: string;
  initialFunds: UlipFundRow[];
  onSave: (funds: UlipFundRow[]) => Promise<void>;
}

type Draft = { fund_name: string; units: string; nav: string; nav_date: string };

const today = () => new Date().toISOString().split("T")[0];
const emptyRow = (): Draft => ({ fund_name: "", units: "", nav: "", nav_date: today() });
const inputCls =
  "w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm font-medium text-neutral-900 dark:text-white outline-none tabular-nums placeholder:text-neutral-400";

export default function UlipFundsModal({ isOpen, onClose, policyName, initialFunds, onSave }: Props) {
  const [rows, setRows] = useState<Draft[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setRows(
      initialFunds.length
        ? initialFunds.map((f) => ({
            fund_name: f.fund_name,
            units: String(f.units),
            nav: String(f.nav),
            nav_date: f.nav_date || today(),
          }))
        : [emptyRow()]
    );
    // Reset only when the modal opens, so a parent re-render never wipes what is being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const update = (i: number, patch: Partial<Draft>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const total = rows.reduce((s, r) => s + (parseFloat(r.units) || 0) * (parseFloat(r.nav) || 0), 0);

  const handleSave = async () => {
    setError(null);
    const filled = rows.filter((r) => r.fund_name.trim() || r.units || r.nav);
    for (const r of filled) {
      if (!r.fund_name.trim()) return setError("Each fund needs a name.");
      const units = parseFloat(r.units);
      const nav = parseFloat(r.nav);
      if (!(units >= 0) || !(nav >= 0)) return setError(`Enter units and NAV for ${r.fund_name.trim()}.`);
    }
    setSaving(true);
    try {
      await onSave(
        filled.map((r) => ({
          fund_name: r.fund_name.trim(),
          units: parseFloat(r.units),
          nav: parseFloat(r.nav),
          nav_date: r.nav_date || null,
        }))
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save funds.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ULIP funds · ${policyName}`}>
      <div className="space-y-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Copy the units and NAV of each fund from your insurer&apos;s statement or app. Update them whenever
          you want a fresh value.
        </p>

        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 dark:border-white/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Fund name, e.g. Equity Plus Fund"
                value={r.fund_name}
                onChange={(e) => update(i, { fund_name: e.target.value })}
                className={inputCls}
                aria-label={`Fund ${i + 1} name`}
              />
              <button
                type="button"
                onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [emptyRow()]))}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                title="Remove fund"
                aria-label={`Remove fund ${i + 1}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="Units"
                value={r.units}
                onChange={(e) => update(i, { units: e.target.value })}
                className={inputCls}
                aria-label={`Fund ${i + 1} units`}
              />
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="NAV (₹)"
                value={r.nav}
                onChange={(e) => update(i, { nav: e.target.value })}
                className={inputCls}
                aria-label={`Fund ${i + 1} NAV`}
              />
              <DatePicker value={r.nav_date} max={today()} onChange={(v) => update(i, { nav_date: v })} className={inputCls} />
            </div>
            <div className="text-[11px] text-neutral-500 text-right tabular-nums">
              Value ₹{Math.round((parseFloat(r.units) || 0) * (parseFloat(r.nav) || 0)).toLocaleString("en-IN")}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400"
        >
          <Plus size={13} /> Add another fund
        </button>

        <div className="flex items-center justify-between rounded-xl bg-neutral-50 dark:bg-white/5 px-3 py-2">
          <span className="text-xs font-semibold text-neutral-500">Total fund value</span>
          <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
            ₹{Math.round(total).toLocaleString("en-IN")}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave} isLoading={saving}>
            Save funds
          </Button>
        </div>
      </div>
    </Modal>
  );
}
