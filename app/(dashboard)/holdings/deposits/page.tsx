"use client";

import React, { useState, useEffect } from "react";
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
  AlertCircle,
  ExternalLink,
  Calendar,
  Percent,
  Clock,
  Sparkles,
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
}

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

  // Filter
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

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

  // Filtered Items
  const filteredHoldings = holdings.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "BANK_FD") return item.deposit_type === "BANK_FD";
    if (activeFilter === "RD") return item.deposit_type === "RD";
    if (activeFilter === "PPF") return item.deposit_type === "PPF";
    if (activeFilter === "CORPORATE_FD") return item.deposit_type === "CORPORATE_FD";
    return true;
  });

  return (
    <div className="px-4 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP ACTION & SUMMARY BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Fixed Income &amp; Deposits</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              Safe Yield
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Track bank FDs, corporate deposits, RDs, and PPF with automated interest compounding
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Refresh calculations"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Link
            href="/holdings/deposits/add"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 font-semibold text-xs sm:text-sm transition-colors"
            title="Open full dedicated page"
          >
            <ExternalLink size={15} />
            <span>Full Page</span>
          </Link>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Add Deposit</span>
          </button>
        </div>
      </div>

      {/* ── MATURING SOON BANNER (If any deposit maturing within 90 days) ── */}
      {summary && summary.maturing_soon_count > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                {summary.maturing_soon_count} Deposit{summary.maturing_soon_count > 1 ? "s" : ""}{" "}
                Maturing in Next 90 Days ({formatINRShort(summary.maturing_soon_amount)})
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Plan your reinvestment, renewal, or milestone goal payout before maturity.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* ── FILTER TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "ALL", label: `All Deposits (${holdings.length})` },
          { id: "BANK_FD", label: "Bank FDs" },
          { id: "CORPORATE_FD", label: "Corporate FDs" },
          { id: "RD", label: "Recurring Deposits (RD)" },
          { id: "PPF", label: "PPF & Post Office" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === f.id
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                : "bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── HOLDINGS LIST / ZERO STATE ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Loader2 size={32} className="animate-spin mb-3 text-emerald-600" />
          <p className="text-sm">Calculating compound interest &amp; accruals...</p>
        </div>
      ) : filteredHoldings.length === 0 ? (
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
              No Fixed Deposits or PPF Added Yet
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              Track your bank fixed deposits, recurring deposits, and PPF in one place. See real-time quarterly compounding and maturity alerts.
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHoldings.map((item) => {
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
                          {item.institution_name}
                        </h3>
                        {item.account_number_or_fdr && (
                          <span className="text-[10px] font-mono bg-neutral-100 dark:bg-white/10 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">
                            {item.account_number_or_fdr}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                          {item.deposit_type.replace("_", " ")}
                        </span>
                        {item.is_tax_saving && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> 80C Tax Saver
                          </span>
                        )}
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
