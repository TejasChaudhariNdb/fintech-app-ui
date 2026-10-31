"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import PrivacyMask from "@/components/ui/PrivacyMask";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Key,
  Landmark,
  Building,
  CreditCard,
  Receipt,
  Wrench,
  Shield,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  RefreshCw,
  Car,
  Wifi,
  Armchair,
  ShieldAlert,
} from "lucide-react";

interface PropertyCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: number;
    property_name: string;
    property_type: string;
    location?: string | null;
    purchase_date: string;
    purchase_price: number;
    current_valuation: number;
    monthly_rental_income?: number;
    is_rented?: boolean;
  } | null;
  onDataChanged?: () => void;
}

interface PropertyTransactionItem {
  id: number;
  property_id: number;
  transaction_type: string;
  type_label: string;
  category: "INFLOW" | "OUTFLOW";
  amount: number;
  transaction_date: string;
  description?: string | null;
  created_at?: string | null;
}

interface CashFlowSummary {
  transactions_count: number;
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  is_profitable: boolean;
  real_xirr_pct: number;
  has_transactions: boolean;
  rental_yield_pct: number;
  net_rental_yield_pct: number;
  breakdown_by_type: Record<string, number>;
}

const INFLOW_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; desc: string }> = {
  RENT_INCOME: {
    label: "Monthly Rent (Regular Tenant)",
    icon: Key,
    desc: "Fixed periodic rent from long-term lease",
  },
  SHORT_STAY_AIRBNB: {
    label: "Airbnb / Short-Stay / Variable Rent",
    icon: Sparkles,
    desc: "Short period rent, Airbnb payouts, homestays",
  },
  PARKING_AMENITY_INCOME: {
    label: "Parking / Storage / Amenity Rent",
    icon: Car,
    desc: "Separate car slot rent, basement storage, rooftop lease",
  },
  DEPOSIT_DEDUCTION_RECOVERY: {
    label: "Deposit Deduction / Damage Recovery",
    icon: ShieldAlert,
    desc: "Non-refundable portion retained for repainting, repairs, or unpaid dues",
  },
  OTHER_INCOME: {
    label: "Other Income / Profit / Gain",
    icon: ArrowUpRight,
    desc: "Custom income, advertisement hoardings, miscellaneous gain",
  },
};

const OUTFLOW_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; desc: string }> = {
  HOME_LOAN_INTEREST: {
    label: "Home Loan Interest (Expense)",
    icon: Landmark,
    desc: "Interest component of mortgage (direct loss/cost)",
  },
  HOME_LOAN_EMI: {
    label: "Home Loan EMI (Full Payment)",
    icon: CreditCard,
    desc: "Total monthly installment (Principal + Interest)",
  },
  MAINTENANCE: {
    label: "Society / HOA Maintenance",
    icon: Building,
    desc: "Monthly/Quarterly society charges or clubhouse fees",
  },
  PROPERTY_TAX: {
    label: "Property / Municipal Tax",
    icon: Receipt,
    desc: "Annual local municipal council / corporation tax",
  },
  UTILITIES_BILLS: {
    label: "Electricity, Water & Wi-Fi (Bills)",
    icon: Wifi,
    desc: "Utility charges (crucial for Airbnb, vacancy, or furnished lets)",
  },
  REPAIRS_RENOVATION: {
    label: "Repairs, Painting & Renovation",
    icon: Wrench,
    desc: "Carpentry, plumbing, painting, deep cleaning capex",
  },
  FURNISHING_APPLIANCES: {
    label: "Furnishing & Appliances (Capex)",
    icon: Armchair,
    desc: "ACs, TV, refrigerator, modular kitchen, beds",
  },
  BROKERAGE_COMMISSION: {
    label: "Brokerage / Platform Fees",
    icon: ArrowDownRight,
    desc: "Agent commission, Airbnb 3% host fee, listing charges",
  },
  INSURANCE: {
    label: "Property Insurance",
    icon: Shield,
    desc: "Fire, earthquake, or home structure insurance",
  },
  OTHER_EXPENSE: {
    label: "Other Expense / Loss",
    icon: AlertCircle,
    desc: "Custom outflow, legal fees, water penalty, damages",
  },
};

