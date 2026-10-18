"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import GoldModal from "@/components/features/GoldModal";
import {
  Coins,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface GoldHoldingItem {
  id: number;
  profile_id?: number;
  asset_name: string;
  asset_type: string;
  purity: string;
  weight_grams: number;
  purchase_price_per_gram: number;
  making_charges?: number;
  total_invested: number;
  current_rate_per_gram: number;
  current_value: number;
  gain: number;
  return_pct: number;
  purchase_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

interface GoldRates {
  rate_24k_per_gram: number;
  rate_22k_per_gram: number;
  rate_18k_per_gram: number;
  currency: string;
  last_updated: string;
  source: string;
}

interface GoldSummary {
  total_grams: number;
  total_invested: number;
  total_current_value: number;
  overall_gain: number;
  overall_return_pct: number;
  count: number;
}

function formatINRShort(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) {
    return `${(val / 10000000).toFixed(2).replace(/\.00$/, "")}Cr`;
  }
  if (abs >= 100000) {
    return `${(val / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  }
  if (abs >= 1000) {
    return `${(val / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return val.toLocaleString("en-IN");
}

function formatDatePretty(dateStr?: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function GoldHoldingsPage() {
  const [rates, setRates] = useState<GoldRates | null>(null);
  const [summary, setSummary] = useState<GoldSummary | null>(null);
  const [holdings, setHoldings] = useState<GoldHoldingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GoldHoldingItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getGoldHoldings();
      if (res) {
        setRates(res.rates);
        setSummary(res.summary);
        setHoldings(res.holdings || []);
      }
    } catch (err) {
      console.error("Failed to load gold holdings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("added") === "true") {
        showToast("Gold added successfully");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAddSheet = () => {
    setEditingItem(null);
    setSheetOpen(true);
  };

  const handleOpenEditSheet = (item: GoldHoldingItem) => {
    setEditingItem(item);
    setSheetOpen(true);
  };

  const handleSaveHolding = async (payload: {
    asset_name: string;
    asset_type: string;
    purity: string;
    weight_grams: number;
    purchase_price_per_gram: number;
    making_charges: number;
    purchase_date: string;
    notes?: string;
  }) => {
    if (editingItem) {
      await api.updateGoldHolding(editingItem.id, payload);
      showToast("Gold asset updated");
    } else {
      await api.addGoldHolding(payload);
      showToast("Gold added");
    }
    await loadData();
  };

  const handleDeleteHolding = async (id: number) => {
    if (!confirm("Are you sure you want to delete this gold holding?")) return;
    try {
      await api.deleteGoldHolding(id);
      showToast("Gold asset removed");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete holding");
    }
  };

  return (
    <div className="px-4 space-y-6 max-w-7xl mx-auto">
      {/* ── LIVE ONLINE GOLD RATE TICKER ── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Coins size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  Today&apos;s Live Gold Rates (India)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Market
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Live bullion &amp; spot benchmark rate per gram (INR)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Refresh Live Gold Rates">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <Link
              href="/holdings/gold/add"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 font-semibold text-xs sm:text-sm transition-colors"
              title="Open full dedicated add page">
              <ExternalLink size={15} />
              <span>Full Page</span>
            </Link>
            <button
              onClick={handleOpenAddSheet}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95">
              <Plus size={16} />
              <span>Add Gold</span>
            </button>
          </div>
        </div>

        {/* Live Rates Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-amber-500/15">
          <div className="bg-white/80 dark:bg-black/25 p-3 rounded-xl border border-neutral-200/50 dark:border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">24K Gold (99.9%)</span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-medium">Pure</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              ₹{rates?.rate_24k_per_gram ? Math.round(rates.rate_24k_per_gram).toLocaleString("en-IN") : "--"}{" "}
              <span className="text-xs text-neutral-500 font-normal">/ gram</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              10g: ₹{rates?.rate_24k_per_gram ? Math.round(rates.rate_24k_per_gram * 10).toLocaleString("en-IN") : "--"}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-black/25 p-3 rounded-xl border border-neutral-200/50 dark:border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">22K Gold (91.6%)</span>
              <span className="text-[10px] bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.2 rounded font-medium">Jewelry</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              ₹{rates?.rate_22k_per_gram ? Math.round(rates.rate_22k_per_gram).toLocaleString("en-IN") : "--"}{" "}
              <span className="text-xs text-neutral-500 font-normal">/ gram</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              10g: ₹{rates?.rate_22k_per_gram ? Math.round(rates.rate_22k_per_gram * 10).toLocaleString("en-IN") : "--"}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-black/25 p-3 rounded-xl border border-neutral-200/50 dark:border-white/5">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">18K Gold (75.0%)</span>
              <span className="text-[10px] bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.2 rounded font-medium">Diamond</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              ₹{rates?.rate_18k_per_gram ? Math.round(rates.rate_18k_per_gram).toLocaleString("en-IN") : "--"}{" "}
              <span className="text-xs text-neutral-500 font-normal">/ gram</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              10g: ₹{rates?.rate_18k_per_gram ? Math.round(rates.rate_18k_per_gram * 10).toLocaleString("en-IN") : "--"}
            </div>
          </div>
        </div>
      </div>

      {/* ── PORTFOLIO STATS SUMMARY ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Current Valuation</span>
            <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
              <PrivacyMask>₹{Math.round(summary.total_current_value).toLocaleString("en-IN")}</PrivacyMask>
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">{summary.count} Assets tracked</span>
          </Card>

          <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Invested</span>
            <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">
              <PrivacyMask>₹{Math.round(summary.total_invested).toLocaleString("en-IN")}</PrivacyMask>
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">Historical cost basis</span>
          </Card>

          <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Gain / Loss</span>
            <div className={`text-lg sm:text-xl font-bold mt-1 tabular-nums flex items-center gap-1 ${
              summary.overall_gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>
              <PrivacyMask>₹{Math.round(summary.overall_gain).toLocaleString("en-IN")}</PrivacyMask>
              <span className="text-xs font-semibold">
                ({summary.overall_return_pct >= 0 ? "+" : ""}{summary.overall_return_pct}%)
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">Unrealized return</span>
          </Card>

          <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Weight</span>
            <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums flex items-baseline gap-1">
              <span>{summary.total_grams.toFixed(2)}</span>
              <span className="text-xs text-neutral-500 font-normal">grams</span>
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              ≈ {(summary.total_grams / 10).toFixed(2)} tolas
            </span>
          </Card>
        </div>
      )}

      {/* ── HOLDINGS LIST (MATCHING SCREENSHOT 4) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Gold Holdings ({holdings.length})
          </h3>
          <button
            onClick={handleOpenAddSheet}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
            <Plus size={14} />
            <span>Add another</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : holdings.length === 0 ? (
          <Card className="p-8 text-center bg-white dark:bg-surface border border-dashed border-neutral-300 dark:border-white/10 rounded-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <Coins size={24} />
            </div>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              No Gold Holdings Yet
            </h4>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
              Add your physical gold coins, jewelry, Sovereign Gold Bonds (SGB), or digital gold to track automated daily market valuation!
            </p>
            <button
              onClick={handleOpenAddSheet}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm">
              + Add First Gold Holding
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.map((item) => {
              const isGain = item.gain >= 0;
              const making = item.making_charges || 0;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-neutral-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    {/* Top Row: Title + Action buttons */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-neutral-900 dark:text-white text-base capitalize">
                        {item.asset_name}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSheet(item)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                          title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteHolding(item.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Chips: [22K] [500g] (matching screenshot 4) */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {item.purity}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-white/5">
                        {item.weight_grams}g
                      </span>
                    </div>

                    {/* Breakdown Rows (matching Screenshot 4) */}
                    <div className="space-y-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                      <div className="flex justify-between items-center">
                        <span>Purchased on</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {formatDatePretty(item.purchase_date)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Invested value</span>
                        <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                          <PrivacyMask>₹{formatINRShort(item.total_invested)}</PrivacyMask>
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Making charges</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">
                          ₹{making.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Return value</span>
                        <span className={`font-bold tabular-nums ${isGain ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>
                          <PrivacyMask>{isGain ? "+" : "-"}₹{formatINRShort(Math.abs(item.gain))}</PrivacyMask>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Divider & Summary (matching Screenshot 4) */}
                  <div className="mt-4 pt-3.5 border-t border-neutral-100 dark:border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Current value
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white tabular-nums">
                        <PrivacyMask>₹{formatINRShort(item.current_value)}</PrivacyMask>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Return %
                      </span>
                      <span className={`text-base sm:text-lg font-extrabold tabular-nums ${
                        isGain ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"
                      }`}>
                        {isGain ? "+" : ""}{item.return_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── GOLD MODAL / BOTTOM SHEET (PORTALED TO DOCUMENT BODY) ── */}
      <GoldModal
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveHolding}
        rates={rates}
        initialData={
          editingItem
            ? {
                id: editingItem.id,
                asset_name: editingItem.asset_name,
                asset_type: editingItem.asset_type,
                purity: (editingItem.purity as "24K" | "22K" | "18K") || "22K",
                weight_grams: editingItem.weight_grams,
                purchase_price_per_gram: editingItem.purchase_price_per_gram,
                making_charges: editingItem.making_charges || 0,
                purchase_date: editingItem.purchase_date || new Date().toISOString().split("T")[0],
                notes: editingItem.notes || "",
                profile_id: editingItem.profile_id,
              }
            : null
        }
      />

      {/* ── FLOATING TOAST NOTIFICATION (MATCHING SCREENSHOT 4) ── */}
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
