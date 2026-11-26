"use client";

// BUG-117 / BUG-094 PMS & AIF v1: each holding has dated money in (investment, top-up, AIF drawdown) and
// out (withdrawal, distribution), plus the latest value from the manager's statement. Backend works out
// net invested, gain and XIRR.
import React, { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { rateLabel, rateToShow, UNDER_ONE_YEAR_NOTE } from "@/lib/returnsDisplay";

type Kind = "PMS" | "AIF";
interface Flow { flow_date: string; flow_type: "INVEST" | "WITHDRAW"; amount: number }
interface AltInvestment {
  id: number;
  profile_id: number | null;
  profile_name: string;
  kind: Kind;
  manager: string;
  strategy: string | null;
  aif_category: string | null;
  account_ref: string | null;
  value_date: string | null;
  lock_in_until: string | null;
  status: string;
  notes: string | null;
  flows: Flow[];
  value: number;
  put_in: number;
  taken_out: number;
  invested: number;
  gain: number;
  return_pct: number | null;
  xirr: number | null;
  held_under_one_year: boolean;
}
interface Summary { count: number; value: number; invested: number; gain: number; xirr: number | null }

const MANAGERS: Record<Kind, string[]> = {
  PMS: ["Marcellus", "ASK Investment Managers", "Motilal Oswal", "ICICI Prudential", "Abakkus", "Carnelian", "White Oak", "Alchemy", "Unifi", "Kotak"],
  AIF: ["360 ONE", "Edelweiss", "Kotak Alternate", "ICICI Prudential", "Avendus", "Abakkus", "Nippon India", "HDFC", "Motilal Oswal"],
};
const AIF_CATEGORIES = [
  { id: "CAT_I", label: "Category I", hint: "Venture capital, SME, infrastructure" },
  { id: "CAT_II", label: "Category II", hint: "Private equity, private debt, real estate" },
  { id: "CAT_III", label: "Category III", hint: "Hedge funds, long-short" },
];

const LABEL = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";
const INPUT =
  "w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-orange-500 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 tabular-nums";
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "-"}${inr(Math.abs(v))}`;
const today = () => new Date().toISOString().split("T")[0];

export default function PmsAifPage() {
  const { activeProfileId } = useProfile();
  const [items, setItems] = useState<AltInvestment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AltInvestment | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAltInvestments();
      setItems(data?.investments || []);
      setSummary(data?.summary || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load PMS & AIF");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, activeProfileId]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };

  const handleDelete = async (a: AltInvestment) => {
    if (!window.confirm(`Delete ${a.manager}${a.strategy ? ` (${a.strategy})` : ""}? This cannot be undone.`)) return;
    try {
      await api.deleteAltInvestment(a.id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  };

  return (
    <div className="px-4 py-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">PMS &amp; AIF</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Add PMS / AIF</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {summary && summary.count > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">Current Value</div>
            <div className="text-lg sm:text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums"><PrivacyMask>{inr(summary.value)}</PrivacyMask></div>
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">Net Invested</div>
            <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums"><PrivacyMask>{inr(summary.invested)}</PrivacyMask></div>
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">Gain</div>
            <div className={`text-lg sm:text-2xl font-black tabular-nums ${summary.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              <PrivacyMask>{signed(summary.gain)}</PrivacyMask>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">XIRR</div>
            <div className={`text-lg sm:text-2xl font-black tabular-nums ${(summary.xirr ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {summary.xirr !== null ? `${summary.xirr.toFixed(2)}%` : "--"}
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-500 py-10 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <BriefcaseBusiness size={24} />
          </div>
          <div className="text-base font-bold text-neutral-900 dark:text-white">Track your PMS and AIF</div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Add the money you put in and took out, and the current value from your manager&apos;s statement, to see your gain and XIRR.
          </p>
          <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm">
            Add PMS / AIF
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((a) => {
            const rate = rateToShow(a.xirr, a.return_pct, a.held_under_one_year);
            const closed = a.status === "CLOSED";
            const cat = AIF_CATEGORIES.find((c) => c.id === a.aif_category)?.label;
            return (
              <Card key={a.id} className={`p-5 space-y-3 ${closed ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight truncate">{a.manager}</h3>
                    {a.strategy && <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 truncate">{a.strategy}</div>}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-orange-50 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/20">
                        {a.kind}{cat ? ` · ${cat}` : ""}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 dark:bg-white/5 text-neutral-500">{a.profile_name}</span>
                      {closed && <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-500">Closed</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditing(a); setFormOpen(true); }} title="Edit" aria-label="Edit investment" className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(a)} title="Delete" aria-label="Delete investment" className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-neutral-100 dark:border-white/5">
                  <div>
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Value</div>
                    <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums"><PrivacyMask>{inr(a.value)}</PrivacyMask></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Net Invested</div>
                    <div className="text-base sm:text-lg font-bold text-neutral-700 dark:text-neutral-200 tabular-nums"><PrivacyMask>{inr(a.invested)}</PrivacyMask></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">{rateLabel("XIRR", a.held_under_one_year)}</div>
                    <div className={`text-base sm:text-lg font-bold tabular-nums ${(rate ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {rate !== null ? `${rate.toFixed(2)}%` : "--"}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-semibold tabular-nums ${a.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  Gain <PrivacyMask>{signed(a.gain)}</PrivacyMask>
                  {a.return_pct !== null && ` (${a.return_pct >= 0 ? "+" : ""}${a.return_pct.toFixed(2)}% of money put in)`}
                </div>
                {a.held_under_one_year && <p className="text-[11px] text-neutral-400">{UNDER_ONE_YEAR_NOTE}</p>}
                <div className="text-[11px] text-neutral-400">
                  Put in <PrivacyMask>{inr(a.put_in)}</PrivacyMask>
                  {a.taken_out > 0 && <> · taken out <PrivacyMask>{inr(a.taken_out)}</PrivacyMask></>}
                  {a.value_date && <> · value as of {a.value_date}</>}
                </div>
                {a.lock_in_until && (
                  <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    {a.lock_in_until > today() ? `Locked in until ${a.lock_in_until}` : `Lock-in ended ${a.lock_in_until}`}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AltInvestmentModal isOpen={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={async () => { setFormOpen(false); await load(); }} />
    </div>
  );
}

type FlowDraft = { flow_date: string; flow_type: "INVEST" | "WITHDRAW"; amount: string };

function AltInvestmentModal({ isOpen, onClose, initial, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  initial: AltInvestment | null;
  onSaved: () => Promise<void>;
}) {
  const { profiles, activeProfileId } = useProfile();
  const [kind, setKind] = useState<Kind>("PMS");
  const [manager, setManager] = useState("");
  const [strategy, setStrategy] = useState("");
  const [category, setCategory] = useState("CAT_II");
  const [value, setValue] = useState("");
  const [valueDate, setValueDate] = useState(today());
  const [firstAmount, setFirstAmount] = useState("");
  const [firstDate, setFirstDate] = useState(today());
  const [flows, setFlows] = useState<FlowDraft[]>([]);  // later entries: top-ups, withdrawals, drawdowns, distributions
  const [lockIn, setLockIn] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [profileId, setProfileId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const a = initial;
    setKind(a?.kind || "PMS");
    setManager(a?.manager || "");
    setStrategy(a?.strategy || "");
    setCategory(a?.aif_category || "CAT_II");
    setValue(a ? String(a.value) : "");
    setValueDate(a?.value_date || today());
    // the earliest investment is the "Amount invested" fields; every other entry is listed below
    const sorted = [...(a?.flows || [])].sort((x, y) => x.flow_date.localeCompare(y.flow_date));
    const firstIdx = sorted.findIndex((f) => f.flow_type === "INVEST");
    setFirstAmount(firstIdx >= 0 ? String(sorted[firstIdx].amount) : "");
    setFirstDate(firstIdx >= 0 ? sorted[firstIdx].flow_date : today());
    setFlows(sorted.filter((_, i) => i !== firstIdx).map((f) => ({ ...f, amount: String(f.amount) })));
    setLockIn(a?.lock_in_until || "");
    setAccountRef(a?.account_ref || "");
    setStatus(a?.status || "ACTIVE");
    setProfileId(String(a?.profile_id || (activeProfileId !== "all" ? activeProfileId : profiles[0]?.id || "")));
    setError(null);
    // Reset only when the modal opens, so a parent re-render never wipes what is being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updateFlow = (i: number, patch: Partial<FlowDraft>) => setFlows((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const handleSave = async () => {
    setError(null);
    if (!manager.trim()) return setError("Please enter the manager name.");
    if (!(parseFloat(value) >= 0) || value.trim() === "") return setError("Enter the current value from your statement.");
    if (!(parseFloat(firstAmount) > 0) || !firstDate) return setError("Enter the amount invested and the investment date.");
    const extra = flows.filter((f) => f.amount.trim() !== "");
    if (extra.some((f) => !(parseFloat(f.amount) > 0) || !f.flow_date)) return setError("Each extra entry needs a date and an amount above 0.");
    const rows = [{ flow_date: firstDate, flow_type: "INVEST" as const, amount: firstAmount }, ...extra];
    setSaving(true);
    try {
      await api.saveAltInvestment({
        kind,
        manager: manager.trim(),
        strategy: strategy.trim() || null,
        aif_category: kind === "AIF" ? category : null,
        account_ref: accountRef.trim() || null,
        current_value: parseFloat(value),
        value_date: valueDate || null,
        lock_in_until: lockIn || null,
        status,
        profile_id: profileId ? parseInt(profileId) : null,
        flows: rows.map((f) => ({ flow_date: f.flow_date, flow_type: f.flow_type, amount: parseFloat(f.amount) })),
      }, initial?.id);
      await onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? "Edit PMS / AIF" : "Add PMS / AIF"}>
      <div className="space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {(["PMS", "AIF"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`py-2 rounded-xl border text-sm font-semibold transition-colors ${
                kind === k
                  ? "bg-orange-50 dark:bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300"
                  : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {k === "PMS" ? "PMS" : "AIF"}
            </button>
          ))}
        </div>

        {profiles.length > 1 && (
          <div>
            <label className={LABEL}>For</label>
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className={INPUT}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.relation})</option>)}
            </select>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={LABEL}>{kind === "PMS" ? "Portfolio manager" : "Fund manager"}</label>
            <input list="alt-managers" value={manager} onChange={(e) => setManager(e.target.value)} placeholder={kind === "PMS" ? "e.g. Marcellus" : "e.g. 360 ONE"} className={INPUT} />
            <datalist id="alt-managers">{MANAGERS[kind].map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          {kind === "AIF" && (
            <div>
              <label className={LABEL}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
                {AIF_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.hint})</option>)}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className={LABEL}>{kind === "PMS" ? "Strategy" : "Fund / scheme"}</label>
          <input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder={kind === "PMS" ? "e.g. Consistent Compounders" : "e.g. Real Estate Fund II"} className={INPUT} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>{kind === "PMS" ? "Amount invested (₹)" : "First drawdown (₹)"}</label>
            <input type="number" min="0" step="any" inputMode="decimal" value={firstAmount} onChange={(e) => setFirstAmount(e.target.value)} placeholder="50,00,000" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Investment date</label>
            <DatePicker value={firstDate} onChange={(v) => setFirstDate(v)} className={INPUT} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Current value (₹)</label>
            <input type="number" min="0" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="From your statement" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Value as of</label>
            <DatePicker value={valueDate} onChange={(v) => setValueDate(v)} className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Lock-in ends (optional)</label>
          <DatePicker value={lockIn} clearable onChange={(v) => setLockIn(v)} className={INPUT} />
          <p className="text-[10px] text-neutral-400 mt-1">{kind === "AIF" ? "Most AIFs lock money in for 3 years or more." : "Leave empty if you can withdraw any time."}</p>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-3 space-y-2.5">
          <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            {kind === "PMS" ? "Top-ups and withdrawals" : "Later drawdowns and distributions"} (optional)
          </div>
          {flows.length > 0 && (
            <p className="text-[10px] text-neutral-400">
              {kind === "PMS" ? "Money added after the first investment, and money taken out." : "Each later capital call you paid, and each distribution you received."}
            </p>
          )}
          {flows.map((f, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 pb-2.5 border-b border-neutral-100 dark:border-white/5 last:border-0">
              <select aria-label="In or out" value={f.flow_type} onChange={(e) => updateFlow(i, { flow_type: e.target.value as FlowDraft["flow_type"] })} className={INPUT}>
                <option value="INVEST">{kind === "PMS" ? "Top-up" : "Drawdown"}</option>
                <option value="WITHDRAW">{kind === "PMS" ? "Withdrawal" : "Distribution"}</option>
              </select>
              <DatePicker value={f.flow_date} onChange={(v) => updateFlow(i, { flow_date: v })} className={INPUT} />
              <div className="col-span-2 flex items-center gap-2">
                <input type="number" min="0" step="any" inputMode="decimal" aria-label="Amount" placeholder="Amount (₹)" value={f.amount} onChange={(e) => updateFlow(i, { amount: e.target.value })} className={INPUT} />
                <button type="button" aria-label="Remove entry" onClick={() => setFlows((prev) => prev.filter((_, idx) => idx !== i))} className="p-2 rounded-lg text-neutral-400 hover:text-red-600 shrink-0">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFlows((prev) => [...prev, { flow_date: today(), flow_type: "INVEST", amount: "" }])}
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400"
          >
            <Plus size={14} /> {kind === "PMS" ? "Add top-up / withdrawal" : "Add drawdown / distribution"}
          </button>
        </div>

        <details open={!!(initial?.account_ref || initial?.status === "CLOSED")} className="rounded-xl border border-neutral-200 dark:border-white/10">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">More details (optional)</summary>
          <div className="grid grid-cols-2 gap-3 px-3 pb-3">
            <div>
              <label className={LABEL}>Client code / folio</label>
              <input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </details>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">{error}</div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-semibold text-sm">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? "Saving…" : initial ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
