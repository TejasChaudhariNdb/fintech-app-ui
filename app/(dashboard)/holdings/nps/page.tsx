"use client";

// BUG-092 NPS v1: accounts with E / C / G / A schemes (units x NAV copied from the NPS statement)
// and contributions (usual amount + frequency, or the total from the statement). Backend works out
// value, gain and XIRR.
import React, { useCallback, useEffect, useState } from "react";
import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { rateLabel, rateToShow, UNDER_ONE_YEAR_NOTE } from "@/lib/returnsDisplay";

type SchemeCode = "E" | "C" | "G" | "A";
const SCHEMES: { code: SchemeCode; name: string }[] = [
  { code: "E", name: "Equity (E)" },
  { code: "C", name: "Corporate bonds (C)" },
  { code: "G", name: "Govt bonds (G)" },
  { code: "A", name: "Alternative (A)" },
];
const FUND_MANAGERS = [
  "SBI Pension Funds", "LIC Pension Fund", "UTI Retirement Solutions", "HDFC Pension", "ICICI Prudential Pension",
  "Kotak Mahindra Pension", "Aditya Birla Sun Life Pension", "Tata Pension", "Max Life Pension", "Axis Pension", "DSP Pension",
];
const FREQUENCIES = [
  { id: "MONTHLY", label: "Monthly" },
  { id: "QUARTERLY", label: "Quarterly" },
  { id: "HALF_YEARLY", label: "Half-yearly" },
  { id: "ANNUAL", label: "Yearly" },
];

interface NpsScheme { scheme: SchemeCode; scheme_name: string; units: number; nav: number; nav_date: string | null; value: number }
interface NpsAccount {
  id: number;
  profile_id: number | null;
  profile_name: string;
  pran: string | null;
  tier: string;
  fund_manager: string;
  start_date: string;
  contribution_amount: number;
  contribution_frequency: string;
  total_contributed: number | null;
  status: string;
  notes: string | null;
  schemes: NpsScheme[];
  value: number;
  invested: number;
  gain: number;
  return_pct: number | null;
  xirr: number | null;
  held_under_one_year: boolean;
  equity_pct: number | null;
  nav_date: string | null;
}
interface NpsSummary { count: number; value: number; invested: number; gain: number; return_pct: number | null; xirr: number | null }

const LABEL = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";
const INPUT =
  "w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-sky-500 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 tabular-nums";
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const signed = (v: number) => `${v >= 0 ? "+" : "-"}${inr(Math.abs(v))}`;
const today = () => new Date().toISOString().split("T")[0];

