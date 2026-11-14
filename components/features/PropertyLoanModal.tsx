"use client";
import DatePicker from "@/components/ui/DatePicker";

import React, { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { api } from "@/lib/api";
import { ChevronDown, Loader2 } from "lucide-react";

// BUG-030: home loan for one property. The loan is optional. Figures come from the backend.
// Real estate feedback (2026-11-13): overview in plain words, amortization schedule, foreclosure fee.
export interface PropertyLoanView {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  emi_start_date: string;
  emi: number;
  emi_formula?: number;
  emi_from_bank?: boolean;
  current_rate?: number;
  current_emi?: number;
  ends_on?: string | null;
  rate_changes?: { effective_date: string; annual_rate: number; new_emi: number | null }[];
  current_outstanding: number;
  outstanding_from_schedule: boolean;
  foreclosure_fee_pct?: number;
  months_paid?: number;
  months_left?: number;
  missed_emis?: number;
  changed_emis?: number;
  total_interest_full_tenure?: number;
  interest_paid_to_date: number;
  principal_repaid_to_date: number;
  current_fy: string;
  interest_this_fy: number;
  principal_this_fy: number;
  xirr_unleveraged_pct: number | null;
  xirr_leveraged_pct: number | null;
  financed_rent_after_interest_fy: number | null;
  occupancy_type: string;
  tax: Record<
    "OLD" | "NEW",
    { interest_deduction: number; principal_80c_amount: number; notes: string[] }
  >;
  disclaimer: string;
}

interface ScheduleRow {
  n: number;
  due: string;
  fy: string;
  emi: number;
  scheduled_emi: number;
  status: "SCHEDULED" | "MISSED" | "CHANGED";
  rate?: number;
  rate_changed?: boolean;
  emi_raised?: boolean;
  note?: string | null;
  interest: number;
  principal: number;
  closing: number;
  paid: boolean;
}

interface ScheduleYear {
  fy: string;
  emi: number;
  interest: number;
  principal: number;
  closing: number;
  months: number;
  paid_months: number;
}

interface Schedule {
  emi: number;
  total_interest: number;
  total_paid: number;
  outstanding_entered: number | null;
  rows: ScheduleRow[];
  years: ScheduleYear[];
  note: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  holdingId: number;
  propertyName: string;
  loan: PropertyLoanView | null;
  onChanged: () => void;
}

const inr = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `₹${Math.round(v).toLocaleString("en-IN")}`;

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${v.toFixed(2)}%`;

function short(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2).replace(/\.00$/, "")}Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${Math.round(v)}`;
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-white/5 p-2.5">
      <div className="text-[11px] uppercase font-bold text-neutral-400">{label}</div>
      <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-0.5"><PrivacyMask>{value}</PrivacyMask></div>
      {hint && <div className="text-[11px] text-neutral-500 leading-snug">{hint}</div>}
    </div>
  );
}

