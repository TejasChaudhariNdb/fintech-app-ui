"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowUpRight,
  Calculator,
  HelpCircle
} from "lucide-react";
import { api } from "@/lib/api";

interface RecordItem {
  code: string;
  scrip: string;
  isin: string;
  bought_date: string;
  bought_qty: number;
  bought_rate: number;
  bought_value: number;
  sold_date: string;
  sold_qty: number;
  sold_rate: number;
  sold_value: number;
  fmv_2018_01_31?: number;
  ltcg?: number;
  profit_loss: number;
  holding_period: number;
  asset_type: string;
}

interface SummaryData {
  financial_year: string;
  start_date: string;
  end_date: string;
  total_ltcg: number;
  total_stcg: number;
  net_realized_gain: number;
  total_buy_value: number;
  total_sale_value: number;
  total_trades: number;
  ltcg_count: number;
  stcg_count: number;
  est_stcg_tax: number;
  est_ltcg_tax: number;
  total_est_tax: number;
  ltcg_records: RecordItem[];
  stcg_records: RecordItem[];
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const defaultFY =
    currentMonth >= 4
      ? `${currentYear}-${(currentYear + 1).toString().slice(2)}`
      : `${currentYear - 1}-${currentYear.toString().slice(2)}`;

  const [financialYear, setFinancialYear] = useState<string>("all");
  const [assetClass, setAssetClass] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"ltcg" | "stcg">("ltcg");

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fyOptions = useMemo(() => {
    const options: string[] = ["all"];
    const endYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    for (let y = endYear; y >= 2014; y--) {
      options.push(`${y}-${(y + 1).toString().slice(2)}`);
    }
    return options;
  }, [currentYear, currentMonth]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCapitalGainsSummary(financialYear, assetClass);
      setSummary(data);
    } catch (e: any) {
      console.error("Failed to fetch capital gains summary", e);
      setError(e.message || "Failed to load capital gains data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [financialYear, assetClass]);

  const handleDownload = async (reportType: string) => {
    try {
      setDownloadingType(reportType);
      await api.downloadCapitalGainsCSV(financialYear, assetClass, reportType);
    } catch (e: any) {
      console.error(`Download error for ${reportType}:`, e);
      alert(e.message || "Failed to download CSV report.");
    } finally {
      setDownloadingType(null);
    }
  };

  const currentRecords = useMemo(() => {
    if (!summary) return [];
    const list = activeTab === "ltcg" ? summary.ltcg_records : summary.stcg_records;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (r) =>
        r.scrip.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term) ||
        r.isin.toLowerCase().includes(term)
    );
  }, [summary, activeTab, searchTerm]);

