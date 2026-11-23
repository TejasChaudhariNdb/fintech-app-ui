"use client";

// Tax page: capital gains (by fund type, with the 23 Jul 2024 rate change, 31 Jan 2018 grandfathering and loss
// set-off worked out by the backend) and interest income, for one FY. Redesigned 2026-11-23 after a user report.
import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  Pencil,
  Search,
  AlertTriangle,
  Info,
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt,
} from "lucide-react";
import { api, CapitalGainRecord, CapitalGainsSummary, FyTaxSummary } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import PrivacyMask from "@/components/ui/PrivacyMask";
import InterestIncomeSection from "@/components/features/InterestIncomeSection";
import TradeEditModal from "@/components/features/TradeEditModal";

const inr = (n: number) => `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const SLAB_KEY = "tax_slab_rate";
const TYPE_LABEL: Record<string, string> = { EQUITY: "Equity", DEBT: "Debt", OTHER: "Gold / Intl" };
const SLAB_OPTIONS = [null, 0, 5, 10, 15, 20, 30];

function defaultFy(): string {
  // April to July is filing season for the year just ended; otherwise show the current year.
  const now = new Date();
  const m = now.getMonth() + 1;
  const startOfCurrent = m >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const start = m >= 4 && m <= 7 ? startOfCurrent - 1 : startOfCurrent;
  return `${start}-${String(start + 1).slice(2)}`;
}

const card = "bg-white dark:bg-[#0F1219] border border-neutral-200/80 dark:border-white/5 rounded-3xl shadow-xs";
const selectCls =
  "bg-neutral-100 dark:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-white outline-none focus:border-primary-500 cursor-pointer";

function GainText({ value }: { value: number }) {
  return (
    <span className={`tabular-nums font-bold ${value > 0 ? "text-emerald-600 dark:text-emerald-400" : value < 0 ? "text-rose-600 dark:text-rose-400" : "text-neutral-500"}`}>
      <PrivacyMask>{value > 0 ? "+" : ""}{inr(value)}</PrivacyMask>
    </span>
  );
}

function FyTaxTable({ fy, slabChosen }: { fy: FyTaxSummary; slabChosen: boolean }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100 dark:border-white/5 text-left">
              <th className="py-2 pr-3 font-semibold">Type</th>
              <th className="py-2 pr-3 font-semibold text-right">Gain</th>
              <th className="py-2 pr-3 font-semibold text-right">After losses</th>
              <th className="py-2 pr-3 font-semibold text-right">Taxable</th>
              <th className="py-2 font-semibold text-right">Tax</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
            {fy.lines.map((l) => (
              <tr key={l.rate_key}>
                <td className="py-2 pr-3 text-neutral-800 dark:text-neutral-200">{l.label}</td>
                <td className="py-2 pr-3 text-right tabular-nums"><PrivacyMask>{inr(l.gain)}</PrivacyMask></td>
                <td className="py-2 pr-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400"><PrivacyMask>{inr(l.after_set_off)}</PrivacyMask></td>
                <td className="py-2 pr-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400"><PrivacyMask>{inr(l.taxable)}</PrivacyMask></td>
                <td className="py-2 text-right tabular-nums font-bold text-neutral-900 dark:text-white">
                  {l.tax === null ? <span className="text-xs font-medium text-neutral-500">at your slab</span> : <PrivacyMask>{inr(l.tax)}</PrivacyMask>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
        {fy.equity_ltcg_exemption_used > 0 && (
          <li>
            Equity LTCG exemption used: <PrivacyMask>{inr(fy.equity_ltcg_exemption_used)}</PrivacyMask> of {inr(fy.equity_ltcg_exemption_limit)}.
          </li>
        )}
        {(fy.st_loss > 0 || fy.lt_loss > 0) && (
          <li>
            Losses set off: short-term <PrivacyMask>{inr(fy.st_loss)}</PrivacyMask> (against any gain), long-term{" "}
            <PrivacyMask>{inr(fy.lt_loss)}</PrivacyMask> (only against long-term gains), highest-taxed gains first.
          </li>
        )}
        {(fy.st_loss_carry_forward > 0 || fy.lt_loss_carry_forward > 0) && (
          <li className="text-amber-700 dark:text-amber-400">
            Loss to carry forward (up to 8 years, if you file on time): short-term <PrivacyMask>{inr(fy.st_loss_carry_forward)}</PrivacyMask>, long-term{" "}
            <PrivacyMask>{inr(fy.lt_loss_carry_forward)}</PrivacyMask>.
          </li>
        )}
        {fy.slab_gain_taxable > 0 && !slabChosen && (
          <li>
            <PrivacyMask>{inr(fy.slab_gain_taxable)}</PrivacyMask> is taxed at your income slab (debt funds, short-term non-equity). Pick your slab above to include it.
          </li>
        )}
      </ul>
    </div>
  );
}

export default function ReportsPage() {
  const { activeProfileId } = useProfile();
  const [financialYear, setFinancialYear] = useState<string>(defaultFy);
  const [assetClass, setAssetClass] = useState<string>("all");
  const [slabRate, setSlabRate] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(SLAB_KEY);
      return v === null || v === "" ? null : Number(v);
    } catch {
      return null;
    }
  });
  const [summary, setSummary] = useState<CapitalGainsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const [termFilter, setTermFilter] = useState<"all" | "lt" | "st">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState<CapitalGainRecord | null>(null);

  const fyOptions = useMemo(() => {
    const now = new Date();
    const end = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    const out: string[] = [];
    for (let y = end; y >= 2014; y--) out.push(`${y}-${String(y + 1).slice(2)}`);
    return [...out, "all"];
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(await api.getCapitalGainsSummary(financialYear, assetClass, slabRate));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your capital gains.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialYear, assetClass, slabRate, activeProfileId]);

  const changeSlab = (v: string) => {
    const next = v === "" ? null : Number(v);
    setSlabRate(next);
    try {
      localStorage.setItem(SLAB_KEY, v);
    } catch {
      /* private mode: not remembered */
    }
  };

  const handleDownload = async (reportType: string) => {
    try {
      setDownloadingType(reportType);
      await api.downloadCapitalGainsCSV(financialYear, assetClass, reportType);
    } catch (e) {
      alert("Could not download the CSV: " + (e instanceof Error ? e.message : "unknown error"));
    } finally {
      setDownloadingType(null);
    }
  };

  const records = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (summary?.records || []).filter(
      (r) =>
        (termFilter === "all" || (termFilter === "lt") === r.long_term) &&
        (typeFilter === "all" || r.tax_class === typeFilter) &&
        (!term || r.scrip.toLowerCase().includes(term) || r.code.toLowerCase().includes(term) || (r.isin || "").toLowerCase().includes(term))
    );
  }, [summary, termFilter, typeFilter, searchTerm]);

  const isAllTime = financialYear === "all";
  const fyLabel = isAllTime ? "all years" : `FY ${financialYear}`;
  const selectedFy = summary?.fy_summaries.find((f) => f.financial_year === financialYear);
  const w = summary?.warnings;
  const hasWarnings = !!w && (w.fmv_missing > 0 || w.cost_estimated > 0 || w.indexation_used > 0);
  const typesPresent = Array.from(new Set((summary?.records || []).map((r) => r.tax_class)));

  const downloads = [
    { type: "it_portal_112a", title: "Schedule 112A", desc: "Equity LTCG, ready for the ITR portal upload" },
    { type: "summary", title: "All trades (Schedule CG)", desc: "Every sale with its tax treatment" },
    { type: "ltcg_detailed", title: "Long-term statement", desc: "Lot-wise LTCG with 31 Jan 2018 values" },
    { type: "stcg_detailed", title: "Short-term statement", desc: "Lot-wise STCG" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header + controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Tax report</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Capital gains on mutual funds and stocks, and interest income, for your ITR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <Calendar size={16} className="text-neutral-400" aria-hidden />
            <span className="sr-only">Financial year</span>
            <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} className={selectCls}>
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>{fy === "all" ? "All years" : `FY ${fy}`}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Investments</span>
            <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className={selectCls}>
              <option value="all">Mutual funds &amp; stocks</option>
              <option value="mutual_fund">Mutual funds</option>
              <option value="equity">Stocks</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
            <span>Your slab</span>
            <select value={slabRate === null ? "" : String(slabRate)} onChange={(e) => changeSlab(e.target.value)} className={selectCls}>
              {SLAB_OPTIONS.map((v) => (
                <option key={String(v)} value={v === null ? "" : String(v)}>{v === null ? "Not set" : `${v}%`}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className={`${card} py-16 flex flex-col items-center gap-3 text-neutral-500`}>
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm">Matching every sale to its purchase (FIFO)…</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{error}</p>
          <button onClick={fetchSummary} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer">
            Retry
          </button>
        </div>
      ) : summary ? (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Estimated tax", value: summary.estimated_tax, note: slabRate === null && summary.slab_gain_taxable > 0 ? "Excl. slab-rate gains, cess" : "Excl. 4% cess & surcharge", strong: true },
              { label: "Short-term gains", value: summary.total_stcg, note: `${summary.stcg_count} sale${summary.stcg_count === 1 ? "" : "s"}` },
              { label: "Long-term gains", value: summary.total_ltcg, note: `${summary.ltcg_count} sale${summary.ltcg_count === 1 ? "" : "s"} · taxable value` },
              { label: "Profit / loss", value: summary.net_realized_gain, note: `Sold for ${inr(summary.total_sale_value)}` },
            ].map((s) => (
              <div key={s.label} className={`p-4 rounded-3xl border ${s.strong ? "bg-slate-900 dark:bg-white/5 border-slate-900 dark:border-white/10 text-white" : "bg-white dark:bg-[#0F1219] border-neutral-200/80 dark:border-white/5"}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${s.strong ? "text-slate-300" : "text-neutral-500"}`}>{s.label}</p>
                <p className={`text-xl sm:text-2xl font-black tabular-nums mt-1 ${s.strong ? "text-amber-300" : "text-neutral-900 dark:text-white"}`}>
                  <PrivacyMask>{inr(s.value)}</PrivacyMask>
                </p>
                <p className={`text-[11px] mt-0.5 ${s.strong ? "text-slate-400" : "text-neutral-500"}`}>{s.note}</p>
              </div>
            ))}
          </div>

          {summary.total_trades === 0 ? (
            <div className={`${card} p-6 flex items-start gap-3`}>
              <Info size={18} className="text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                <p className="font-semibold text-neutral-900 dark:text-white">No mutual fund or stock sales in {fyLabel}.</p>
                <p>
                  Capital gains come only from selling. If you sold through another app (Groww, Zerodha, Kuvera), import that account&apos;s CAS or
                  tradebook first so those sales show here. FD and bond interest is not a capital gain; it is shown below.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              {/* Tax working */}
              <div className={`${card} p-4 sm:p-6 xl:col-span-3 space-y-4`}>
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-primary-600 dark:text-primary-400" />
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">How your tax is worked out</h2>
                </div>
                {isAllTime ? (
                  <div className="space-y-3">
                    {summary.fy_summaries.map((fy) => (
                      <details key={fy.financial_year} className="group rounded-2xl border border-neutral-100 dark:border-white/5 p-3">
                        <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-neutral-900 dark:text-white">
                          <span>FY {fy.financial_year}</span>
                          <span className="tabular-nums"><PrivacyMask>{inr(fy.estimated_tax)}</PrivacyMask></span>
                        </summary>
                        <div className="pt-3">
                          <FyTaxTable fy={fy} slabChosen={slabRate !== null} />
                        </div>
                      </details>
                    ))}
                  </div>
                ) : selectedFy ? (
                  <FyTaxTable fy={selectedFy} slabChosen={slabRate !== null} />
                ) : null}
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Rates: equity short-term 15% (sold before 23 Jul 2024) / 20% after; equity long-term (held over 12 months) 10% / 12.5% above ₹1 lakh
                  (₹1.25 lakh from FY 2024-25). Debt funds bought from 1 Apr 2023 are taxed at your slab. An estimate: check with your CA or the ITR
                  utility before filing.
                </p>
              </div>

              {/* By type + attention */}
              <div className="xl:col-span-2 space-y-4">
                <div className={`${card} p-4 sm:p-6 space-y-3`}>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">By investment type</h2>
                  <ul className="divide-y divide-neutral-100 dark:divide-white/5">
                    {summary.groups.map((g) => (
                      <li key={`${g.asset_type}_${g.tax_class}`} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{g.label}</p>
                          <p className="text-[11px] text-neutral-500">{g.count} sale{g.count === 1 ? "" : "s"}</p>
                        </div>
                        <div className="text-right text-xs space-y-0.5">
                          <p>Short <GainText value={g.short_term_gain} /></p>
                          <p>Long <GainText value={g.long_term_gain} /></p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                {hasWarnings && w && (
                  <div className="p-4 sm:p-5 rounded-3xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={16} />
                      <h2 className="text-sm font-bold">Check before filing</h2>
                    </div>
                    <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 space-y-1.5 list-disc pl-4">
                      {w.cost_estimated > 0 && (
                        <li>{w.cost_estimated} sale{w.cost_estimated === 1 ? " has" : "s have"} no matching purchase in Arthavi, so the cost is your average cost. Import your full history (CAS from the first purchase) or edit the trade.</li>
                      )}
                      {w.fmv_missing > 0 && (
                        <li>{w.fmv_missing} sale{w.fmv_missing === 1 ? "" : "s"} of units bought before 1 Feb 2018 without a 31 Jan 2018 price, so the gain is not grandfathered and may be too high.</li>
                      )}
                      {w.indexation_used > 0 && (
                        <li>{w.indexation_used} long-term non-equity sale{w.indexation_used === 1 ? "" : "s"} before 23 Jul 2024 use indexed cost (CII).</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interest income (FDs, bonds, SGB, PPF) */}
          <InterestIncomeSection financialYear={financialYear} />

          {/* Downloads */}
          {summary.total_trades > 0 && (
            <div className={`${card} p-4 sm:p-6 space-y-3`}>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Downloads for {fyLabel}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {downloads.map((d) => (
                  <button
                    key={d.type}
                    onClick={() => handleDownload(d.type)}
                    disabled={downloadingType !== null}
                    className="text-left p-3.5 rounded-2xl border border-neutral-200 dark:border-white/10 hover:border-primary-500/60 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 transition-all cursor-pointer disabled:opacity-60 flex items-start gap-3"
                  >
                    {downloadingType === d.type ? (
                      <Loader2 size={16} className="animate-spin text-primary-600 shrink-0 mt-0.5" />
                    ) : (
                      <Download size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                    )}
                    <span>
                      <span className="block text-sm font-bold text-neutral-900 dark:text-white">{d.title}</span>
                      <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">{d.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Every sale */}
          {summary.total_trades > 0 && (
            <div className={`${card} overflow-hidden`}>
              <div className="p-4 sm:p-6 space-y-3 border-b border-neutral-100 dark:border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">Every sale ({records.length})</h2>
                  <div className="relative md:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search fund, stock or ISIN"
                      aria-label="Search sales"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {([["all", "All"], ["st", `Short-term (${summary.stcg_count})`], ["lt", `Long-term (${summary.ltcg_count})`]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setTermFilter(id)}
                      aria-pressed={termFilter === id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${termFilter === id ? "bg-primary-600 text-white" : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400"}`}
                    >
                      {label}
                    </button>
                  ))}
                  {typesPresent.length > 1 && <span className="w-px bg-neutral-200 dark:bg-white/10 mx-1" />}
                  {typesPresent.length > 1 &&
                    ["all", ...typesPresent].map((tc) => (
                      <button
                        key={tc}
                        onClick={() => setTypeFilter(tc)}
                        aria-pressed={typeFilter === tc}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${typeFilter === tc ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900" : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400"}`}
                      >
                        {tc === "all" ? "All types" : TYPE_LABEL[tc]}
                      </button>
                    ))}
                </div>
              </div>

              {records.length === 0 ? (
                <p className="p-8 text-center text-sm text-neutral-500">No sales match.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-neutral-500 bg-neutral-50 dark:bg-white/[0.02] text-left">
                          <th className="py-3 px-4 font-semibold">Fund / stock</th>
                          <th className="py-3 px-3 font-semibold">Bought</th>
                          <th className="py-3 px-3 font-semibold">Sold</th>
                          <th className="py-3 px-3 font-semibold text-right">Cost</th>
                          <th className="py-3 px-3 font-semibold text-right">Sale value</th>
                          <th className="py-3 px-3 font-semibold text-right">Taxable gain</th>
                          <th className="py-3 px-3 font-semibold"><span className="sr-only">Edit</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                        {records.map((r, i) => (
                          <tr key={`${r.sell_tx_id}_${r.buy_tx_id}_${i}`} className="hover:bg-neutral-50/70 dark:hover:bg-white/[0.02]">
                            <td className="py-3 px-4 max-w-xs">
                              <p className="font-semibold text-neutral-900 dark:text-white truncate" title={r.scrip}>{r.scrip}</p>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                                  {r.asset_type === "STOCK" ? "Stock" : "MF"} · {TYPE_LABEL[r.tax_class]}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${r.long_term ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                                  {r.rate_label}
                                </span>
                                {r.cost_estimated && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300">Cost estimated</span>}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                              <p className="text-neutral-800 dark:text-neutral-200">{r.bought_date}</p>
                              <p className="text-[11px] text-neutral-500">{r.bought_qty} @ ₹{r.bought_rate.toLocaleString("en-IN")}</p>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                              <p className="text-neutral-800 dark:text-neutral-200">{r.sold_date}</p>
                              <p className="text-[11px] text-neutral-500">@ ₹{r.sold_rate.toLocaleString("en-IN")} · {r.holding_period} days</p>
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums"><PrivacyMask>{inr(r.bought_value)}</PrivacyMask></td>
                            <td className="py-3 px-3 text-right tabular-nums"><PrivacyMask>{inr(r.sold_value)}</PrivacyMask></td>
                            <td className="py-3 px-3 text-right">
                              <GainText value={r.taxable_gain} />
                              {Math.abs(r.taxable_gain - r.profit_loss) >= 1 && (
                                <p className="text-[10px] text-neutral-500">
                                  Profit {inr(r.profit_loss)} · {r.fmv_2018_01_31 ? "31 Jan 2018 value" : "indexed cost"}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setEditingRecord(r)}
                                aria-label={`Edit sale of ${r.scrip}`}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 cursor-pointer"
                              >
                                <Pencil size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Phone cards */}
                  <ul className="md:hidden divide-y divide-neutral-100 dark:divide-white/5">
                    {records.map((r, i) => (
                      <li key={`${r.sell_tx_id}_${r.buy_tx_id}_${i}`} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-neutral-900 dark:text-white line-clamp-2">{r.scrip}</p>
                            <p className="text-[11px] text-neutral-500 mt-0.5">{r.rate_label}{r.cost_estimated ? " · cost estimated" : ""}</p>
                          </div>
                          <div className="text-right shrink-0 flex items-start gap-1">
                            <div>
                              <GainText value={r.taxable_gain} />
                              <p className="text-[10px] text-neutral-500 flex items-center justify-end gap-0.5">
                                {r.taxable_gain >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} taxable
                              </p>
                            </div>
                            <button onClick={() => setEditingRecord(r)} aria-label={`Edit sale of ${r.scrip}`} className="p-1.5 text-neutral-400 cursor-pointer">
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 tabular-nums">
                          <p>Bought {r.bought_date}<br /><PrivacyMask>{inr(r.bought_value)}</PrivacyMask></p>
                          <p className="text-right">Sold {r.sold_date}<br /><PrivacyMask>{inr(r.sold_value)}</PrivacyMask></p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      ) : null}

      {editingRecord && (
        <TradeEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            fetchSummary();
          }}
        />
      )}
    </div>
  );
}