function monthName(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** Inline editor for one EMI month: paid as scheduled / missed / a different amount. */
function MonthEditor({
  row,
  holdingId,
  onSaved,
  onCancel,
}: {
  row: ScheduleRow;
  holdingId: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [custom, setCustom] = useState(row.status === "CHANGED" ? String(Math.round(row.emi)) : "");
  const [showCustom, setShowCustom] = useState(row.status === "CHANGED");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const opt = (active: boolean) =>
    `flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${
      active ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" : "border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
    }`;

  return (
    <div className="my-1.5 rounded-xl border border-indigo-500/30 bg-white dark:bg-surface p-2.5 space-y-2">
      <div className="text-xs text-neutral-600 dark:text-neutral-300">
        <b className="text-neutral-900 dark:text-white">{monthName(row.due)} EMI</b> · scheduled {inr(row.scheduled_emi)}
      </div>
      <div className="flex gap-1.5">
        <button type="button" disabled={busy} className={opt(row.status === "SCHEDULED")} onClick={() => run(() => api.resetLoanPayment(holdingId, row.due))}>
          ✓ Paid as scheduled
        </button>
        <button type="button" disabled={busy} className={opt(row.status === "MISSED")} onClick={() => run(() => api.setLoanPayment(holdingId, row.due, 0))}>
          ✗ Missed
        </button>
        <button type="button" disabled={busy} className={opt(showCustom)} onClick={() => setShowCustom(true)}>
          Different amount
        </button>
      </div>
      {showCustom && (
        <div className="flex gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Amount you paid (₹)"
            className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={busy || !(parseFloat(custom) > 0)}
            onClick={() => run(() => api.setLoanPayment(holdingId, row.due, parseFloat(custom)))}
            className="rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}
      <p className="text-[11px] text-neutral-400">
        {showCustom ? "Paid more? The extra reduces your loan. Paid less? The rest stays on the loan." : "Missed EMIs add that month's interest to the loan."}
      </p>
      <div className="flex items-center justify-between">
        {err ? <span className="text-xs text-rose-600">{err}</span> : <span />}
        <button type="button" onClick={onCancel} className="text-xs text-neutral-500 hover:underline">Close</button>
      </div>
    </div>
  );
}

/** Set many EMI months at once: a new EMI after a rate change, a run of missed months, or undo. */
function BulkMonths({
  rows,
  holdingId,
  onDone,
  onCancel,
}: {
  rows: ScheduleRow[];
  holdingId: number;
  onDone: (msg: string) => void;
  onCancel: () => void;
}) {
  const current = rows.filter((r) => r.paid);
  const [from, setFrom] = useState(current.length ? current[Math.max(current.length - 12, 0)].due : rows[0]?.due ?? "");
  const [to, setTo] = useState(current.length ? current[current.length - 1].due : rows[0]?.due ?? "");
  const [what, setWhat] = useState<"AMOUNT" | "MISSED" | "RESET">("AMOUNT");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const count = rows.filter((r) => r.due >= from && r.due <= to).length;

  const apply = async () => {
    setErr("");
    if (from > to) return setErr("From month must be before the To month.");
    if (what === "AMOUNT" && !(parseFloat(amount) > 0)) return setErr("Enter the EMI amount you paid.");
    setBusy(true);
    try {
      await api.setLoanPaymentsBulk(holdingId, {
        from_date: from,
        to_date: to,
        paid_amount: what === "AMOUNT" ? parseFloat(amount) : what === "MISSED" ? 0 : null,
        reset: what === "RESET",
      });
      onDone(`${count} months updated`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  const sel = "w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-surface px-2 py-1.5 text-xs";
  const opt = (active: boolean) =>
    `flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
      active ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
    }`;

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2.5">
      <div className="text-xs font-bold text-neutral-900 dark:text-white">Change many months</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-neutral-600 dark:text-neutral-400">
          From
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={sel}>
            {rows.map((r) => <option key={r.due} value={r.due}>{monthName(r.due)}</option>)}
          </select>
        </label>
        <label className="text-xs text-neutral-600 dark:text-neutral-400">
          To
          <select value={to} onChange={(e) => setTo(e.target.value)} className={sel}>
            {rows.map((r) => <option key={r.due} value={r.due}>{monthName(r.due)}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-1.5">
        <button type="button" className={opt(what === "AMOUNT")} onClick={() => setWhat("AMOUNT")}>Paid amount</button>
        <button type="button" className={opt(what === "MISSED")} onClick={() => setWhat("MISSED")}>Missed</button>
        <button type="button" className={opt(what === "RESET")} onClick={() => setWhat("RESET")}>Back to schedule</button>
      </div>
      {what === "AMOUNT" && (
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="EMI paid each month (₹)"
          className="w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs"
        />
      )}
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onCancel} className="text-xs text-neutral-500 hover:underline">Cancel</button>
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={apply}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : `Apply to ${count} month${count === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

interface RateRow {
  key: number;
  effective_date: string;
  annual_rate: string;
  new_emi: string;
}

/** Floating-rate history, newest first, like the bank's "Interest rate changes" page. */
function RatesView({ holdingId, loan, onChanged }: { holdingId: number; loan: PropertyLoanView; onChanged: () => void }) {
  const [rows, setRows] = useState<RateRow[]>(() =>
    (loan.rate_changes ?? []).map((c, i) => ({
      key: i,
      effective_date: c.effective_date,
      annual_rate: String(c.annual_rate),
      new_emi: c.new_emi ? String(Math.round(c.new_emi)) : "",
    }))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");
  const [nextKey, setNextKey] = useState(1000);

  const update = (key: number, field: keyof Omit<RateRow, "key">, value: string) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const add = () => {
    setRows((list) => [...list, { key: nextKey, effective_date: "", annual_rate: "", new_emi: "" }]);
    setNextKey((k) => k + 1);
  };

  const save = async () => {
    setErr("");
    const changes = [];
    for (const r of rows) {
      const rate = parseFloat(r.annual_rate);
      if (!r.effective_date || isNaN(rate)) return setErr("Each rate change needs a From date and a rate.");
      if (rate < 0 || rate > 30) return setErr(`Rate ${rate}% looks wrong. Enter the yearly rate, e.g. 7.75.`);
      const emi = r.new_emi.trim() ? parseFloat(r.new_emi) : null;
      if (emi !== null && !(emi > 0)) return setErr("New EMI must be more than 0, or leave it empty.");
      changes.push({ effective_date: r.effective_date, annual_rate: rate, new_emi: emi });
    }
    setBusy(true);
    try {
      await api.saveLoanRateChanges(holdingId, changes);
      setFlash(changes.length ? `${changes.length} rate change${changes.length > 1 ? "s" : ""} saved. Schedule and return updated.` : "Rate changes cleared.");
      setTimeout(() => setFlash(""), 3500);
      onChanged();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...rows].sort((a, b) => (b.effective_date || "9999").localeCompare(a.effective_date || "9999"));
  const field = "w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-2 py-1.5 text-xs";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
        <p>
          <b>Floating-rate loan?</b> Add each rate change your bank made (HDFC, SBI and others list them as &quot;Interest rate
          changes&quot;). Interest, the loan left and your return then follow the real rate.
        </p>
        <p className="text-neutral-500">
          Leave <b>New EMI</b> empty if your EMI stayed the same: the bank changes the tenure instead. Fill it only if the
          bank changed your EMI.
        </p>
      </div>

      {(loan.current_rate !== undefined || loan.ends_on) && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Rate now" value={`${loan.current_rate ?? loan.annual_rate}%`} />
          <Stat label="Loan ends" value={loan.ends_on ? monthName(loan.ends_on) : "—"} hint={`${loan.months_left ?? "—"} EMIs left`} />
        </div>
      )}

      <div className="relative pl-4">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-neutral-200 dark:bg-white/10" />
        {sorted.map((r) => (
          <div key={r.key} className="relative mb-2">
            <span className="absolute -left-[15px] top-3 h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-2.5 space-y-2">
              <div className="grid grid-cols-[1.3fr_0.8fr_1fr_auto] gap-1.5 items-end">
                <label className="text-[11px] text-neutral-500">
                  From
                  <DatePicker value={r.effective_date} onChange={(v) => update(r.key, "effective_date", v)} className={field} />
                </label>
                <label className="text-[11px] text-neutral-500">
                  Rate %
                  <input type="number" inputMode="decimal" step="0.01" placeholder="7.75" value={r.annual_rate} onChange={(e) => update(r.key, "annual_rate", e.target.value)} className={field} />
                </label>
                <label className="text-[11px] text-neutral-500">
                  New EMI
                  <input type="number" inputMode="numeric" placeholder="same" value={r.new_emi} onChange={(e) => update(r.key, "new_emi", e.target.value)} className={field} />
                </label>
                <button type="button" onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))} className="mb-1 p-1.5 text-neutral-400 hover:text-rose-600" aria-label="Remove rate change">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="relative">
          <span className="absolute -left-[15px] top-1.5 h-2.5 w-2.5 rounded-full bg-neutral-400" />
          <div className="text-xs text-neutral-600 dark:text-neutral-400 py-1">
            <b className="text-neutral-900 dark:text-white">{loan.annual_rate}%</b> from the first EMI ({monthName(loan.emi_start_date)}). Change it in Edit.
          </div>
        </div>
      </div>

      <button type="button" onClick={add} className="w-full rounded-xl border border-dashed border-indigo-500/50 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
        + Add rate change
      </button>

      {err && <p className="text-xs text-rose-600">{err}</p>}
      {flash && <p className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{flash}</p>}

      <button type="button" disabled={busy} onClick={save} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Saving…" : "Save rate changes"}
      </button>
    </div>
  );
}

function ScheduleView({ holdingId, onChanged }: { holdingId: number; onChanged: () => void }) {
  const [data, setData] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  const [openFy, setOpenFy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [flash, setFlash] = useState("");

  const load = useCallback(
    (first: boolean) =>
      api
        .getRealEstateLoanSchedule(holdingId)
        .then((d: Schedule) => {
          setData(d);
          if (first) setOpenFy(d.years.find((y) => y.paid_months > 0 && y.paid_months < y.months)?.fy ?? null);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load the schedule.")),
    [holdingId]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  if (error) return <p className="text-xs text-rose-600">{error}</p>;
  if (!data) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>;

  const nextMonthIso = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="EMI" value={inr(data.emi)} />
        <Stat label="Total interest" value={short(data.total_interest)} />
        <Stat label="Total paid" value={short(data.total_paid)} />
      </div>
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300">
        <b>Missed an EMI or paid a different amount?</b> Open the year and tap the month to fix it, or change many months at
        once. Your loan balance and return update automatically.
        {!bulkOpen && (
          <button type="button" onClick={() => setBulkOpen(true)} className="mt-2 block w-full rounded-lg border border-indigo-500/40 bg-white dark:bg-surface py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Change many months
          </button>
        )}
      </div>
      {bulkOpen && (
        <BulkMonths
          rows={data.rows.filter((r) => r.due <= nextMonthIso)}
          holdingId={holdingId}
          onCancel={() => setBulkOpen(false)}
          onDone={(msg) => {
            setBulkOpen(false);
            setFlash(msg);
            setTimeout(() => setFlash(""), 3000);
            load(false);
            onChanged();
          }}
        />
      )}
      {flash && <p className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{flash}</p>}
      <div className="rounded-xl border border-neutral-200 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_16px] gap-1 px-2.5 py-2 bg-neutral-50 dark:bg-white/5 text-[11px] uppercase font-bold text-neutral-500">
          <span>FY</span><span className="text-right">Interest</span><span className="text-right">Principal</span><span className="text-right">Balance</span><span />
        </div>
        {data.years.map((y) => {
          const fullyPaid = y.paid_months === y.months;
          const partly = y.paid_months > 0 && !fullyPaid;
          const open = openFy === y.fy;
          const interestShare = y.emi > 0 ? Math.round((y.interest / y.emi) * 100) : 0;
          const yearRows = data.rows.filter((r) => r.fy === y.fy);
          const fixes = yearRows.filter((r) => r.status !== "SCHEDULED").length;
          return (
            <div key={y.fy} className="border-t border-neutral-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setOpenFy(open ? null : y.fy)}
                className={`w-full grid grid-cols-[1fr_1fr_1fr_1fr_16px] gap-1 px-2.5 py-2 text-xs font-mono text-left items-center ${fullyPaid ? "bg-emerald-500/5" : ""}`}
              >
                <span className="font-sans font-semibold text-neutral-800 dark:text-neutral-200">
                  {y.fy}
                  {partly && <span className="block text-[11px] font-normal text-indigo-500">now</span>}
                  {fixes > 0 && <span className="block text-[11px] font-normal text-amber-600">{fixes} fixed</span>}
                </span>
                <span className="text-right text-rose-600 dark:text-rose-400">
                  <PrivacyMask>{short(y.interest)}</PrivacyMask>
                  <span className="block text-[11px] text-neutral-400">{interestShare}% of EMI</span>
                </span>
                <span className="text-right text-emerald-600 dark:text-emerald-400"><PrivacyMask>{short(y.principal)}</PrivacyMask></span>
                <span className="text-right text-neutral-700 dark:text-neutral-300"><PrivacyMask>{short(y.closing)}</PrivacyMask></span>
                <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="bg-neutral-50/60 dark:bg-white/[0.02] px-2.5 pb-2">
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-1 py-1 text-[11px] uppercase font-bold text-neutral-400">
                    <span>Month</span><span className="text-right">Paid</span><span className="text-right">Interest</span><span className="text-right">Balance</span>
                  </div>
                  {yearRows.map((r) => {
                    const editable = r.due <= nextMonthIso;
                    return (
                      <div key={r.n}>
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => setEditing(editing === r.due ? null : r.due)}
                          className={`w-full grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-1 py-1.5 text-[11px] font-mono text-left rounded-md ${
                            editable ? "hover:bg-indigo-500/5" : "opacity-70 cursor-default"
                          } ${editing === r.due ? "bg-indigo-500/10" : ""}`}
                        >
                          <span className="font-sans text-neutral-700 dark:text-neutral-300">
                            {new Date(r.due).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                            {r.status === "MISSED" ? (
                              <span className="ml-1 rounded bg-rose-500/15 px-1 text-[11px] font-semibold text-rose-600">missed</span>
                            ) : r.status === "CHANGED" ? (
                              <span className="ml-1 rounded bg-amber-500/15 px-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">changed</span>
                            ) : r.paid ? (
                              <span className="ml-1 text-emerald-600">✓</span>
                            ) : null}
                            {r.rate_changed && (
                              <span className="ml-1 rounded bg-sky-500/15 px-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400">{r.rate}%</span>
                            )}
                            {r.emi_raised && (
                              <span className="ml-1 rounded bg-rose-500/15 px-1 text-[11px] font-semibold text-rose-600">EMI up</span>
                            )}
                          </span>
                          <span className={`text-right ${r.status === "MISSED" ? "text-rose-600" : r.status === "CHANGED" ? "text-amber-700 dark:text-amber-400" : "text-neutral-700 dark:text-neutral-300"}`}>
                            <PrivacyMask>{inr(r.emi)}</PrivacyMask>
                          </span>
                          <span className="text-right text-neutral-500"><PrivacyMask>{inr(r.interest)}</PrivacyMask></span>
                          <span className="text-right text-neutral-500"><PrivacyMask>{short(r.closing)}</PrivacyMask></span>
                        </button>
                        {editing === r.due && (
                          <MonthEditor
                            row={r}
                            holdingId={holdingId}
                            onCancel={() => setEditing(null)}
                            onSaved={() => {
                              setEditing(null);
                              load(false);
                              onChanged();
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-neutral-400">
        {data.note}
        {data.outstanding_entered != null && " You entered today's loan left from your bank; that figure is used for returns."}
      </p>
    </div>
  );
}

export default function PropertyLoanModal({
  isOpen,
  onClose,
  holdingId,
  propertyName,
  loan,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<"OVERVIEW" | "SCHEDULE" | "RATES" | "EDIT">(loan ? "OVERVIEW" : "EDIT");
  const [principal, setPrincipal] = useState(loan ? String(loan.principal) : "");
  const [rate, setRate] = useState(loan ? String(loan.annual_rate) : "");
  const [tenureYears, setTenureYears] = useState(loan ? String(loan.tenure_months / 12) : "");
  const [emiStart, setEmiStart] = useState(loan ? loan.emi_start_date : "");
  const [outstanding, setOutstanding] = useState(loan && !loan.outstanding_from_schedule ? String(loan.current_outstanding) : "");
  const [feePct, setFeePct] = useState(loan?.foreclosure_fee_pct ? String(loan.foreclosure_fee_pct) : "");
  const [regime, setRegime] = useState<"OLD" | "NEW">("NEW");
  // "I only know my EMI": loan amount = EMI x ((1+r)^n - 1) / (r (1+r)^n). Fills the amount field only.
  const [knowEmi, setKnowEmi] = useState(false);
  const [emiInput, setEmiInput] = useState("");
  // Confirm the EMI: the formula can differ from what the bank charges (rounding, bank method).
  const [emiCheck, setEmiCheck] = useState<"YES" | "NO" | null>(loan ? (loan.emi_from_bank ? "NO" : "YES") : null);
  const [bankEmi, setBankEmi] = useState(loan?.emi_from_bank ? String(Math.round(loan.emi)) : "");

  const formulaEmi = (() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 1200;
    const n = Math.round(parseFloat(tenureYears) * 12);
    if (!(p > 0) || !(n > 0) || isNaN(r) || r < 0) return null;
    return r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  })();

  const applyEmi = (emiStr: string, rateStr: string, yearsStr: string) => {
    const emi = parseFloat(emiStr);
    const r = parseFloat(rateStr) / 1200;
    const n = Math.round(parseFloat(yearsStr) * 12);
    if (!(emi > 0) || !(n > 0) || isNaN(r) || r < 0) return;
    const p = r === 0 ? emi * n : (emi * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
    setPrincipal(String(Math.round(p)));
  };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const years = parseFloat(tenureYears);
    if (!(p > 0) || isNaN(r) || r < 0 || !(years > 0) || !emiStart) {
      setError("Enter loan amount, interest rate, tenure in years and the first EMI date.");
      return;
    }
    if (r > 30) {
      setError(`Interest rate ${r}% looks too high. Enter the yearly rate, e.g. 8.5.`);
      return;
    }
    if (years > 40) {
      setError(`Tenure ${years} years looks too long. Enter years, not months (e.g. 20).`);
      return;
    }
    let emiAmount: number | null = null;
    if (knowEmi) {
      emiAmount = parseFloat(emiInput) > 0 ? parseFloat(emiInput) : null;
    } else if (emiCheck === null) {
      setError("Please confirm the EMI: is it what your bank charges?");
      return;
    } else if (emiCheck === "NO") {
      emiAmount = parseFloat(bankEmi);
      if (!(emiAmount > 0)) {
        setError("Enter the EMI your bank charges.");
        return;
      }
    }
    const outVal = outstanding.trim() ? parseFloat(outstanding) : null;
    const fee = feePct.trim() ? parseFloat(feePct) : null;
    if (fee !== null && (isNaN(fee) || fee < 0 || fee > 10)) {
      setError("Foreclosure fee must be between 0% and 10%.");
      return;
    }
    setSaving(true);
    try {
      await api.saveRealEstateLoan(holdingId, {
        principal: p,
        annual_rate: r,
        tenure_months: Math.round(years * 12),
        emi_start_date: emiStart,
        current_outstanding: outVal,
        foreclosure_fee_pct: fee,
        emi_amount: emiAmount,
      });
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not save the loan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remove the loan from this property? Your returns will be calculated without it.")) return;
    setSaving(true);
    try {
      await api.deleteRealEstateLoan(holdingId);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not remove the loan.");
    } finally {
      setSaving(false);
    }
  };

  const tax = loan ? loan.tax[regime] : null;
  const emisPaid = loan ? loan.interest_paid_to_date + loan.principal_repaid_to_date : 0;
  const interestShare = loan && emisPaid > 0 ? Math.round((loan.interest_paid_to_date / emisPaid) * 100) : 0;
  const repaidPct = loan && loan.principal > 0 ? Math.min(100, Math.max(0, ((loan.principal - loan.current_outstanding) / loan.principal) * 100)) : 0;

  const tabs: { id: typeof tab; label: string }[] = loan
    ? [
        { id: "OVERVIEW", label: "Overview" },
        { id: "SCHEDULE", label: "Schedule" },
        { id: "RATES", label: "Rates" },
        { id: "EDIT", label: "Edit" },
      ]
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Home loan · ${propertyName}`}>
      <div className="space-y-4">
        {tabs.length > 0 && (
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-white/5 rounded-xl w-full">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold ${
                  tab === t.id ? "bg-white dark:bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-neutral-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {loan && tab === "OVERVIEW" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Monthly EMI"
                value={inr(loan.current_emi ?? loan.emi)}
                hint={`${loan.current_rate ?? loan.annual_rate}% now${loan.emi_from_bank ? " · as per bank" : ""}${loan.ends_on ? ` · ends ${monthName(loan.ends_on)}` : ""}`}
              />
              <Stat
                label="Loan left today"
                value={inr(loan.current_outstanding)}
                hint={loan.outstanding_from_schedule ? "From the EMI schedule" : "As entered from your bank"}
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>{Math.round(repaidPct)}% of the loan repaid</span>
                {loan.months_left !== undefined && <span>{loan.months_left} EMIs left</span>}
              </div>
              <div className="h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${repaidPct}%` }} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTab("SCHEDULE")}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-white/10 px-3 py-2 text-left text-xs hover:border-indigo-500/40"
            >
              <span className="text-neutral-700 dark:text-neutral-300">
                {(loan.missed_emis ?? 0) + (loan.changed_emis ?? 0) > 0 ? (
                  <>
                    <b>{loan.missed_emis ?? 0} missed</b>, <b>{loan.changed_emis ?? 0} changed</b> EMIs recorded.{" "}
                  </>
                ) : (
                  <>Missed an EMI or paid a different amount? </>
                )}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Fix in EMI schedule</span>
              </span>
              <ChevronDown size={14} className="-rotate-90 text-neutral-400 shrink-0" />
            </button>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-white">Interest is your biggest cost</div>
              <p className="text-neutral-600 dark:text-neutral-300">
                Of <b><PrivacyMask>{inr(emisPaid)}</PrivacyMask></b> paid in EMIs so far,{" "}
                <b className="text-rose-600 dark:text-rose-400"><PrivacyMask>{inr(loan.interest_paid_to_date)}</PrivacyMask></b> ({interestShare}%) went to interest and only{" "}
                <b className="text-emerald-600 dark:text-emerald-400"><PrivacyMask>{inr(loan.principal_repaid_to_date)}</PrivacyMask></b> reduced the loan.
              </p>
              {loan.total_interest_full_tenure !== undefined && (
                <p className="text-neutral-500">
                  Over the full tenure you will pay <PrivacyMask>{inr(loan.total_interest_full_tenure)}</PrivacyMask> in interest.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-3 text-xs space-y-1.5">
              <div className="font-semibold text-neutral-900 dark:text-white">What the loan does to your return</div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">If you had paid fully in cash</span>
                <span className="font-mono font-semibold">{pct(loan.xirr_unleveraged_pct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">With the loan (your actual return)</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{pct(loan.xirr_leveraged_pct)}</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                &quot;With the loan&quot; counts your down payment and every EMI as money in, and the value minus the loan left
                {loan.foreclosure_fee_pct ? ` and a ${loan.foreclosure_fee_pct}% foreclosure fee` : ""} as money back.
              </p>
              {loan.occupancy_type === "LET_OUT" && (
                <div className="flex justify-between pt-1 border-t border-neutral-100 dark:border-white/5">
                  <span className="text-neutral-600 dark:text-neutral-300">Rent minus this FY&apos;s interest (a year)</span>
                  <span className="font-mono"><PrivacyMask>{inr(loan.financed_rent_after_interest_fy)}</PrivacyMask></span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-neutral-900 dark:text-white">Tax benefit this FY ({loan.current_fy})</span>
                <select
                  value={regime}
                  onChange={(e) => setRegime(e.target.value as "OLD" | "NEW")}
                  className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1 text-xs"
                >
                  <option value="NEW">New regime</option>
                  <option value="OLD">Old regime</option>
                </select>
              </div>
              {tax && (
                <>
                  <div className="flex justify-between py-0.5"><span>Interest deduction (Sec 24b)</span><span className="font-mono"><PrivacyMask>{inr(tax.interest_deduction)}</PrivacyMask></span></div>
                  <div className="flex justify-between py-0.5"><span>Principal deduction (Sec 80C)</span><span className="font-mono"><PrivacyMask>{inr(tax.principal_80c_amount)}</PrivacyMask></span></div>
                  <ul className="list-disc pl-4 mt-1 text-xs text-neutral-500 space-y-0.5">
                    {tax.notes.map((n) => (<li key={n}>{n}</li>))}
                  </ul>
                </>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">{loan.disclaimer}</p>
          </div>
        )}

        {loan && tab === "SCHEDULE" && <ScheduleView holdingId={holdingId} onChanged={onChanged} />}
        {loan && tab === "RATES" && <RatesView holdingId={holdingId} loan={loan} onChanged={onChanged} />}

        {tab === "EDIT" && (
          <form onSubmit={save} className="space-y-3">
            {!loan && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Add your home loan once and <b>every EMI is counted automatically</b>, month by month, with the
                interest and principal split. No need to log EMIs by hand.
              </p>
            )}
            <div className="flex p-1 rounded-xl bg-neutral-100 dark:bg-white/5">
              {[
                { id: false, label: "I know the loan amount" },
                { id: true, label: "I only know my EMI" },
              ].map((o) => (
                <button
                  key={String(o.id)}
                  type="button"
                  onClick={() => setKnowEmi(o.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${knowEmi === o.id ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-500"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {knowEmi ? (
                <div>
                  <label className="block text-xs font-semibold mb-1">Monthly EMI (₹) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={emiInput}
                    onChange={(e) => { setEmiInput(e.target.value); applyEmi(e.target.value, rate, tenureYears); }}
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1">Loan amount (₹) *</label>
                  <input type="number" inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1">Interest rate (% a year) *</label>
                <input type="number" inputMode="decimal" step="0.01" placeholder="e.g. 8.5" value={rate} onChange={(e) => { setRate(e.target.value); if (knowEmi) applyEmi(emiInput, e.target.value, tenureYears); }} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tenure (years) *</label>
                <input type="number" inputMode="decimal" placeholder="e.g. 20" value={tenureYears} onChange={(e) => { setTenureYears(e.target.value); if (knowEmi) applyEmi(emiInput, rate, e.target.value); }} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">First EMI date *</label>
                <DatePicker value={emiStart} onChange={(v) => setEmiStart(v)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            {!knowEmi && formulaEmi !== null && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
                <div className="text-xs text-neutral-700 dark:text-neutral-300">
                  Calculated EMI: <b className="text-neutral-900 dark:text-white text-sm">₹{Math.round(formulaEmi).toLocaleString("en-IN")}</b>
                  <div className="font-semibold mt-1 text-neutral-900 dark:text-white">Is this the EMI your bank charges?</div>
                </div>
                <div className="flex gap-2">
                  {(["YES", "NO"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEmiCheck(v)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
                        emiCheck === v
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {v === "YES" ? "Yes, correct" : "No, it's different"}
                    </button>
                  ))}
                </div>
                {emiCheck === "NO" && (
                  <div>
                    <label className="block text-xs font-semibold mb-1">EMI your bank charges (₹)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      autoFocus
                      value={bankEmi}
                      onChange={(e) => setBankEmi(e.target.value)}
                      placeholder="From your loan statement"
                      className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">Every month uses this EMI. The loan may end a little earlier or later.</p>
                  </div>
                )}
              </div>
            )}

            {knowEmi && parseFloat(principal) > 0 && (
              <p className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300">
                Loan amount worked out from your EMI: <b>₹{Math.round(parseFloat(principal)).toLocaleString("en-IN")}</b>
              </p>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1">Loan left today (optional)</label>
              <input type="number" inputMode="numeric" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} placeholder="From your bank statement" className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
              <p className="text-[11px] text-neutral-400 mt-1">Leave empty to use the schedule. Enter it if you made prepayments or the rate changed.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Foreclosure fee (% of loan left, optional)</label>
              <input type="number" inputMode="decimal" step="0.1" value={feePct} onChange={(e) => setFeePct(e.target.value)} placeholder="0" className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
              <p className="text-[11px] text-neutral-400 mt-1">Usually 0% for floating-rate home loans. Fixed-rate or commercial loans may charge 2–4%.</p>
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <div className="flex justify-between pt-2">
              {loan ? (
                <button type="button" onClick={remove} disabled={saving} className="text-xs text-rose-600 hover:underline">Remove loan</button>
              ) : <span />}
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving..." : loan ? "Update loan" : "Save loan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