export default function NpsPage() {
  const { activeProfileId } = useProfile();
  const [accounts, setAccounts] = useState<NpsAccount[]>([]);
  const [summary, setSummary] = useState<NpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<NpsAccount | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNpsAccounts();
      setAccounts(data?.accounts || []);
      setSummary(data?.summary || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load NPS accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, activeProfileId]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: NpsAccount) => { setEditing(a); setFormOpen(true); };

  const handleDelete = async (a: NpsAccount) => {
    if (!window.confirm(`Delete the ${a.fund_manager} NPS account? This cannot be undone.`)) return;
    try {
      await api.deleteNpsAccount(a.id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  };

  const summaryRate = summary ? summary.xirr : null;

  return (
    <div className="px-4 py-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">NPS</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Add NPS Account</span>
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
            <div className="text-lg sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
              <PrivacyMask>{inr(summary.value)}</PrivacyMask>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">Contributed</div>
            <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
              <PrivacyMask>{inr(summary.invested)}</PrivacyMask>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">Gain</div>
            <div className={`text-lg sm:text-2xl font-black tabular-nums ${summary.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              <PrivacyMask>{signed(summary.gain)}</PrivacyMask>
            </div>
            {summary.return_pct !== null && (
              <div className="text-[11px] text-neutral-400 mt-1">{summary.return_pct >= 0 ? "+" : ""}{summary.return_pct.toFixed(2)}%</div>
            )}
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">XIRR</div>
            <div className={`text-lg sm:text-2xl font-black tabular-nums ${(summaryRate ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {summaryRate !== null ? `${summaryRate.toFixed(2)}%` : "--"}
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-500 py-10 text-center">Loading…</div>
      ) : accounts.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <PiggyBank size={24} />
          </div>
          <div className="text-base font-bold text-neutral-900 dark:text-white">Track your NPS</div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Add your NPS account with the units and NAV from your NPS statement to see its value, gain and XIRR.
          </p>
          <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm">
            Add NPS Account
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((a) => {
            const rate = rateToShow(a.xirr, a.return_pct, a.held_under_one_year);
            const closed = a.status === "CLOSED";
            return (
              <Card key={a.id} className={`p-5 space-y-3 ${closed ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight truncate">{a.fund_manager}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/20">
                        {a.tier === "TIER_2" ? "Tier II" : "Tier I"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 dark:bg-white/5 text-neutral-500">{a.profile_name}</span>
                      {a.pran && <span className="text-[10px] font-mono text-neutral-400">PRAN {a.pran}</span>}
                      {closed && <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-500">Closed</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} title="Edit" aria-label="Edit NPS account" className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(a)} title="Delete" aria-label="Delete NPS account" className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
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
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Contributed</div>
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
                  {a.return_pct !== null && ` (${a.return_pct >= 0 ? "+" : ""}${a.return_pct.toFixed(2)}%)`}
                </div>
                {a.held_under_one_year && <p className="text-[11px] text-neutral-400">{UNDER_ONE_YEAR_NOTE}</p>}

                {a.schemes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-white/5">
                    {a.schemes.map((s) => (
                      <div key={s.scheme} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">{s.scheme_name}</span>
                        <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
                          <PrivacyMask>{inr(s.value)}</PrivacyMask>
                          {a.value > 0 && <span className="text-neutral-400 ml-1.5">{((s.value / a.value) * 100).toFixed(0)}%</span>}
                        </span>
                      </div>
                    ))}
                    {a.nav_date && <div className="text-[10px] text-neutral-400">NAV as of {a.nav_date}</div>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <NpsAccountModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSaved={async () => { setFormOpen(false); await load(); }}
      />
    </div>
  );
}

function NpsAccountModal({ isOpen, onClose, initial, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  initial: NpsAccount | null;
  onSaved: () => Promise<void>;
}) {
  const { profiles, activeProfileId } = useProfile();
  const [fundManager, setFundManager] = useState("");
  const [tier, setTier] = useState("TIER_1");
  const [pran, setPran] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [profileId, setProfileId] = useState("");
  const [navDate, setNavDate] = useState(today());
  const [units, setUnits] = useState<Record<SchemeCode, string>>({ E: "", C: "", G: "", A: "" });
  const [navs, setNavs] = useState<Record<SchemeCode, string>>({ E: "", C: "", G: "", A: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const a = initial;
    const u: Record<SchemeCode, string> = { E: "", C: "", G: "", A: "" };
    const n: Record<SchemeCode, string> = { E: "", C: "", G: "", A: "" };
    a?.schemes.forEach((s) => { u[s.scheme] = String(s.units); n[s.scheme] = String(s.nav); });
    setFundManager(a?.fund_manager || "");
    setTier(a?.tier || "TIER_1");
    setPran(a?.pran || "");
    setStartDate(a?.start_date || today());
    setAmount(a?.contribution_amount ? String(a.contribution_amount) : "");
    setFrequency(a?.contribution_frequency || "MONTHLY");
    setTotal(a?.total_contributed ? String(a.total_contributed) : "");
    setStatus(a?.status || "ACTIVE");
    setProfileId(String(a?.profile_id || (activeProfileId !== "all" ? activeProfileId : profiles[0]?.id || "")));
    setNavDate(a?.nav_date || today());
    setUnits(u);
    setNavs(n);
    setError(null);
    // Reset only when the modal opens, so a parent re-render never wipes what is being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const value = SCHEMES.reduce((s, { code }) => s + (parseFloat(units[code]) || 0) * (parseFloat(navs[code]) || 0), 0);

  const handleSave = async () => {
    setError(null);
    if (!fundManager.trim()) return setError("Please enter the pension fund manager.");
    if (!(parseFloat(amount) > 0) && !(parseFloat(total) > 0)) return setError("Enter your usual contribution or the total contributed so far.");
    const schemes = SCHEMES.filter(({ code }) => parseFloat(units[code]) > 0).map(({ code }) => ({
      scheme: code,
      units: parseFloat(units[code]),
      nav: parseFloat(navs[code]) || 0,
      nav_date: navDate || null,
    }));
    if (schemes.some((s) => !(s.nav > 0))) return setError("Enter the NAV for every scheme that has units.");
    setSaving(true);
    try {
      await api.saveNpsAccount({
        fund_manager: fundManager.trim(),
        tier,
        pran: pran.trim() || null,
        start_date: startDate,
        contribution_amount: parseFloat(amount) || 0,
        contribution_frequency: frequency,
        total_contributed: parseFloat(total) || null,
        status,
        profile_id: profileId ? parseInt(profileId) : null,
        schemes,
      }, initial?.id);
      await onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? "Edit NPS Account" : "Add NPS Account"}>
      <div className="space-y-4 pb-4">
        {profiles.length > 1 && (
          <div>
            <label className={LABEL}>For</label>
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className={INPUT}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.relation})</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={LABEL}>Pension fund manager</label>
          <input list="nps-fund-managers" value={fundManager} onChange={(e) => setFundManager(e.target.value)} placeholder="e.g. SBI Pension Funds" className={INPUT} />
          <datalist id="nps-fund-managers">{FUND_MANAGERS.map((m) => <option key={m} value={m} />)}</datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className={INPUT}>
              <option value="TIER_1">Tier I</option>
              <option value="TIER_2">Tier II</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>First contribution</label>
            <DatePicker value={startDate} onChange={(v) => setStartDate(v)} className={INPUT} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Usual contribution (₹)</label>
            <input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5,000" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Paid</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={INPUT}>
              {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL}>Total contributed so far (₹)</label>
          <input type="number" min="0" step="any" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="From your NPS statement" className={INPUT} />
          <p className="text-[10px] text-neutral-400 mt-1">Optional. If you enter it, returns use this total spread over your contributions.</p>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Units and NAV (from your statement)</span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">{inr(value)}</span>
          </div>
          {SCHEMES.map(({ code, name }) => (
            <div key={code} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{name}</span>
              <input type="number" min="0" step="any" inputMode="decimal" aria-label={`${name} units`} placeholder="Units" value={units[code]} onChange={(e) => setUnits({ ...units, [code]: e.target.value })} className={INPUT} />
              <input type="number" min="0" step="any" inputMode="decimal" aria-label={`${name} NAV`} placeholder="NAV" value={navs[code]} onChange={(e) => setNavs({ ...navs, [code]: e.target.value })} className={INPUT} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={LABEL}>NAV date</label>
              <DatePicker value={navDate} onChange={(v) => setNavDate(v)} className={INPUT} />
            </div>
          </div>
        </div>

        <details open={!!(initial?.pran || initial?.status === "CLOSED")} className="group rounded-xl border border-neutral-200 dark:border-white/10">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">More details (optional)</summary>
          <div className="grid grid-cols-2 gap-3 px-3 pb-3">
            <div>
              <label className={LABEL}>PRAN</label>
              <input value={pran} onChange={(e) => setPran(e.target.value)} className={INPUT} />
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
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-semibold text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? "Saving…" : initial ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