  return (
    <div className="py-6 px-4 lg:px-0 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-72 h-72 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={14} className="text-primary-400" />
            Tax & Capital Gains Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Tax Filing & Capital Gains Reports
          </h1>
          <p className="text-sm text-neutral-300 max-w-xl leading-relaxed">
            Download tax-ready CSV statements for income tax return (ITR) filing and review realized profit & loss for Financial Year {financialYear}.
          </p>
        </div>

        {/* Global Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Financial Year Selector */}
          <div className="flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2 text-xs font-semibold">
            <Calendar size={16} className="text-primary-300" />
            <span className="text-neutral-300">Financial Year:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer pr-1">
              {fyOptions.map((fy) => (
                <option key={fy} value={fy} className="bg-slate-900 text-white">
                  {fy === "all" ? "All Time (All Years)" : `FY ${fy}`}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Class Filter */}
          <div className="flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2 text-xs font-semibold">
            <Filter size={16} className="text-primary-300" />
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer">
              <option value="all" className="bg-slate-900 text-white">All Investments</option>
              <option value="equity" className="bg-slate-900 text-white">Stocks Only</option>
              <option value="mutual_fund" className="bg-slate-900 text-white">Mutual Funds Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0F1219] rounded-3xl border border-neutral-200/80 dark:border-white/5">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mb-4" />
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Calculating Capital Gains & Tax Summary for FY {financialYear}...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchSummary}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition">
            Retry
          </button>
        </div>
      ) : summary ? (
        <>
          {/* Enhanced Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Net Realized Gain */}
            <div className="bg-linear-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-[#0F1219] p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="text-xs font-bold tracking-wide uppercase">Net Realized Profit / Loss</span>
                {summary.net_realized_gain >= 0 ? (
                  <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                ₹{summary.net_realized_gain.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                <span>Sales: ₹{summary.total_sale_value.toLocaleString("en-IN")}</span>
                <span>•</span>
                <span>Buys: ₹{summary.total_buy_value.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* 2. Long-Term Capital Gains */}
            <div className="bg-linear-to-br from-indigo-50/90 via-blue-50/40 to-white dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-[#0F1219] p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-indigo-800 dark:text-indigo-300">
                <span className="text-xs font-bold tracking-wide uppercase">Long-Term Gains (LTCG)</span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  {summary.ltcg_count} sell trades
                </span>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                ₹{summary.total_ltcg.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Est. Tax: <span className="font-bold text-neutral-800 dark:text-neutral-200">₹{summary.est_ltcg_tax.toLocaleString("en-IN")}</span> (@12.5% above ₹1.25L exemption)
              </p>
            </div>

            {/* 3. Short-Term Capital Gains */}
            <div className="bg-linear-to-br from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/30 dark:via-orange-950/20 dark:to-[#0F1219] p-5 rounded-3xl border border-amber-200/80 dark:border-amber-500/20 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                <span className="text-xs font-bold tracking-wide uppercase">Short-Term Gains (STCG)</span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {summary.stcg_count} sell trades
                </span>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                ₹{summary.total_stcg.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Est. Tax: <span className="font-bold text-neutral-800 dark:text-neutral-200">₹{summary.est_stcg_tax.toLocaleString("en-IN")}</span> (@20% standard rate)
              </p>
            </div>

            {/* 4. Professional Total Estimated Tax Liability Card */}
            <div className="bg-slate-900 dark:bg-[#111622] p-5 rounded-3xl border border-slate-800 dark:border-primary-500/30 text-white shadow-md space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  Estimated Tax Liability
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-amber-400 dark:text-amber-300">
                ₹{summary.total_est_tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
                <span>STCG Tax: ₹{summary.est_stcg_tax.toLocaleString("en-IN")}</span>
                <span>LTCG Tax: ₹{summary.est_ltcg_tax.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Downloadable Tax Reports Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary-500" />
                  Downloadable Tax Reports (CSV)
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Select and download tax-ready statements formatted for Income Tax Return filing and personal records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Income Tax Portal ITR Schedule 112A CSV */}
              <div className="bg-white dark:bg-[#0F1219] p-6 rounded-3xl border border-neutral-200/80 dark:border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={12} /> ITR Filing Ready
                    </span>
                    <FileText className="w-5 h-5 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Income Tax Portal Template (Schedule 112A)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                      Ready-to-upload CSV report for filing your long-term capital gains directly on the Income Tax Portal.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload("it_portal_112a")}
                  disabled={downloadingType === "it_portal_112a"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-50 cursor-pointer">
                  {downloadingType === "it_portal_112a" ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Download size={15} />
                  )}
                  Download ITR 112A CSV
                </button>
              </div>

              {/* 2. Detailed LTCG Tax Statement */}
              <div className="bg-white dark:bg-[#0F1219] p-6 rounded-3xl border border-neutral-200/80 dark:border-white/5 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                      <Layers size={12} /> Long-Term Gains
                    </span>
                    <FileSpreadsheet className="w-5 h-5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Long-Term Capital Gains Statement (LTCG)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                      Detailed summary of profits from investments held for over 1 year, including pre-2018 tax relief calculations.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload("ltcg_detailed")}
                  disabled={downloadingType === "ltcg_detailed"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer">
                  {downloadingType === "ltcg_detailed" ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Download size={15} />
                  )}
                  Download LTCG Statement
                </button>
              </div>

              {/* 3. Detailed STCG Tax Statement */}
              <div className="bg-white dark:bg-[#0F1219] p-6 rounded-3xl border border-neutral-200/80 dark:border-white/5 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <ArrowUpRight size={12} /> Short-Term Gains
                    </span>
                    <FileSpreadsheet className="w-5 h-5 text-neutral-400 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Short-Term Capital Gains Statement (STCG)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                      Detailed summary of profits from investments held for 1 year or less.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload("stcg_detailed")}
                  disabled={downloadingType === "stcg_detailed"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold transition-all shadow-sm shadow-amber-600/20 disabled:opacity-50 cursor-pointer">
                  {downloadingType === "stcg_detailed" ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Download size={15} />
                  )}
                  Download STCG Statement
                </button>
              </div>
            </div>
          </div>

          {/* Realized Capital Gain Transactions Preview Table */}
          <div className="bg-white dark:bg-[#0F1219] rounded-3xl border border-neutral-200/80 dark:border-white/5 overflow-hidden shadow-xs">
            {/* Table Header & Controls */}
            <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {/* Tabs */}
                <div className="flex p-1 bg-neutral-100 dark:bg-white/5 rounded-2xl">
                  <button
                    onClick={() => setActiveTab("ltcg")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "ltcg"
                        ? "bg-white dark:bg-[#151A23] text-primary-600 dark:text-primary-400 shadow-xs"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}>
                    Long-Term (LTCG: {summary.ltcg_count})
                  </button>
                  <button
                    onClick={() => setActiveTab("stcg")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "stcg"
                        ? "bg-white dark:bg-[#151A23] text-primary-600 dark:text-primary-400 shadow-xs"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}>
                    Short-Term (STCG: {summary.stcg_count})
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by stock, scheme, or ISIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 text-xs text-neutral-900 dark:text-white outline-none border border-transparent focus:border-primary-500/50 transition-all"
                />
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-white/2 text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-100 dark:border-white/5">
                  <tr>
                    <th className="py-3.5 px-4">Security / ISIN</th>
                    <th className="py-3.5 px-4">Buy Date</th>
                    <th className="py-3.5 px-4 text-right">Buy Qty & Rate</th>
                    <th className="py-3.5 px-4 text-right">Buy Amount</th>
                    <th className="py-3.5 px-4">Sale Date</th>
                    <th className="py-3.5 px-4 text-right">Sale Rate</th>
                    <th className="py-3.5 px-4 text-right">Sale Amount</th>
                    {activeTab === "ltcg" && (
                      <th className="py-3.5 px-4 text-right">Jan 31, 2018 FMV</th>
                    )}
                    <th className="py-3.5 px-4 text-right">Realized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 text-neutral-700 dark:text-neutral-300">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTab === "ltcg" ? 9 : 8}
                        className="py-12 text-center text-neutral-400">
                        No {activeTab.toUpperCase()} realized gain transactions found for FY {financialYear}.
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white max-w-[220px]">
                          <div className="truncate font-bold">{r.scrip}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                              {r.asset_type === "STOCK" ? "STOCK" : "MUTUAL FUND"}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-normal font-mono truncate">{r.isin || r.code}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">{r.bought_date}</td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-semibold">{r.bought_qty}</div>
                          <div className="text-[10px] text-neutral-400">@ ₹{r.bought_rate.toLocaleString("en-IN")}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium">
                          ₹{r.bought_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">{r.sold_date}</td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium">
                          ₹{r.sold_rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium">
                          ₹{r.sold_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        {activeTab === "ltcg" && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-neutral-400 font-mono">
                            {r.fmv_2018_01_31 && r.fmv_2018_01_31 > 0
                              ? `₹${r.fmv_2018_01_31.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                              : "-"}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold">
                          <span
                            className={
                              r.profit_loss >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }>
                            {r.profit_loss >= 0 ? "+" : ""}
                            ₹{r.profit_loss.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
