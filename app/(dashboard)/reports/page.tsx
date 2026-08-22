"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  PieChart,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  HelpCircle,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";

interface RecordItem {
  buy_tx_id?: number;
  sell_tx_id?: number;
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

  const [financialYear, setFinancialYear] = useState<string>("all");
  const [assetClass, setAssetClass] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"ltcg" | "stcg">("ltcg");

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Trade Edit Modal State
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [editBoughtDate, setEditBoughtDate] = useState<string>("");
  const [editSoldDate, setEditSoldDate] = useState<string>("");
  const [editBoughtRate, setEditBoughtRate] = useState<string>("");
  const [editSoldRate, setEditSoldRate] = useState<string>("");
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

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
      alert("Failed to download CSV: " + (e.message || "Unknown error"));
    } finally {
      setDownloadingType(null);
    }
  };

  const openEditModal = (r: RecordItem) => {
    setEditingRecord(r);
    setEditBoughtDate(r.bought_date || "");
    setEditSoldDate(r.sold_date || "");
    setEditBoughtRate(r.bought_rate ? String(r.bought_rate) : "");
    setEditSoldRate(r.sold_rate ? String(r.sold_rate) : "");
    setEditQuantity(r.bought_qty ? String(r.bought_qty) : "");
    setEditSuccessMsg(null);
  };

  const handleSaveTradeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      setSavingEdit(true);
      await api.updateTradeDetails({
        asset_type: editingRecord.asset_type,
        buy_tx_id: editingRecord.buy_tx_id,
        sell_tx_id: editingRecord.sell_tx_id,
        bought_date: editBoughtDate || null,
        sold_date: editSoldDate || null,
        bought_rate: editBoughtRate ? parseFloat(editBoughtRate) : null,
        sold_rate: editSoldRate ? parseFloat(editSoldRate) : null,
        quantity: editQuantity ? parseFloat(editQuantity) : null,
      });

      setEditSuccessMsg("Trade details updated successfully!");
      setTimeout(() => {
        setEditingRecord(null);
        setEditSuccessMsg(null);
        fetchSummary();
      }, 1000);
    } catch (err: any) {
      alert("Failed to update trade: " + (err.message || "Unknown error"));
    } finally {
      setSavingEdit(false);
    }
  };

  const recordsToFilter =
    activeTab === "ltcg"
      ? summary?.ltcg_records || []
      : summary?.stcg_records || [];

  const currentRecords = useMemo(() => {
    if (!searchTerm) return recordsToFilter;
    const term = searchTerm.toLowerCase();
    return recordsToFilter.filter(
      (r) =>
        r.scrip.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term) ||
        (r.isin && r.isin.toLowerCase().includes(term))
    );
  }, [recordsToFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
            Download tax-ready CSV statements for income tax return (ITR) filing and review realized profit & loss for {financialYear === "all" ? "All Time" : `Financial Year ${financialYear}`}.
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-500 border-t-transparent" />
          <p className="text-xs text-neutral-500 font-medium">Computing FIFO capital gains & tax statements...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={fetchSummary}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer">
            Retry
          </button>
        </div>
      ) : summary ? (
        <>
          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Realized Gain */}
            <div className="p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/30 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Net Realized Gain</span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className={`text-2xl font-extrabold ${summary.net_realized_gain >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"}`}>
                ₹{summary.net_realized_gain.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-[11px] text-emerald-600/80 dark:text-emerald-400/70 font-medium flex items-center justify-between">
                <span>Total Trades: {summary.total_trades}</span>
                <span>Sell Val: ₹{summary.total_sale_value.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Long-Term Capital Gain (LTCG) */}
            <div className="p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/30 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">LTCG (&gt;365 Days)</span>
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200">
                ₹{summary.total_ltcg.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-[11px] text-indigo-600/80 dark:text-indigo-400/70 font-medium flex items-center justify-between">
                <span>{summary.ltcg_count} Long-term trades</span>
                <span>Exemption: ₹1.25 Lakh/yr</span>
              </div>
            </div>

            {/* Short-Term Capital Gain (STCG) */}
            <div className="p-5 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">STCG (≤365 Days)</span>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40">
                  <Building2 size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200">
                ₹{summary.total_stcg.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-[11px] text-amber-600/80 dark:text-amber-400/70 font-medium flex items-center justify-between">
                <span>{summary.stcg_count} Short-term trades</span>
                <span>Tax Rate: 20%</span>
              </div>
            </div>

            {/* Estimated Tax Liability */}
            <div className="p-5 rounded-3xl bg-slate-900 dark:bg-[#111622] text-white border border-slate-800 dark:border-white/10 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Estimated Tax</span>
                <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                  <PieChart size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-amber-400">
                ₹{summary.total_est_tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-[11px] text-neutral-400 font-medium flex items-center justify-between">
                <span>STCG Tax: ₹{summary.est_stcg_tax.toLocaleString("en-IN")}</span>
                <span>LTCG Tax: ₹{summary.est_ltcg_tax.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Download CSV Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. IT Portal Template Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1219] border border-neutral-200/80 dark:border-white/5 shadow-xs hover:border-primary-500/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold mb-1.5">
                    Official Tax Template
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Income Tax Portal CSV (Schedule 112A)
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Formatted CSV file designed for direct upload to the official Income Tax e-Filing portal for filing ITR-2 / ITR-3.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-400">ITR Upload Ready</span>
                <button
                  onClick={() => handleDownload("it_portal_112a")}
                  disabled={downloadingType === "it_portal_112a"}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  {downloadingType === "it_portal_112a" ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Download size={15} />
                  )}
                  Download File
                </button>
              </div>
            </div>

            {/* 2. Detailed LTCG Report Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1219] border border-neutral-200/80 dark:border-white/5 shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold mb-1.5">
                    Long-Term Statement
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Long-Term Capital Gains Statement
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Itemized statement for trades held over 365 days. Includes purchase rates, sale rates, and taxable LTCG totals.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-400">{summary.ltcg_count} Trades</span>
                <button
                  onClick={() => handleDownload("ltcg_detailed")}
                  disabled={downloadingType === "ltcg_detailed"}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  {downloadingType === "ltcg_detailed" ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Download size={15} />
                  )}
                  Download Statement
                </button>
              </div>
            </div>

            {/* 3. Detailed STCG Report Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1219] border border-neutral-200/80 dark:border-white/5 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold mb-1.5">
                    Short-Term Statement
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Short-Term Capital Gains Statement
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Itemized statement for trades held 365 days or less. Displays buy/sell rates, quantities, holding periods, and net gain.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-400">{summary.stcg_count} Trades</span>
                <button
                  onClick={() => handleDownload("stcg_detailed")}
                  disabled={downloadingType === "stcg_detailed"}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  {downloadingType === "stcg_detailed" ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Download size={15} />
                  )}
                  Download Statement
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
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 text-neutral-700 dark:text-neutral-300">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTab === "ltcg" ? 10 : 9}
                        className="py-12 text-center text-neutral-400">
                        No {activeTab.toUpperCase()} realized gain transactions found for {financialYear === "all" ? "All Time" : `FY ${financialYear}`}.
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900 dark:text-white max-w-xs truncate">
                            {r.scrip}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                            <span>{r.code}</span>
                            {r.isin && <span>• ISIN: {r.isin}</span>}
                            <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-500 font-semibold">
                              {r.asset_type}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">
                          {r.bought_date}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          <div>{r.bought_qty.toLocaleString("en-IN")}</div>
                          <div className="text-[10px] text-neutral-400">@ ₹{r.bought_rate.toFixed(2)}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          ₹{r.bought_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">
                          {r.sold_date}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          ₹{r.sold_rate.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          ₹{r.sold_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        {activeTab === "ltcg" && (
                          <td className="py-3.5 px-4 text-right font-medium text-neutral-500">
                            {r.fmv_2018_01_31 && r.fmv_2018_01_31 > 0 ? `₹${r.fmv_2018_01_31.toFixed(2)}` : "-"}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right font-extrabold">
                          <span className={r.profit_loss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {r.profit_loss >= 0 ? "+" : ""}₹{r.profit_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-xl bg-neutral-100 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="Edit Trade Dates & Rates">
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
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

      {/* Edit Trade Modal Overlay */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111622] border border-neutral-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Edit Trade Details
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-sm">
                  {editingRecord.scrip} ({editingRecord.asset_type})
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {editSuccessMsg ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={36} />
                <p className="text-sm font-bold">{editSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSaveTradeEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Buy Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Buy Date
                    </label>
                    <input
                      type="date"
                      value={editBoughtDate}
                      onChange={(e) => setEditBoughtDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Sale Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Sale Date
                    </label>
                    <input
                      type="date"
                      value={editSoldDate}
                      onChange={(e) => setEditSoldDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Buy Rate */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Buy Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 150.00"
                      value={editBoughtRate}
                      onChange={(e) => setEditBoughtRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Sale Rate */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Sale Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 200.00"
                      value={editSoldRate}
                      onChange={(e) => setEditSoldRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Quantity / Units
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-white/10 transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                    {savingEdit ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : null}
                    Save Trade Details
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
