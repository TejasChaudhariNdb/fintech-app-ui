"use client";

// Tax page: interest from deposits, bonds, SGBs and PPF/EPF ("income from other sources"). Numbers come from the
// backend's interest schedule, so they match Deposits → Interest Schedule.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Download, Loader2, Info } from "lucide-react";
import { api, InterestIncomeSummary } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import PrivacyMask from "@/components/ui/PrivacyMask";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function InterestIncomeSection({ financialYear }: { financialYear: string }) {
  const { activeProfileId } = useProfile();
  const [data, setData] = useState<InterestIncomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getInterestIncome(financialYear)
      .then((d) => !cancelled && setData(d))
      .catch((e) => console.error("Failed to load interest income", e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [financialYear, activeProfileId]);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1219] border border-neutral-200/80 dark:border-white/5 flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 size={16} className="animate-spin" /> Loading interest income…
      </div>
    );
  }
  if (!data || (data.instruments.length === 0 && data.cumulative_fd_payouts_skipped === 0)) return null;

  const fyLabel = data.financial_year === "All-Time" ? "all years up to today" : `FY ${data.financial_year}`;
  const download = async () => {
    try {
      setDownloading(true);
      await api.downloadInterestScheduleCSV(data.schedule_fy, activeProfileId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not download the CSV");
    } finally {
      setDownloading(false);
    }
  };

  const stats = [
    { label: "Taxable interest", value: data.total_taxable, note: "Income from other sources" },
    { label: "Tax-free interest", value: data.total_tax_free, note: "PPF, EPF, tax-free bonds" },
    { label: "TDS deducted", value: data.total_tds, note: "Check against Form 26AS / AIS" },
    { label: "Not marked received", value: data.total_not_yet_marked + data.total_upcoming, note: "Expected amount used" },
  ];

  return (
    <div className="bg-white dark:bg-[#0F1219] rounded-3xl border border-neutral-200/80 dark:border-white/5 shadow-xs p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Landmark size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Interest income</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              FDs, bonds, SGBs, PPF/EPF for {fyLabel}. Not a capital gain: it is taxed at your slab rate.
            </p>
          </div>
        </div>
        <button
          onClick={download}
          disabled={downloading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Download Interest CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-3 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block uppercase tracking-wider">{s.label}</span>
            <span className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">
              <PrivacyMask>{inr(s.value)}</PrivacyMask>
            </span>
            <span className="text-[10px] text-neutral-400 block">{s.note}</span>
          </div>
        ))}
      </div>

      {data.instruments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100 dark:border-white/5">
                <th className="py-2 pr-3">Instrument</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Tax</th>
                <th className="py-2 pr-3 text-right">Interest</th>
                <th className="py-2 pr-3 text-right">TDS</th>
                <th className="py-2 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {data.instruments.map((r) => (
                <tr key={`${r.source}_${r.holding_id}`}>
                  <td className="py-2 pr-3 font-medium text-neutral-900 dark:text-white">{r.instrument_name}</td>
                  <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-300">{r.owner}</td>
                  <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-300">{r.tax_status}</td>
                  <td className="py-2 pr-3 text-right font-bold tabular-nums text-neutral-900 dark:text-white"><PrivacyMask>{inr(r.interest)}</PrivacyMask></td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300"><PrivacyMask>{inr(r.tds)}</PrivacyMask></td>
                  <td className="py-2 text-right tabular-nums text-neutral-600 dark:text-neutral-300">{r.received_payouts} / {r.payouts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
        <Info size={13} className="shrink-0 mt-0.5" />
        <p>
          Received payouts use the amount you entered; others use the expected amount.{" "}
          {data.cumulative_fd_payouts_skipped > 0 &&
            `${data.cumulative_fd_payouts_skipped} cumulative FD maturity payout(s) are left out: their interest is taxed each year as it accrues, so use your bank's interest certificate. `}
          Pension and salary are not included. Mark payouts received and add TDS in{" "}
          <Link href="/holdings/deposits?view=schedule" className="text-emerald-600 dark:text-emerald-400 font-semibold underline">
            Deposits → Interest Schedule
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
