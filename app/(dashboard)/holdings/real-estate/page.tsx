"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import RealEstateModal from "@/components/features/RealEstateModal";
import PropertyLoanModal, { PropertyLoanView } from "@/components/features/PropertyLoanModal";
import PropertyMoneySheet, { MoneySheetMode } from "@/components/features/PropertyMoneySheet";
import { RealEstateFormData } from "@/components/features/RealEstateForm";
import RealEstateTaxSheet, { PropertyTaxView } from "@/components/features/RealEstateTaxSheet";
import PropertySimulatorModal from "@/components/features/PropertySimulatorModal";
import {
  Building2,
  Building,
  Store,
  Layers,
  Home,
  MapPin,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle2,
  IndianRupee,
  Key,
  Receipt,
  Wallet,
  CreditCard,
  ChevronRight,
  ArrowLeftRight,
  Calculator,
  AlertTriangle,
} from "lucide-react";

interface RealEstateItem {
  id: number;
  user_id: number;
  profile_id?: number;
  profile_name: string;
  profile_relation: string;
  property_name: string;
  property_type: string;
  location?: string | null;
  area_sqft?: number | null;
  purchase_date: string;
  purchase_price: number;
  stamp_duty_and_charges: number;
  renovation_costs: number;
  total_invested: number;
  current_valuation: number;
  gain_loss: number;
  gain_pct: number;
  tenure_years: number;
  tenure_days: number;
  cagr_pct: number;
  is_rented: boolean;
  monthly_rental_income: number;
  annual_rental_income: number;
  rental_yield_pct: number;
  net_rental_yield_pct?: number;
  total_return_xirr_pct: number;
  real_xirr_pct?: number;
  has_transactions?: boolean;
  transactions_count?: number;
  total_inflow?: number;
  total_outflow?: number;
  net_cash_flow?: number;
  notes?: string | null;
  created_at?: string | null;
  // BUG-030
  occupancy_type?: "SELF_OCCUPIED" | "LET_OUT";
  loan?: PropertyLoanView | null;
  tax_view?: PropertyTaxView;
  // Feedback 2026-11-13: true XIRR on own money (loan EMIs, rent, costs, net sale value)
  true_xirr_pct?: number | null;
  xirr_basis?: "WITH_LOAN" | "CASH_FLOW" | "PRICE_ONLY";
  holding_cash_flow?: number;
  emis_logged_without_loan?: boolean;
  returns_breakdown?: {
    upfront_own_money: number;
    emi_paid: number;
    interest_paid: number;
    income: number;
    expenses: number;
    outstanding_loan: number;
    net_sale_in_hand: number;
    total_own_money_in: number;
  };
}

interface RealEstateSummary {
  total_properties_count: number;
  total_invested: number;
  total_current_valuation: number;
  total_gain_loss: number;
  total_gain_pct: number;
  total_annual_rental_income: number;
  portfolio_rental_yield_pct: number;
  rented_properties_count: number;
  total_inflows?: number;
  total_outflows?: number;
  total_net_cash_flow?: number;
  type_counts: Record<string, number>;
  tax_estimate?: {
    long_term_properties_count: number;
    indexed_gain: number;
    tax_with_indexation: number;
    tax_without_indexation: number;
    recommended_tax_total: number;
  };
  portfolio_xirr_pct?: number | null;
  portfolio_cagr_pct?: number | null;
  total_loan_outstanding?: number;
  holding_cash_flow?: {
    income: number;
    expenses: number;
    loan_payments: number;
    interest_paid: number;
    net: number;
  };
}

type ReturnMode = "XIRR" | "CAGR";