function formatINR(val: number): string {
  return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
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

export default function PropertyCashFlowModal({
  isOpen,
  onClose,
  property,
  onDataChanged,
}: PropertyCashFlowModalProps) {
  const [activeTab, setActiveTab] = useState<"LEDGER" | "ADD" | "AUTO_FILL">("LEDGER");
  const [transactions, setTransactions] = useState<PropertyTransactionItem[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");

  // Form State for Single Transaction
  const [category, setCategory] = useState<"INFLOW" | "OUTFLOW">("INFLOW");
  const [txType, setTxType] = useState<string>("RENT_INCOME");
  const [amountStr, setAmountStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form State for Auto-Fill Recurring Rent
  const [recurringType, setRecurringType] = useState<string>("RENT_INCOME");
  const [recurringMonthlyStr, setRecurringMonthlyStr] = useState<string>("");
  const [recurringStartDate, setRecurringStartDate] = useState<string>("");
  const [recurringEndDate, setRecurringEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [recurringNotesPrefix, setRecurringNotesPrefix] = useState<string>("Monthly Rent");
  const [isGeneratingRecurring, setIsGeneratingRecurring] = useState(false);

  // Load Transactions & Summary
  const loadData = useCallback(async () => {
    if (!property?.id) return;
    try {
      setLoading(true);
      const res = await api.getPropertyTransactions(property.id);
      if (res) {
        setTransactions(res.transactions || []);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error("Failed to load property transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [property?.id]);

  useEffect(() => {
    if (isOpen && property?.id) {
      loadData();
      setActiveTab("LEDGER");
      setSuccessBanner(null);
      setErrorMessage(null);

      // Pre-fill recurring values if property has rent
      if (property.monthly_rental_income && property.monthly_rental_income > 0) {
        setRecurringMonthlyStr(String(property.monthly_rental_income));
        setAmountStr(String(property.monthly_rental_income));
      }
      if (property.purchase_date) {
        setRecurringStartDate(property.purchase_date);
      }
    }
  }, [isOpen, property?.id, loadData]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !property) return null;

  // Handle Inflow vs Outflow category switch
  const handleCategorySwitch = (cat: "INFLOW" | "OUTFLOW") => {
    setCategory(cat);
    if (cat === "INFLOW") {
      setTxType("RENT_INCOME");
    } else {
      setTxType("MAINTENANCE");
    }
  };

  // Add Single Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amountStr);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than ₹0");
      return;
    }
    if (!dateStr) {
      setErrorMessage("Please select a transaction date");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addPropertyTransaction(property.id, {
        transaction_type: txType,
        category: category,
        amount: parsedAmount,
        transaction_date: dateStr,
        description: notes.trim() || undefined,
      });

      setSuccessBanner(
        category === "INFLOW"
          ? `Logged +${formatINR(parsedAmount)} income successfully!`
          : `Recorded -${formatINR(parsedAmount)} expense successfully!`
      );
      setAmountStr("");
      setNotes("");
      await loadData();
      setActiveTab("LEDGER");
      if (onDataChanged) onDataChanged();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-Generate Recurring Monthly Entries
  const handleGenerateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const monthlyVal = parseFloat(recurringMonthlyStr);
    if (!monthlyVal || monthlyVal <= 0) {
      setErrorMessage("Please enter a monthly amount greater than ₹0");
      return;
    }
    if (!recurringStartDate || !recurringEndDate) {
      setErrorMessage("Please enter both start and end dates");
      return;
    }
    if (new Date(recurringStartDate) > new Date(recurringEndDate)) {
      setErrorMessage("Start date cannot be after end date");
      return;
    }

    try {
      setIsGeneratingRecurring(true);
      const res = await api.generateRecurringPropertyTransactions(property.id, {
        transaction_type: recurringType,
        category: recurringType === "RENT_INCOME" ? "INFLOW" : "OUTFLOW",
        monthly_amount: monthlyVal,
        start_date: recurringStartDate,
        end_date: recurringEndDate,
        day_of_month: 1,
        notes_prefix: recurringNotesPrefix.trim() || "Monthly Entry",
      });

      setSuccessBanner(res?.message || "Successfully generated recurring entries!");
      await loadData();
      setActiveTab("LEDGER");
      if (onDataChanged) onDataChanged();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate recurring entries");
    } finally {
      setIsGeneratingRecurring(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Are you sure you want to remove this cash flow entry?")) return;
    try {
      await api.deletePropertyTransaction(property.id, id);
      setSuccessBanner("Entry deleted");
      await loadData();
      if (onDataChanged) onDataChanged();
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to delete entry");
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterMode === "ALL") return true;
    return t.category === filterMode;
  });

  const netCashFlow = summary?.net_cash_flow ?? 0;
  const isNetProfit = netCashFlow >= 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#151A23] border sm:border border-neutral-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden mt-auto sm:mt-0 animate-in slide-in-from-bottom-4 duration-250">
        
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-neutral-300 dark:bg-white/20 rounded-full" />
        </div>

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between px-5 sm:px-7 py-4 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Cash Flow Ledger
              </span>
              {property.location && (
                <span className="text-xs text-neutral-500 truncate">
                  {property.location}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white truncate">
              {property.property_name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── HERO KPI STRIP ── */}
        <div className="px-5 sm:px-7 py-3.5 bg-gradient-to-r from-neutral-50 to-neutral-100/50 dark:from-white/[0.03] dark:to-white/[0.01] border-b border-neutral-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              True XIRR (Cash Flow)
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {summary?.real_xirr_pct !== undefined ? `${summary.real_xirr_pct.toFixed(2)}%` : "--"}
            </div>
            <div className="text-[10px] text-neutral-400">
              {summary?.has_transactions ? "Dated cash-flow adjusted" : "CAGR baseline"}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Net Cash Flow (P&L)
            </div>
            <div
              className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                isNetProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              <PrivacyMask>
                {isNetProfit ? "+" : ""}
                {formatINR(netCashFlow)}
              </PrivacyMask>
            </div>
            <div className="text-[10px] font-semibold text-neutral-400">
              {isNetProfit ? "Net Profit / Yield" : "Net Loss / Drain"}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Total Inflows (+)
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              <PrivacyMask>{formatINRShort(summary?.total_inflow ?? 0)}</PrivacyMask>
            </div>
            <div className="text-[10px] text-neutral-400">Rent, Airbnb & Gains</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Total Outflows (-)
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              <PrivacyMask>{formatINRShort(summary?.total_outflow ?? 0)}</PrivacyMask>
            </div>
            <div className="text-[10px] text-neutral-400">EMI, Interest, Maint., Tax</div>
          </div>
        </div>

        {/* ── SUCCESS & ERROR NOTIFICATIONS ── */}
        {successBanner && (
          <div className="mx-5 sm:mx-7 mt-3 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span>{successBanner}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-5 sm:mx-7 mt-3 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── NAVIGATION TABS ── */}
        <div className="px-5 sm:px-7 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                setActiveTab("LEDGER");
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "LEDGER"
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
              }`}
            >
              <span>Ledger & History</span>
              {transactions.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold">
                  {transactions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("ADD");
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "ADD"
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
              }`}
            >
              <Plus size={14} />
              <span>Log Transaction</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("AUTO_FILL");
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "AUTO_FILL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              }`}
            >
              <Zap size={14} />
              <span>Auto-Fill Rent</span>
            </button>
          </div>

          {activeTab === "LEDGER" && (
            <button
              onClick={loadData}
              disabled={loading}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5"
              title="Refresh ledger"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 overscroll-contain">
          
          {/* ═══════════════════════════════════════════ */}
          {/* TAB 1: LEDGER & TIMELINE                    */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "LEDGER" && (
            <div className="space-y-4">
              {/* Filter chips (All / Inflow / Outflow) */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-400 font-semibold mr-1">Filter:</span>
                  {(["ALL", "INFLOW", "OUTFLOW"] as const).map((mode) => {
                    const isActive = filterMode === mode;
                    const label =
                      mode === "ALL"
                        ? `All (${transactions.length})`
                        : mode === "INFLOW"
                        ? `Inflows (${transactions.filter((t) => t.category === "INFLOW").length})`
                        : `Outflows (${transactions.filter((t) => t.category === "OUTFLOW").length})`;

                    return (
                      <button
                        key={mode}
                        onClick={() => setFilterMode(mode)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs"
                            : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-neutral-400">
                  Showing {filteredTransactions.length} of {transactions.length} entries
                </div>
              </div>

              {/* Transactions List */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 size={24} className="animate-spin text-indigo-500 mb-2" />
                  <p className="text-xs text-neutral-500 font-semibold">Loading ledger...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                    <IndianRupee size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-800 dark:text-white">
                      No Cash Flow Entries Found
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                      Log monthly rent, Airbnb short-stay earnings, bank loan interest, society maintenance, or municipal taxes to calculate true XIRR and profit/loss.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab("ADD")}
                      className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs hover:opacity-90"
                    >
                      + Log First Transaction
                    </button>
                    <button
                      onClick={() => setActiveTab("AUTO_FILL")}
                      className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20 hover:bg-indigo-100"
                    >
                      ⚡ Auto-Fill Past Rent
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((tx) => {
                    const isInflow = tx.category === "INFLOW";
                    const config = isInflow
                      ? INFLOW_TYPE_CONFIG[tx.transaction_type] || INFLOW_TYPE_CONFIG.OTHER_INCOME
                      : OUTFLOW_TYPE_CONFIG[tx.transaction_type] || OUTFLOW_TYPE_CONFIG.OTHER_EXPENSE;
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/10 transition-all gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isInflow
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            <IconComponent size={18} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                {config.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  isInflow
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                }`}
                              >
                                {isInflow ? "Income" : "Expense"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                              <span>
                                {new Date(tx.transaction_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              {tx.description && (
                                <>
                                  <span>•</span>
                                  <span className="truncate text-neutral-500 dark:text-neutral-400">
                                    {tx.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-sm sm:text-base font-black font-mono ${
                                isInflow
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              <PrivacyMask>
                                {isInflow ? "+" : "-"}
                                {formatINR(tx.amount)}
                              </PrivacyMask>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 2: LOG SINGLE TRANSACTION               */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "ADD" && (
            <form onSubmit={handleSaveTransaction} className="space-y-4 max-w-xl mx-auto">
              {/* Category Pill Switcher (Income vs Expense) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  TRANSACTION NATURE
                </label>
                <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleCategorySwitch("INFLOW")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      category === "INFLOW"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                    }`}
                  >
                    <ArrowUpRight size={15} />
                    <span>Inflow / Income / Profit (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategorySwitch("OUTFLOW")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      category === "OUTFLOW"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                    }`}
                  >
                    <ArrowDownRight size={15} />
                    <span>Outflow / Expense / Loss (-)</span>
                  </button>
                </div>
              </div>

              {/* Transaction Type Select */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  TYPE OF TRANSACTION *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(category === "INFLOW" ? INFLOW_TYPE_CONFIG : OUTFLOW_TYPE_CONFIG).map(
                    ([key, info]) => {
                      const isSelected = txType === key;
                      const IconComp = info.icon;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTxType(key)}
                          className={`p-2.5 rounded-xl text-left border text-xs transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? category === "INFLOW"
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold"
                                : "bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300 font-bold"
                              : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                          }`}
                        >
                          <IconComp size={16} className="shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{info.label}</div>
                            <div className="text-[10px] text-neutral-400 truncate mt-0.5">{info.desc}</div>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Amount Input with Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  AMOUNT (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="e.g. 35000"
                    className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                  {[10000, 25000, 35000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountStr(String(amt))}
                      className="px-2.5 py-1 text-xs rounded-lg bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 font-mono font-medium text-neutral-600 dark:text-neutral-300 whitespace-nowrap"
                    >
                      ₹{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                  {property.monthly_rental_income && property.monthly_rental_income > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountStr(String(property.monthly_rental_income))}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
                    >
                      Standard Rent ({formatINRShort(property.monthly_rental_income)})
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  TRANSACTION DATE *
                </label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  NOTES / DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    category === "INFLOW"
                      ? "e.g. October Airbnb payout (18 nights booked)"
                      : "e.g. Annual property tax, Plumbing repair"
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    category === "INFLOW"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>
                        Save {category === "INFLOW" ? "Income Entry (+)" : "Expense Entry (-)"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB 3: AUTO-FILL MONTHLY RENT (RECURRING)   */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "AUTO_FILL" && (
            <form onSubmit={handleGenerateRecurring} className="space-y-4 max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                  <Zap size={16} />
                  <span>1-Click Recurring Generator</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Avoid typing 12, 24, or 36 transactions by hand. Select a date range and monthly rent or EMI to auto-generate all historical entries instantly!
                </p>
              </div>

              {/* Recurring Type */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  RECURRING TYPE
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "RENT_INCOME", label: "Monthly Rent (+)", icon: Key },
                    { id: "HOME_LOAN_EMI", label: "Loan EMI (-)", icon: CreditCard },
                    { id: "MAINTENANCE", label: "Maintenance (-)", icon: Building },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRecurringType(item.id)}
                      className={`p-2.5 rounded-xl text-center border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                        recurringType === item.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                      }`}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Amount */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  MONTHLY AMOUNT (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={recurringMonthlyStr}
                    onChange={(e) => setRecurringMonthlyStr(e.target.value)}
                    placeholder="e.g. 35000"
                    className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    FROM (START MONTH) *
                  </label>
                  <input
                    type="date"
                    required
                    value={recurringStartDate}
                    onChange={(e) => setRecurringStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    TO (END MONTH) *
                  </label>
                  <input
                    type="date"
                    required
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Notes prefix */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  ENTRY DESCRIPTION LABEL
                </label>
                <input
                  type="text"
                  value={recurringNotesPrefix}
                  onChange={(e) => setRecurringNotesPrefix(e.target.value)}
                  placeholder="e.g. Monthly Rent"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Entries will be labeled like: &ldquo;{recurringNotesPrefix || "Monthly Rent"} - Jan 2026&rdquo;
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGeneratingRecurring}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingRecurring ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>⚡ Auto-Generate All Entries</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

