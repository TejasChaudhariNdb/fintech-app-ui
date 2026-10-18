"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import RealEstateModal from "@/components/features/RealEstateModal";
import { RealEstateFormData } from "@/components/features/RealEstateForm";
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
  AlertCircle,
  Calendar,
  Sparkles,
  Percent,
  CheckCircle2,
  IndianRupee,
  Key,
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
  total_return_xirr_pct: number;
  notes?: string | null;
  created_at?: string | null;
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
  type_counts: Record<string, number>;
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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RealEstateItem | null>(null);
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
    if (!confirm("Are you sure you want to remove this property from your portfolio?")) return;
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
            className="p-2 sm:p-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors disabled:opacity-50"
            title="Refresh Real Estate"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-sm shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={15} />
            <span>Add<span className="hidden xs:inline sm:inline"> Property</span></span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY STATS BANNER (Only when properties exist) ── */}
      {summary && holdings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Valuation */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Valuation</span>
              <Building size={15} className="text-indigo-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono tracking-tight">
                <PrivacyMask>{formatINRShort(summary.total_current_valuation)}</PrivacyMask>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {summary.total_properties_count} {summary.total_properties_count === 1 ? "property" : "properties"}
              </div>
            </div>
          </Card>

          {/* Total Invested Basis */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Cost Basis</span>
              <IndianRupee size={15} className="text-blue-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono tracking-tight">
                <PrivacyMask>{formatINRShort(summary.total_invested)}</PrivacyMask>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Purchase + additions
              </div>
            </div>
          </Card>

          {/* Unrealized Capital Gain */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Net Gain</span>
              {summary.total_gain_loss >= 0 ? (
                <TrendingUp size={15} className="text-emerald-500" />
              ) : (
                <TrendingDown size={15} className="text-rose-500" />
              )}
            </div>
            <div className="mt-2.5">
              <div
                className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
                  summary.total_gain_loss >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                <PrivacyMask>
                  {summary.total_gain_loss >= 0 ? "+" : ""}
                  {formatINRShort(summary.total_gain_loss)}
                </PrivacyMask>
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary.total_gain_pct >= 0 ? "+" : ""}
                {summary.total_gain_pct.toFixed(1)}% Return
              </div>
            </div>
          </Card>

          {/* Annual Rental Income & Yield */}
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Rental Income</span>
              <Key size={15} className="text-amber-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono tracking-tight">
                <PrivacyMask>{formatINRShort(summary.total_annual_rental_income)}</PrivacyMask>
                <span className="text-xs font-bold text-neutral-400 ml-1">/yr</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {summary.portfolio_rental_yield_pct.toFixed(2)}%
                </strong>{" "}
                yield ({summary.rented_properties_count} rented)
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── FILTER CHIPS (Only when properties exist) ── */}
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
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-sm"
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
        /* Empty State when 0 properties in vault */
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
              No Properties Added Yet
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-sm mx-auto">
              Add your flats, houses, commercial units, or land to track capital appreciation, holding period CAGR, and rental cashflow.
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

          {/* Highlights */}
          <div className="flex items-center justify-center gap-3 pt-3 text-[11px] text-neutral-400 flex-wrap">
            <span className="flex items-center gap-1">
              <TrendingUp size={13} className="text-indigo-500" /> Capital Appreciation
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Key size={13} className="text-amber-500" /> Rental Yields
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles size={13} className="text-emerald-500" /> XIRR Returns
            </span>
          </div>
        </div>
      ) : filteredHoldings.length === 0 ? (
        /* Filter matched 0 properties */
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHoldings.map((prop) => {
            const typeInfo = TYPE_CONFIG[prop.property_type] || TYPE_CONFIG.RESIDENTIAL_APARTMENT;
            const TypeIcon = typeInfo.icon;
            const isGain = prop.gain_loss >= 0;

            return (
              <Card
                key={prop.id}
                className="p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all space-y-4"
              >
                <div>
                  {/* Top Row: Type Badge + Profile Tag + Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${typeInfo.color}`}
                      >
                        <TypeIcon size={12} />
                        {typeInfo.label}
                      </span>

                      {prop.profile_name && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400">
                          {prop.profile_name}
                        </span>
                      )}

                      {prop.area_sqft && (
                        <span className="text-[11px] font-semibold text-neutral-500">
                          {prop.area_sqft.toLocaleString()} sq.ft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(prop)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                        title="Edit Property"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(prop.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Property Name & Location */}
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                    {prop.property_name}
                  </h3>
                  {prop.location && (
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                      <MapPin size={13} className="shrink-0 text-neutral-400" />
                      <span>{prop.location}</span>
                    </div>
                  )}

                  {/* Purchase Date & Tenure */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1.5">
                    <Calendar size={13} className="shrink-0" />
                    <span>
                      Acquired {formatDatePretty(prop.purchase_date)} ({prop.tenure_years} yrs held)
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="pt-3 border-t border-neutral-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-neutral-50/70 dark:bg-white/[0.02] p-3 rounded-2xl">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-neutral-400">Current Value</div>
                    <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                      <PrivacyMask>{formatINRShort(prop.current_valuation)}</PrivacyMask>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-semibold text-neutral-400">Cost Basis</div>
                    <div className="text-sm font-bold font-mono text-neutral-600 dark:text-neutral-400 mt-0.5">
                      <PrivacyMask>{formatINRShort(prop.total_invested)}</PrivacyMask>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-semibold text-neutral-400">Appreciation</div>
                    <div
                      className={`text-sm font-bold font-mono mt-0.5 ${
                        isGain ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <PrivacyMask>
                        {isGain ? "+" : ""}
                        {prop.gain_pct.toFixed(1)}%
                      </PrivacyMask>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-semibold text-neutral-400">CAGR (Annual)</div>
                    <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {prop.cagr_pct.toFixed(1)}% p.a.
                    </div>
                  </div>
                </div>

                {/* Rental Inflow Row (If rented) */}
                {prop.is_rented ? (
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Key size={14} className="text-emerald-600 dark:text-emerald-400" />
                      Rented · ₹{prop.monthly_rental_income.toLocaleString("en-IN")}/mo
                    </span>
                    <span className="font-mono font-bold">
                      {prop.rental_yield_pct.toFixed(2)}% Gross Yield ({prop.total_return_xirr_pct.toFixed(1)}% XIRR)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs px-3 py-1.5 text-neutral-400">
                    <span>Self-occupied / Non-rented</span>
                    <span className="font-mono font-semibold">{prop.cagr_pct.toFixed(1)}% Total Return</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── MODAL ── */}
      <RealEstateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveHolding}
        initialData={editingItem}
      />
    </div>
  );
}