function fmtPa(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(1)}% p.a.`;
}

function BigPa({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <>—</>;
  return (
    <>
      {v.toFixed(1)}%<span className="text-xs font-semibold ml-1 opacity-70">p.a.</span>
    </>
  );
}

function toneOf(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-neutral-500";
  return v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function Metric({
  label,
  tone,
  sub,
  className = "",
  children,
}: {
  label: string;
  tone?: string;
  sub?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`text-center px-1 py-1.5 ${className}`}>
      <div className="text-[10px] uppercase font-semibold text-neutral-400">{label}</div>
      <div className={`text-sm font-bold font-mono mt-0.5 whitespace-nowrap ${tone ?? "text-neutral-900 dark:text-white"}`}>{children}</div>
      {sub && <div className="text-[9px] text-neutral-400 whitespace-nowrap">{sub}</div>}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-none transition-all active:scale-95 ${
        primary
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5"
      }`}
    >
      <Icon size={15} className="shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
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
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  RESIDENTIAL_APARTMENT: {
    label: "Apartment / Flat",
    icon: Building2,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  VILLA_HOUSE: {
    label: "Villa / House",
    icon: Home,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  COMMERCIAL: {
    label: "Commercial",
    icon: Store,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  LAND_PLOT: {
    label: "Plot / Land",
    icon: Layers,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  AGRICULTURAL: {
    label: "Agricultural",
    icon: Building,
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
};

export default function RealEstateHoldingsPage() {
  const { activeProfileId } = useProfile();
  const [holdings, setHoldings] = useState<RealEstateItem[]>([]);
  const [summary, setSummary] = useState<RealEstateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // Modal State for Property Add/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RealEstateItem | null>(null);
  const [loanModalFor, setLoanModalFor] = useState<RealEstateItem | null>(null);
  const [taxOpen, setTaxOpen] = useState(false);
  const [simFor, setSimFor] = useState<RealEstateItem | null>(null);
  const [returnMode, setReturnMode] = useState<ReturnMode>("XIRR");
  const [moneyMode, setMoneyMode] = useState<MoneySheetMode>("RENT");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("re_return_mode");
      if (saved === "XIRR" || saved === "CAGR") setReturnMode(saved);
    } catch {}
  }, []);

  const toggleReturnMode = () => {
    setReturnMode((m) => {
      const next = m === "XIRR" ? "CAGR" : "XIRR";
      try {
        localStorage.setItem("re_return_mode", next);
      } catch {}
      return next;
    });
  };

  // Modal State for Cash Flow & Transactions
  const [cashFlowModalOpen, setCashFlowModalOpen] = useState(false);
  const [selectedPropertyForCashFlow, setSelectedPropertyForCashFlow] = useState<RealEstateItem | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getRealEstateHoldings(activeProfileId);
      if (res) {
        setHoldings(res.holdings || []);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error("Failed to load real estate holdings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("added") === "true") {
        showToast("Property saved successfully");
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

  const handleOpenEdit = (item: RealEstateItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleOpenCashFlow = (item: RealEstateItem, mode: MoneySheetMode) => {
    setMoneyMode(mode);
    setSelectedPropertyForCashFlow(item);
    setCashFlowModalOpen(true);
  };

  const handleSaveHolding = async (payload: RealEstateFormData) => {
    if (editingItem) {
      await api.updateRealEstateHolding(editingItem.id, payload as any);
      showToast("Property updated successfully");
    } else {
      await api.addRealEstateHolding(payload as any);
      showToast("Property added successfully");
    }
    await loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this property and all its cash flow transactions?")) return;
    try {
      await api.deleteRealEstateHolding(id);
      showToast("Property removed from portfolio");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete property");
    }
  };

  // Filtered items
  const filteredHoldings = holdings.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "RENTED") return item.is_rented;
    return item.property_type === activeFilter;
  });

  return (
    <div className="px-4 space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-2xl shadow-xl text-sm font-semibold border border-white/10 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight whitespace-nowrap">
            Real Estate
          </h1>
          {holdings.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-bold shrink-0">
              {holdings.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-2 sm:px-3 sm:py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl border border-neutral-200/80 dark:border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Real Estate"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-500" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS (feedback 2026-11-13): Cost basis · Market value · XIRR/CAGR · Capital gain · Net cash flow ── */}
      {summary && summary.total_properties_count > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Cost Basis (cost only) */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Cost Basis</span>
              <IndianRupee size={15} className="text-blue-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono tracking-tight">
                <PrivacyMask>{formatINRShort(summary.total_invested)}</PrivacyMask>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Price + stamp duty + renovation</div>
            </div>
          </Card>

          {/* 2. Market Value */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Market Value</span>
              <Building2 size={15} className="text-indigo-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono tracking-tight">
                <PrivacyMask>{formatINRShort(summary.total_current_valuation)}</PrivacyMask>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {summary.total_properties_count} {summary.total_properties_count === 1 ? "property" : "properties"}
                {(summary.total_loan_outstanding ?? 0) > 0 && (
                  <> · loan left <PrivacyMask>{formatINRShort(summary.total_loan_outstanding ?? 0)}</PrivacyMask></>
                )}
              </div>
            </div>
          </Card>

          {/* 3. XIRR / CAGR (tap to switch) */}
          <button
            type="button"
            onClick={toggleReturnMode}
            className="col-span-2 xl:col-span-1 text-left rounded-2xl"
            aria-label={`Showing ${returnMode}. Tap to show ${returnMode === "XIRR" ? "CAGR" : "XIRR"}`}
          >
            <Card className="h-full p-3.5 sm:p-4 flex flex-col justify-between border-indigo-500/30 bg-indigo-500/[0.03] hover:border-indigo-500/60 transition-colors">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                <span className="text-indigo-600 dark:text-indigo-400">{returnMode}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-600 dark:text-indigo-400">
                  <ArrowLeftRight size={11} /> {returnMode === "XIRR" ? "CAGR" : "XIRR"}
                </span>
              </div>
              <div className="mt-2.5">
                <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight whitespace-nowrap ${toneOf(returnMode === "XIRR" ? summary.portfolio_xirr_pct : summary.portfolio_cagr_pct)}`}>
                  <BigPa v={returnMode === "XIRR" ? summary.portfolio_xirr_pct : summary.portfolio_cagr_pct} />
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                  {returnMode === "XIRR"
                    ? "Your real yearly return on your own money: down payment, EMIs, rent and costs"
                    : "Yearly growth of the property price only (no loan, rent or costs)"}
                </div>
              </div>
            </Card>
          </button>

          {/* 4. Capital Gain */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Capital Gain</span>
              {summary.total_gain_loss >= 0 ? (
                <TrendingUp size={15} className="text-emerald-500" />
              ) : (
                <TrendingDown size={15} className="text-rose-500" />
              )}
            </div>
            <div className="mt-2.5">
              <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight whitespace-nowrap ${toneOf(summary.total_gain_loss)}`}>
                <PrivacyMask>
                  {summary.total_gain_loss >= 0 ? "+" : ""}
                  {formatINRShort(summary.total_gain_loss)}
                </PrivacyMask>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {fmtPa(summary.portfolio_cagr_pct)} · {summary.total_gain_pct >= 0 ? "+" : ""}
                {summary.total_gain_pct.toFixed(1)}% total
              </div>
              {summary.tax_estimate && summary.tax_estimate.long_term_properties_count > 0 && (
                <button
                  type="button"
                  onClick={() => setTaxOpen(true)}
                  className="mt-2 w-full flex items-center justify-between gap-1 rounded-lg bg-indigo-500/5 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                >
                  <span className="whitespace-nowrap">
                    Tax ≈ <PrivacyMask>{formatINRShort(summary.tax_estimate.recommended_tax_total)}</PrivacyMask>
                  </span>
                  <span className="inline-flex items-center whitespace-nowrap">Details <ChevronRight size={12} /></span>
                </button>
              )}
            </div>
          </Card>

          {/* 5. Net Cash Flow while holding */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Net Cash Flow</span>
              <Wallet size={15} className="text-amber-500" />
            </div>
            <div className="mt-2.5">
              <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight whitespace-nowrap ${toneOf(summary.holding_cash_flow?.net ?? summary.total_net_cash_flow ?? 0)}`}>
                <PrivacyMask>
                  {(summary.holding_cash_flow?.net ?? summary.total_net_cash_flow ?? 0) >= 0 ? "+" : ""}
                  {formatINRShort(summary.holding_cash_flow?.net ?? summary.total_net_cash_flow ?? 0)}
                </PrivacyMask>
              </div>
              {summary.holding_cash_flow ? (
                <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                    Rent +<PrivacyMask>{formatINRShort(summary.holding_cash_flow.income)}</PrivacyMask>
                  </span>
                  {summary.holding_cash_flow.loan_payments > 0 && (
                    <>
                      {" · "}
                      <span className="text-rose-500 font-semibold whitespace-nowrap">
                        EMIs -<PrivacyMask>{formatINRShort(summary.holding_cash_flow.loan_payments)}</PrivacyMask>
                      </span>
                    </>
                  )}
                  {summary.holding_cash_flow.expenses > 0 && (
                    <>
                      {" · "}
                      <span className="text-rose-500 font-semibold whitespace-nowrap">
                        Costs -<PrivacyMask>{formatINRShort(summary.holding_cash_flow.expenses)}</PrivacyMask>
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 mt-0.5">Rent less costs, while holding</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── FILTER CHIPS ── */}
      {holdings.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "ALL", label: `All (${holdings.length})` },
            { id: "RESIDENTIAL_APARTMENT", label: "Apartments" },
            { id: "VILLA_HOUSE", label: "Villas & Houses" },
            { id: "COMMERCIAL", label: "Commercial" },
            { id: "LAND_PLOT", label: "Plots & Land" },
            { id: "RENTED", label: `Rented (${summary?.rented_properties_count || 0})` },
          ].map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs"
                    : "bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── HOLDINGS LIST / EMPTY STATE ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 size={32} className="animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-semibold text-neutral-500">Loading properties...</p>
        </div>
      ) : holdings.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
              No Properties Added Yet
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-sm mx-auto">
              Add your flats, houses, commercial units, or land to track capital appreciation, rental income, Airbnb earnings, and cash-flow-adjusted XIRR.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>Add First Property</span>
            </button>
          </div>
        </div>
      ) : filteredHoldings.length === 0 ? (
        <Card className="py-12 px-6 text-center border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-white/5 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Building2 size={24} />
          </div>
          <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
            No properties match this filter
          </h4>
          <p className="text-xs text-neutral-500 mt-1 mb-4">
            Try selecting a different property category or view all properties.
          </p>
          <button
            onClick={() => setActiveFilter("ALL")}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View All Properties ({holdings.length})
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredHoldings.map((prop) => {
            const typeInfo = TYPE_CONFIG[prop.property_type] || TYPE_CONFIG.RESIDENTIAL_APARTMENT;
            const TypeIcon = typeInfo.icon;
            const txCount = prop.transactions_count ?? 0;
            const netFlow = prop.holding_cash_flow ?? prop.net_cash_flow ?? 0;
            const xirrValue = prop.true_xirr_pct ?? null;
            const shownReturn = returnMode === "XIRR" ? xirrValue : prop.cagr_pct;
            const b = prop.returns_breakdown;
            const hasRent = (b?.income ?? 0) > 0;
            const hasCashFlow = txCount > 0 || !!prop.loan;

            return (
              <Card
                key={prop.id}
                className="p-4 sm:p-5 flex flex-col gap-3.5 hover:border-indigo-500/30 transition-all"
              >
                <div>
                  {/* Top Row: Type Badge + Profile Tag + Edit/Delete */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${typeInfo.color}`}>
                        <TypeIcon size={12} />
                        {typeInfo.label}
                      </span>
                      {prop.profile_name && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400">
                          {prop.profile_name}
                        </span>
                      )}
                      {prop.area_sqft && (
                        <span className="text-[11px] font-semibold text-neutral-500">{prop.area_sqft.toLocaleString()} sq.ft</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleOpenEdit(prop)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                        title="Edit property details"
                        aria-label="Edit property details"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(prop.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Delete property"
                        aria-label="Delete property"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">{prop.property_name}</h3>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500 mt-1">
                    {prop.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} className="shrink-0 text-neutral-400" />
                        {prop.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} className="shrink-0 text-neutral-400" />
                      Bought {formatDatePretty(prop.purchase_date)} · {prop.tenure_years} yrs
                    </span>
                  </div>
                </div>

                {/* Metrics, same order as the summary: Cost · Value · XIRR/CAGR · Gain · Net cash.
                    One row of 5 from sm; on phones 3 + 2 (6-col grid). */}
                <div className="grid grid-cols-6 sm:grid-cols-5 gap-1.5 bg-neutral-50/70 dark:bg-white/[0.02] p-2 rounded-2xl">
                  <Metric label="Cost" className="col-span-2 sm:col-span-1">
                    <PrivacyMask>{formatINRShort(prop.total_invested)}</PrivacyMask>
                  </Metric>
                  <Metric label="Value" className="col-span-2 sm:col-span-1">
                    <PrivacyMask>{formatINRShort(prop.current_valuation)}</PrivacyMask>
                  </Metric>
                  <button
                    type="button"
                    onClick={toggleReturnMode}
                    className="col-span-2 sm:col-span-1 rounded-xl bg-indigo-500/[0.08] hover:bg-indigo-500/15 px-1 py-1.5 text-center transition-colors"
                    title={
                      returnMode === "CAGR"
                        ? "CAGR: price growth only. Tap for XIRR."
                        : prop.xirr_basis === "WITH_LOAN"
                          ? "XIRR: your return incl. loan EMIs, rent and costs. Tap for CAGR."
                          : prop.xirr_basis === "CASH_FLOW"
                            ? "XIRR: your return incl. rent and costs. Tap for CAGR."
                            : "XIRR: price only so far (no rent or loan added). Tap for CAGR."
                    }
                    aria-label={`${returnMode} ${shownReturn ?? ""} percent a year. Tap to switch.`}
                  >
                    <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5">
                      {returnMode} <ArrowLeftRight size={10} />
                    </div>
                    <div className={`text-sm font-black font-mono mt-0.5 whitespace-nowrap ${toneOf(shownReturn)}`}>
                      {shownReturn == null ? "—" : `${shownReturn.toFixed(1)}%`}
                    </div>
                    <div className="text-[9px] text-neutral-400">p.a.</div>
                  </button>
                  <Metric
                    label="Gain"
                    tone={toneOf(prop.gain_loss)}
                    className="col-span-3 sm:col-span-1"
                    sub={`${prop.gain_pct >= 0 ? "+" : ""}${prop.gain_pct.toFixed(1)}% total`}
                  >
                    <PrivacyMask>
                      {prop.gain_loss >= 0 ? "+" : ""}
                      {formatINRShort(prop.gain_loss)}
                    </PrivacyMask>
                  </Metric>
                  <Metric
                    label="Net cash"
                    tone={toneOf(netFlow)}
                    className="col-span-3 sm:col-span-1"
                    sub={hasCashFlow ? "rent − EMI − costs" : "add rent or costs"}
                  >
                    {hasCashFlow ? (
                      <PrivacyMask>
                        {netFlow >= 0 ? "+" : ""}
                        {formatINRShort(netFlow)}
                      </PrivacyMask>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </Metric>
                </div>

                {/* Gentle check for a likely typo in the value (e.g. ₹5Cr instead of ₹50L) */}
                {prop.cagr_pct > 50 && prop.tenure_years >= 1 && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prop)}
                    className="w-full flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-left text-[11px] text-amber-800 dark:text-amber-300"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Growth of {prop.cagr_pct.toFixed(0)}% a year is unusually high. Is the market value of{" "}
                      <PrivacyMask>{formatINRShort(prop.current_valuation)}</PrivacyMask> right?{" "}
                      <b className="underline">Check value</b>
                    </span>
                  </button>
                )}

                {/* Loan strip */}
                {prop.loan ? (
                  <button
                    type="button"
                    onClick={() => setLoanModalFor(prop)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-white/10 px-3 py-2 text-left hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="min-w-0 text-[11px] text-neutral-600 dark:text-neutral-300 leading-snug">
                      <span className="font-semibold text-neutral-900 dark:text-white">Loan left <PrivacyMask>{formatINRShort(prop.loan.current_outstanding)}</PrivacyMask></span>
                      {" · "}EMI <PrivacyMask>{formatINRShort(prop.loan.emi)}</PrivacyMask>
                      {" · "}
                      <span className="text-rose-600 dark:text-rose-400">interest paid <PrivacyMask>{formatINRShort(prop.loan.interest_paid_to_date)}</PrivacyMask></span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-400 shrink-0" />
                  </button>
                ) : prop.emis_logged_without_loan ? (
                  <button
                    type="button"
                    onClick={() => setLoanModalFor(prop)}
                    className="w-full flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-left text-[11px] text-amber-800 dark:text-amber-300"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>You logged EMIs but haven&apos;t added the loan. Add it so your return counts only your down payment, not the full price.</span>
                  </button>
                ) : null}

                {/* Actions: one tap per task (feedback round 2). mt-auto keeps them at the bottom when cards in a row differ in height. */}
                <div className="mt-auto">
                  <div className="grid grid-cols-4 gap-1.5">
                    <ActionButton icon={Key} label="+ Rent" onClick={() => handleOpenCashFlow(prop, "RENT")} />
                    <ActionButton icon={CreditCard} label={prop.loan ? "EMI / Loan" : "+ EMI / Loan"} onClick={() => setLoanModalFor(prop)} />
                    <ActionButton icon={Receipt} label="+ Expense" onClick={() => handleOpenCashFlow(prop, "EXPENSE")} />
                    <ActionButton icon={Calculator} label="What if?" onClick={() => setSimFor(prop)} primary />
                  </div>
                  {txCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenCashFlow(prop, "HISTORY")}
                      className="mt-2 w-full text-center text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                    >
                      View all {txCount} entries ›
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── HOME LOAN MODAL (BUG-030) ── */}
      {loanModalFor && (
        <PropertyLoanModal
          key={loanModalFor.id}
          isOpen={!!loanModalFor}
          onClose={() => setLoanModalFor(null)}
          holdingId={loanModalFor.id}
          propertyName={loanModalFor.property_name}
          loan={holdings.find((h) => h.id === loanModalFor.id)?.loan ?? loanModalFor.loan ?? null}
          onChanged={() => { loadData(); }}
        />
      )}

      {/* ── PROPERTY ADD / EDIT MODAL ── */}
      <RealEstateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveHolding}
        initialData={editingItem}
      />

      {/* ── RENT / EXPENSE / HISTORY SHEET ── */}
      <PropertyMoneySheet
        isOpen={cashFlowModalOpen}
        mode={moneyMode}
        onClose={() => setCashFlowModalOpen(false)}
        property={
          selectedPropertyForCashFlow
            ? { ...selectedPropertyForCashFlow, has_loan: !!selectedPropertyForCashFlow.loan }
            : null
        }
        onSaved={(msg) => {
          showToast(msg);
          loadData();
        }}
        onOpenLoan={() => {
          const p = selectedPropertyForCashFlow;
          setCashFlowModalOpen(false);
          if (p) setLoanModalFor(p);
        }}
      />

      {/* ── TAX DETAILS SHEET ── */}
      <RealEstateTaxSheet isOpen={taxOpen} onClose={() => setTaxOpen(false)} properties={holdings} />

      {/* ── WHAT-IF SIMULATOR ── */}
      <PropertySimulatorModal isOpen={!!simFor} onClose={() => setSimFor(null)} property={simFor} />
    </div>
  );
}
