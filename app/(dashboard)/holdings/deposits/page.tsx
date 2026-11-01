"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import FixedIncomeModal from "@/components/features/FixedIncomeModal";
import { FixedIncomeFormData } from "@/components/features/FixedIncomeForm";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ExternalLink,
  Calendar,
  Percent,
  Clock,
  Sparkles,
  Download,
  Search,
  LayoutGrid,
  ListFilter,
  CalendarClock,
  FileSpreadsheet,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";

interface FixedIncomeItem {
  id: number;
  user_id: number;
  profile_id?: number;
  profile_name: string;
  profile_relation: string;
  deposit_type: string;
  institution_name: string;
  account_number_or_fdr?: string | null;
  principal_amount: number;
  interest_rate_pct: number;
  compounding_frequency: string;
  start_date: string;
  maturity_date: string;
  maturity_amount: number;
  current_value: number;
  accrued_interest: number;
  total_expected_interest: number;
  days_elapsed: number;
  days_to_maturity: number;
  progress_pct: number;
  is_tax_saving: boolean;
  is_maturing_soon: boolean;
  status: string;
  notes?: string | null;
  current_balance?: number | null;
  balance_as_of_date?: string | null;
  cumulative_deposits?: number | null;
  planned_annual_deposit?: number | null;
  created_at?: string | null;
}

interface MaturityBucket {
  count: number;
  principal?: number;
  total_principal?: number;
  maturity_amount?: number;
  total_maturity_amount?: number;
  interest?: number;
  label?: string;
}

interface CalendarMaturity {
  year: number;
  count: number;
  total_payout: number;
}

interface SummaryData {
  total_principal: number;
  total_current_value: number;
  total_maturity_value: number;
  total_accrued_interest: number;
  avg_interest_rate: number;
  count: number;
  maturing_soon_count: number;
  maturing_soon_amount: number;
  type_breakdown: Record<string, number>;
  maturity_buckets?: {
    matured: MaturityBucket;
    next_30d: MaturityBucket;
    next_90d: MaturityBucket;
    next_180d: MaturityBucket;
    next_365d: MaturityBucket;
    beyond_1y: MaturityBucket;
  };
  calendar_maturities?: CalendarMaturity[];
}

type ViewMode = "GRID" | "TIMELINE" | "REPORT";
type HorizonFilter = "ALL" | "OVERDUE" | "30D" | "90D" | "180D" | "365D" | "1Y_PLUS";
type SortField = "maturity_date" | "principal" | "rate" | "days_left";

function formatINRShort(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) {
    return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, "")}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(val / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  }
  if (abs >= 1000) {
    return `₹${(val / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
}

function getDepositTypeBadge(type: string): { label: string; color: string } {
  switch (type) {
    case "BANK_FD":
      return { label: "Bank FD", color: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20" };
    case "CORPORATE_FD":
      return { label: "Corporate FD", color: "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20" };
    case "POST_OFFICE":
      return { label: "Post Office", color: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20" };
    case "RBI_BOND":
      return { label: "RBI Bond", color: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/20" };
    case "TAX_FREE_BOND":
      return { label: "Tax-Free Bond", color: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/20" };
    case "PPF":
      return { label: "PPF", color: "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20" };
    case "RD":
      return { label: "Recurring Deposit", color: "bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/10" };
    default:
      return { label: type?.replace(/_/g, " ") || "Deposit", color: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/20" };
  }
}

function formatInstitutionName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "hdfc") return "HDFC Bank";
  if (lower === "icici") return "ICICI Bank";
  if (lower === "sbi") return "State Bank of India";
  if (lower === "axis" || lower === "axis bank") return "Axis Bank";
  if (lower === "kotak") return "Kotak Mahindra Bank";
  if (lower === "pnb") return "Punjab National Bank";
  if (trimmed === lower) {
    return trimmed.replace(/\b\w/g, (l) => l.toUpperCase());
  }
  return trimmed;
}

function formatDatePretty(dateStr?: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function FixedIncomePage() {
  const { activeProfileId } = useProfile();
  const [holdings, setHoldings] = useState<FixedIncomeItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View & Filter states
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("maturity_date");
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedIncomeItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getFixedIncomeHoldings(activeProfileId);
      if (res) {
        setHoldings(res.holdings || []);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error("Failed to load fixed income holdings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("added") === "true") {
        showToast("Deposit holding saved successfully");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [activeProfileId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FixedIncomeItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSaveHolding = async (payload: FixedIncomeFormData) => {
    if (editingItem) {
      await api.updateFixedIncomeHolding(editingItem.id, payload as any);
      showToast("Deposit updated successfully");
    } else {
      await api.addFixedIncomeHolding(payload as any);
      showToast("Deposit added successfully");
    }
    await loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this deposit record?")) return;
    try {
      await api.deleteFixedIncomeHolding(id);
      showToast("Deposit removed");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete deposit");
    }
  };

  // CSV Maturity Schedule Exporter
  const exportMaturityScheduleCSV = () => {
    if (holdings.length === 0) {
      showToast("No deposits to export");
      return;
    }

    const headers = [
      "Bank / Institution",
      "Account / FDR No",
      "Deposit Type",
      "Profile",
      "Principal (INR)",
      "Interest Rate (%)",
      "Compounding",
      "Start Date",
      "Maturity Date",
      "Days to Maturity",
      "Accrued Interest (INR)",
      "Current Value (INR)",
      "Expected Maturity Corpus (INR)",
      "Tax Saver",
      "Status",
    ];

    const rows = sortedHoldings.map((h) => [
      `"${h.institution_name.replace(/"/g, '""')}"`,
      `"${(h.account_number_or_fdr || "").replace(/"/g, '""')}"`,
      h.deposit_type,
      `"${h.profile_name}"`,
      h.principal_amount,
      h.interest_rate_pct,
      h.compounding_frequency,
      h.start_date || "",
      h.maturity_date || "",
      h.days_to_maturity ?? "",
      Math.round(h.accrued_interest || 0),
      Math.round(h.current_value || 0),
      Math.round(h.maturity_amount || 0),
      h.is_tax_saving ? "Yes" : "No",
      h.status || "ACTIVE",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Arthavi_FD_Maturity_Schedule_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Maturity Schedule exported to CSV");
  };

  // Filtered & Sorted Items
  const filteredHoldings = useMemo(() => {
    return holdings.filter((item) => {
      // Type Filter
      if (activeFilter === "BANK_FD" && item.deposit_type !== "BANK_FD") return false;
      if (activeFilter === "CORPORATE_FD" && item.deposit_type !== "CORPORATE_FD") return false;
      if (activeFilter === "POST_OFFICE" && !item.deposit_type?.includes("POST_OFFICE") && !item.deposit_type?.startsWith("PO_")) return false;
      if (activeFilter === "RBI_BOND" && item.deposit_type !== "RBI_BOND") return false;
      if (activeFilter === "TAX_FREE_BOND" && item.deposit_type !== "TAX_FREE_BOND") return false;
      if (activeFilter === "PPF" && item.deposit_type !== "PPF" && item.deposit_type !== "EPF") return false;
      if (activeFilter === "RD" && item.deposit_type !== "RD") return false;

      // Horizon Filter
      const d = item.days_to_maturity;
      if (horizonFilter === "OVERDUE" && d >= 0) return false;
      if (horizonFilter === "30D" && (d < 0 || d > 30)) return false;
      if (horizonFilter === "90D" && (d < 0 || d > 90)) return false;
      if (horizonFilter === "180D" && (d < 0 || d > 180)) return false;
      if (horizonFilter === "365D" && (d < 0 || d > 365)) return false;
      if (horizonFilter === "1Y_PLUS" && d <= 365) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.institution_name.toLowerCase().includes(q);
        const matchesFDR = (item.account_number_or_fdr || "").toLowerCase().includes(q);
        const matchesProfile = item.profile_name.toLowerCase().includes(q);
        const matchesType = item.deposit_type.toLowerCase().includes(q);
        if (!matchesName && !matchesFDR && !matchesProfile && !matchesType) return false;
      }

      return true;
    });
  }, [holdings, activeFilter, horizonFilter, searchQuery]);

  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      let comp = 0;
      if (sortField === "maturity_date") {
        comp = new Date(a.maturity_date || "9999").getTime() - new Date(b.maturity_date || "9999").getTime();
      } else if (sortField === "principal") {
        comp = a.principal_amount - b.principal_amount;
      } else if (sortField === "rate") {
        comp = a.interest_rate_pct - b.interest_rate_pct;
      } else if (sortField === "days_left") {
        comp = a.days_to_maturity - b.days_to_maturity;
      }
      return sortAsc ? comp : -comp;
    });
  }, [filteredHoldings, sortField, sortAsc]);

  // Aggregate totals for currently visible set
  const visiblePrincipal = useMemo(() => sortedHoldings.reduce((acc, h) => acc + h.principal_amount, 0), [sortedHoldings]);
  const visibleMaturity = useMemo(() => sortedHoldings.reduce((acc, h) => acc + (h.maturity_amount || 0), 0), [sortedHoldings]);
  const visibleAccrued = useMemo(() => sortedHoldings.reduce((acc, h) => acc + (h.accrued_interest || 0), 0), [sortedHoldings]);

  return (
    <div className="px-4 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP ACTION & SUMMARY BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Fixed Income &amp; Deposits
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
              Safe Yield &amp; Liquidity Flow
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Track bank FDs, corporate deposits, Post Office MIS/SCSS, RBI Bonds, Tax-Free Bonds, and PPF with maturity calendar alerts
          </p>
        </div>

        {/* Primary Page Actions — Clean single line on desktop */}
        <div className="flex items-center gap-2 sm:gap-2.5 self-stretch sm:self-auto justify-end shrink-0">
          <button
            onClick={exportMaturityScheduleCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Download complete FD maturity schedule as CSV"
          >
            <Download size={14} className="text-neutral-500 dark:text-neutral-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Refresh calculations"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Deposit</span>
          </button>
        </div>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            Total Principal Invested
          </div>
          <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
            <PrivacyMask>
              ₹{summary ? Math.round(summary.total_principal).toLocaleString("en-IN") : "0"}
            </PrivacyMask>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Across {summary?.count || 0} deposit{summary?.count === 1 ? "" : "s"}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            Current Accrued Value
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
            <PrivacyMask>
              ₹{summary ? Math.round(summary.total_current_value).toLocaleString("en-IN") : "0"}
            </PrivacyMask>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Compounded to date
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            Interest Accrued to Date
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-1">
            <TrendingUp size={16} />
            <PrivacyMask>
              +₹{summary ? Math.round(summary.total_accrued_interest).toLocaleString("en-IN") : "0"}
            </PrivacyMask>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Earned interest
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            Avg Weighted Yield
          </div>
          <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums flex items-center gap-1">
            <Percent size={18} className="text-amber-500" />
            <span>{summary ? summary.avg_interest_rate.toFixed(2) : "0.00"}%</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Per annum return
          </div>
        </Card>
      </div>

      {/* ── LIQUIDITY & MATURITY HORIZON CARDS ── */}
      {summary?.maturity_buckets && (
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CalendarClock size={15} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  Liquidity Horizon &amp; Maturity Schedule
                </h3>
                <p className="text-[11px] text-neutral-400 hidden sm:block">
                  Upcoming cash flow payouts grouped by maturity milestone
                </p>
              </div>
            </div>

            {horizonFilter !== "ALL" ? (
              <button
                onClick={() => setHorizonFilter("ALL")}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Clear Filter</span>
                <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px]">✕</span>
              </button>
            ) : (
              <span className="text-[11px] text-neutral-400">Tap bucket to filter</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: "30D", label: "Next 30 Days", data: summary.maturity_buckets.next_30d, alert: true },
              { id: "90D", label: "1 – 3 Months", data: summary.maturity_buckets.next_90d, alert: false },
              { id: "180D", label: "3 – 6 Months", data: summary.maturity_buckets.next_180d, alert: false },
              { id: "365D", label: "6 – 12 Months", data: summary.maturity_buckets.next_365d, alert: false },
              { id: "1Y_PLUS", label: "1+ Years", data: summary.maturity_buckets.beyond_1y, alert: false },
              { id: "OVERDUE", label: "Matured", data: summary.maturity_buckets.matured, alert: false },
            ].map((b) => {
              const isSelected = horizonFilter === b.id;
              const hasItems = (b.data?.count || 0) > 0;
              const isAlert = b.alert && hasItems;

              return (
                <button
                  key={b.id}
                  onClick={() => setHorizonFilter(isSelected ? "ALL" : (b.id as HorizonFilter))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                      : isAlert
                      ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30 hover:border-amber-400 shadow-2xs"
                      : hasItems
                      ? "bg-neutral-50/80 dark:bg-white/5 border-neutral-200/80 dark:border-white/10 hover:border-neutral-300"
                      : "bg-neutral-50/30 dark:bg-white/2 border-neutral-100 dark:border-white/5 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate">
                      {b.label}
                    </span>
                    {hasItems && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isAlert ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                    )}
                  </div>
                  <div className={`text-sm sm:text-base font-black tabular-nums tracking-tight ${isAlert ? "text-amber-700 dark:text-amber-400" : hasItems ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}>
                    {formatINRShort(b.data?.total_maturity_amount ?? b.data?.maturity_amount ?? 0)}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-medium mt-0.5 truncate">
                    {b.data?.count || 0} deposit{b.data?.count === 1 ? "" : "s"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TOOLBAR: VIEW SWITCHER, SEARCH & SORT ── */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Mode Switcher (Full width on mobile, sleek pill on desktop) */}
          <div className="flex items-center bg-neutral-100 dark:bg-white/10 p-1 rounded-2xl border border-neutral-200/80 dark:border-white/10 w-full md:w-auto shrink-0 shadow-2xs">
            <button
              onClick={() => setViewMode("GRID")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-white dark:bg-[#151A23] text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setViewMode("TIMELINE")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "TIMELINE"
                  ? "bg-white dark:bg-[#151A23] text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Maturity Timeline & Calendar View"
            >
              <CalendarClock size={14} />
              <span>Timeline</span>
            </button>

            <button
              onClick={() => setViewMode("REPORT")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "REPORT"
                  ? "bg-white dark:bg-[#151A23] text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Maturity Schedule Report"
            >
              <FileSpreadsheet size={14} />
              <span>Report Schedule</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-1 md:max-w-md justify-end">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search bank, FDR no, profile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-2.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none shrink-0"
            >
              <option value="maturity_date">Maturity Date</option>
              <option value="days_left">Days Remaining</option>
              <option value="principal">Principal</option>
              <option value="rate">Interest Rate</option>
            </select>

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
              title={sortAsc ? "Ascending" : "Descending"}
            >
              <ArrowUpDown size={14} className={sortAsc ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "ALL", label: `All (${holdings.length})` },
            { id: "BANK_FD", label: "Bank FDs" },
            { id: "CORPORATE_FD", label: "Corporate FDs (Bajaj/Shriram/MM)" },
            { id: "POST_OFFICE", label: "Post Office (MIS/SCSS)" },
            { id: "RBI_BOND", label: "RBI Bonds" },
            { id: "TAX_FREE_BOND", label: "Tax-Free Bonds (NHAI/REC)" },
            { id: "PPF", label: "PPF / EPF" },
            { id: "RD", label: "RDs" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === f.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                  : "bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
          {horizonFilter !== "ALL" && (
            <button
              onClick={() => setHorizonFilter("ALL")}
              className="px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold border border-primary-500/20 whitespace-nowrap flex items-center gap-1"
            >
              <span>Horizon: {horizonFilter}</span>
              <span className="text-[10px]">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT (GRID, TIMELINE, OR REPORT VIEW) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Loader2 size={32} className="animate-spin mb-3 text-emerald-600" />
          <p className="text-sm">Calculating compound interest &amp; accruals...</p>
        </div>
      ) : sortedHoldings.length === 0 ? (
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
              No Matching Deposits Found
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              {searchQuery || activeFilter !== "ALL" || horizonFilter !== "ALL"
                ? "Try adjusting your filters or search terms."
                : "Track your bank fixed deposits, corporate deposits, Post Office MIS/SCSS, and PPF in one place."}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>Add Your First Deposit</span>
            </button>
          </div>
        </div>
      ) : viewMode === "REPORT" ? (
        /* ── REPORT TABLE VIEW ── */
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/2 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-3.5 px-4">Bank / Institution</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Profile</th>
                  <th className="py-3.5 px-3 text-right">Principal</th>
                  <th className="py-3.5 px-3 text-right">Rate</th>
                  <th className="py-3.5 px-3">Maturity Date</th>
                  <th className="py-3.5 px-3 text-center">Days Left</th>
                  <th className="py-3.5 px-3 text-right">Accrued Int.</th>
                  <th className="py-3.5 px-4 text-right">Maturity Payout</th>
                  <th className="py-3.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {sortedHoldings.map((item) => {
                  const isMatured = item.status === "MATURED" || item.days_to_maturity < 0;
                  const isMaturingSoon = item.is_maturing_soon;
                  const badge = getDepositTypeBadge(item.deposit_type);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                        <div className="truncate max-w-[200px]" title={item.institution_name}>
                          {formatInstitutionName(item.institution_name)}
                        </div>
                        {item.account_number_or_fdr && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            {item.account_number_or_fdr}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {item.profile_name}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums text-neutral-900 dark:text-white whitespace-nowrap">
                        <PrivacyMask>₹{item.principal_amount.toLocaleString("en-IN")}</PrivacyMask>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        {item.interest_rate_pct}%
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                        {formatDatePretty(item.maturity_date)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isMatured ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-500">
                            Matured
                          </span>
                        ) : isMaturingSoon ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                            {item.days_to_maturity}d
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">
                            {item.days_to_maturity}d
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                        <PrivacyMask>+₹{Math.round(item.accrued_interest || 0).toLocaleString("en-IN")}</PrivacyMask>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-neutral-900 dark:text-white tabular-nums whitespace-nowrap">
                        <PrivacyMask>₹{Math.round(item.maturity_amount || 0).toLocaleString("en-IN")}</PrivacyMask>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 dark:border-white/10 bg-neutral-50/90 dark:bg-white/5 font-black text-xs sm:text-sm">
                  <td colSpan={3} className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300">
                    Total ({sortedHoldings.length} deposits)
                  </td>
                  <td className="py-3.5 px-3 text-right text-neutral-900 dark:text-white tabular-nums">
                    <PrivacyMask>₹{Math.round(visiblePrincipal).toLocaleString("en-IN")}</PrivacyMask>
                  </td>
                  <td colSpan={3} />
                  <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                    <PrivacyMask>+₹{Math.round(visibleAccrued).toLocaleString("en-IN")}</PrivacyMask>
                  </td>
                  <td className="py-3.5 px-4 text-right text-neutral-900 dark:text-white tabular-nums">
                    <PrivacyMask>₹{Math.round(visibleMaturity).toLocaleString("en-IN")}</PrivacyMask>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : viewMode === "TIMELINE" ? (
        /* ── TIMELINE VIEW ── */
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CalendarClock size={16} className="text-emerald-600" />
              <span>Upcoming Maturity Feed</span>
            </h3>

            <div className="relative border-l-2 border-emerald-500/30 dark:border-emerald-500/20 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-6">
              {sortedHoldings.map((item) => {
                const isMatured = item.status === "MATURED" || item.days_to_maturity < 0;
                const isMaturingSoon = item.is_maturing_soon;

                return (
                  <div key={item.id} className="relative group">
                    {/* Circle Node on Timeline */}
                    <div
                      className={`absolute -left-[23px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#151A23] ${
                        isMatured
                          ? "bg-neutral-400"
                          : isMaturingSoon
                          ? "bg-amber-500 animate-ping"
                          : "bg-emerald-600"
                      }`}
                    />
                    <div
                      className={`absolute -left-[23px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#151A23] ${
                        isMatured
                          ? "bg-neutral-400"
                          : isMaturingSoon
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                    />

                    <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                            {formatInstitutionName(item.institution_name)}
                          </span>
                          <span className="text-xs text-neutral-400">
                            • {formatDatePretty(item.maturity_date)}
                          </span>
                          {isMatured ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-700">
                              Matured
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                isMaturingSoon
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              In {item.days_to_maturity} days
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Principal: ₹{item.principal_amount.toLocaleString("en-IN")}</span>
                          <span>•</span>
                          <span>Yield: {item.interest_rate_pct}% p.a.</span>
                          <span>•</span>
                          <span>Profile: {item.profile_name}</span>
                        </div>
                      </div>

                      <div className="text-right sm:self-center self-start">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Expected Payout
                        </span>
                        <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tabular-nums">
                          <PrivacyMask>₹{Math.round(item.maturity_amount || 0).toLocaleString("en-IN")}</PrivacyMask>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── GRID CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedHoldings.map((item) => {
            const isMaturingSoon = item.is_maturing_soon;
            const isMatured = item.status === "MATURED";

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 shadow-xs hover:border-neutral-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                          {formatInstitutionName(item.institution_name)}
                        </h3>
                        {item.account_number_or_fdr && (
                          <span className="text-[10px] font-mono bg-neutral-100 dark:bg-white/10 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">
                            {item.account_number_or_fdr}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const badge = getDepositTypeBadge(item.deposit_type);
                          return (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                        {item.deposit_type === "TAX_FREE_BOND" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> 100% Tax-Free (Sec 10)
                          </span>
                        ) : item.is_tax_saving ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> 80C Tax Saver
                          </span>
                        ) : null}
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 dark:bg-white/5 text-neutral-500">
                          {item.profile_name}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill & Action Menu */}
                    <div className="flex items-center gap-2">
                      {isMatured ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                          Matured
                        </span>
                      ) : isMaturingSoon ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                          In {item.days_to_maturity}d
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                        title="Edit Deposit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Deposit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-neutral-100 dark:border-white/5">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        {item.deposit_type === "PPF"
                          ? (item.cumulative_deposits ? "Total Invested" : "Current Balance")
                          : "Principal Deposit"}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                        <PrivacyMask>
                          ₹
                          {(item.deposit_type === "PPF" && item.cumulative_deposits
                            ? item.cumulative_deposits
                            : item.deposit_type === "PPF" && item.current_balance
                            ? item.current_balance
                            : item.principal_amount
                          ).toLocaleString("en-IN")}
                        </PrivacyMask>
                      </span>
                      {item.deposit_type === "PPF" && !item.cumulative_deposits && item.balance_as_of_date && (
                        <span className="text-[10px] text-neutral-400 block truncate">
                          as of {formatDatePretty(item.balance_as_of_date)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Interest Rate
                      </span>
                      <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums flex items-center gap-1">
                        <span>{item.interest_rate_pct}%</span>
                        <span className="text-[10px] font-normal text-neutral-400">
                          ({item.compounding_frequency.toLowerCase().slice(0, 4)})
                        </span>
                      </span>
                      {item.deposit_type === "PPF" && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                          Govt guaranteed
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Current Accrued Value
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        <PrivacyMask>₹{Math.round(item.current_value).toLocaleString("en-IN")}</PrivacyMask>
                      </span>
                      {item.accrued_interest > 0 ? (
                        <span className="text-[10px] text-emerald-600 block">
                          +₹{Math.round(item.accrued_interest).toLocaleString("en-IN")} earned
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 block">
                          Accrues yearly
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Maturity Corpus
                      </span>
                      <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                        <PrivacyMask>₹{Math.round(item.maturity_amount).toLocaleString("en-IN")}</PrivacyMask>
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        on {formatDatePretty(item.maturity_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar and Tenure countdown */}
                <div className="pt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Tenure Progress ({item.progress_pct}%)</span>
                    <span>
                      {isMatured
                        ? "Completed"
                        : `${item.days_to_maturity} days remaining`}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isMatured
                          ? "bg-neutral-400"
                          : isMaturingSoon
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                      style={{ width: `${Math.min(100, item.progress_pct)}%` }}
                    />
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-neutral-400 italic pt-1 truncate">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PORTALED MODAL ── */}
      <FixedIncomeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveHolding}
        initialData={
          editingItem
            ? {
                id: editingItem.id,
                deposit_type: editingItem.deposit_type,
                institution_name: editingItem.institution_name,
                account_number_or_fdr: editingItem.account_number_or_fdr || undefined,
                principal_amount: editingItem.principal_amount,
                interest_rate_pct: editingItem.interest_rate_pct,
                compounding_frequency: editingItem.compounding_frequency,
                start_date: editingItem.start_date,
                maturity_date: editingItem.maturity_date,
                maturity_amount: editingItem.maturity_amount,
                is_tax_saving: editingItem.is_tax_saving,
                notes: editingItem.notes || undefined,
                profile_id: editingItem.profile_id,
              }
            : null
        }
      />

      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-[#1a202c] text-neutral-900 dark:text-white px-4 py-2.5 rounded-2xl shadow-xl border border-neutral-200 dark:border-white/10 flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px]">
            ✓
          </span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
