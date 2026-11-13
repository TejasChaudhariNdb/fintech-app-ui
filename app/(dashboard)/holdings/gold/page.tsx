"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import Link from "next/link";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import GoldModal from "@/components/features/GoldModal";
import GoldPurchaseModal, { GoldPurchaseSave } from "@/components/features/GoldPurchaseModal";
import GoldRateSource, { GoldRateInfo } from "@/components/features/GoldRateSource";
import {
  Coins,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  ChevronDown,
  StickyNote,
} from "lucide-react";

interface GoldHoldingItem {
  id: number;
  profile_id?: number;
  asset_name: string;
  asset_type: string;
  category: string;
  purity: string;
  weight_grams: number;
  purchase_price_per_gram: number;
  making_charges?: number;
  total_invested: number;
  current_rate_per_gram: number;
  current_value: number;
  gain: number;
  return_pct: number;
  xirr: number | null;
  cagr: number | null;
  holding_days: number;
  annualised: boolean;
  purchase_date?: string | null;
  purchase_count: number;
  purchases: GoldPurchaseItem[];
  notes?: string | null;
  created_at?: string | null;
}

type GoldRates = GoldRateInfo;

/** One top-up inside a holding that accumulates purchases (digital gold). */
interface GoldPurchaseItem {
  id: number;
  purchase_date: string;
  weight_grams: number;
  price_per_gram: number;
  making_charges: number;
  amount: number;
  current_value: number;
  gain: number;
  return_pct: number;
  xirr: number | null;
  notes?: string | null;
}

/** A remark the user wrote (shop, platform, who it is for), set apart from the figures. */
function NoteLine({ text }: { text?: string | null }) {
  if (!text?.trim()) return null;
  return (
    <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-400 break-words">
      <StickyNote size={11} className="mt-[2px] shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/** Grams without float noise: 0.30000000000000004 -> 0.3. */
function grams(g: number): string {
  return String(Number(g.toFixed(4)));
}

interface ReturnStats {
  xirr: number | null;
  cagr: number | null;
  holding_days: number;
  annualised: boolean;
}

interface GoldCategory extends ReturnStats {
  category: string;
  count: number;
  total_grams: number;
  total_invested: number;
  total_current_value: number;
  gain: number;
  return_pct: number;
  holding_ids: number[];
}

interface GoldSummary {
  total_grams: number;
  total_invested: number;
  total_current_value: number;
  overall_gain: number;
  overall_return_pct: number;
  xirr: number | null;
  cagr: number | null;
  holding_days: number;
  annualised: boolean;
  count: number;
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "--";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/** XIRR from each purchase date to today; the absolute return when there is none yet (bought today). */
function ReturnLine({ stats, absPct }: { stats: Pick<ReturnStats, "xirr">; absPct: number }) {
  if (stats.xirr !== null) {
    return (
      <span className={stats.xirr >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}>
        XIRR {pct(stats.xirr)}
      </span>
    );
  }
  return <span className="text-neutral-500 dark:text-neutral-400">Abs {pct(absPct)}</span>;
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
  const { activeProfileId } = useProfile();
  const [rates, setRates] = useState<GoldRates | null>(null);
  const [summary, setSummary] = useState<GoldSummary | null>(null);
  const [holdings, setHoldings] = useState<GoldHoldingItem[]>([]);
  const [categories, setCategories] = useState<GoldCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openHistory, setOpenHistory] = useState<Record<number, boolean>>({});
  const [editingPurchase, setEditingPurchase] = useState<{ holdingId: number; purchase: GoldPurchaseItem } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GoldHoldingItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // A filter on a category that no longer exists (last item deleted) falls back to All.
  const shownCategory = categories.some((c) => c.category === activeCategory) ? activeCategory : "All";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getGoldHoldings(activeProfileId);
      if (res) {
        setRates(res.rates);
        setSummary(res.summary);
        setHoldings(res.holdings || []);
        setCategories(res.categories || []);
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
  }, [activeProfileId]);

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
    category?: string;
    purity: string;
    weight_grams: number;
    purchase_price_per_gram: number;
    making_charges: number;
    purchase_date: string;
    notes?: string;
  }) => {
    if (editingItem) {
      const purchases = editingItem.purchases?.length || 0;
      const amountsChanged =
        payload.weight_grams !== editingItem.weight_grams ||
        payload.purchase_price_per_gram !== editingItem.purchase_price_per_gram ||
        payload.making_charges !== (editingItem.making_charges || 0) ||
        payload.purchase_date !== (editingItem.purchase_date || payload.purchase_date);
      if (
        purchases > 1 &&
        amountsChanged &&
        !confirm(
          `This holding has ${purchases} purchases. Changing the weight, price or date replaces them with one purchase, and XIRR will use the date you enter. Continue?`
        )
      ) {
        return;
      }
      await api.updateGoldHolding(editingItem.id, payload);
      showToast("Gold asset updated");
    } else {
      await api.addGoldHolding(payload);
      showToast("Gold added");
    }
    await loadData();
  };

  const handleSavePurchase = async (data: GoldPurchaseSave) => {
    if (!editingPurchase) return;
    await api.updateGoldPurchase(editingPurchase.holdingId, editingPurchase.purchase.id, data);
    showToast("Purchase updated");
    await loadData();
  };

  const handleDeletePurchase = async (holdingId: number, purchase: GoldPurchaseItem) => {
    if (
      !confirm(
        `Remove the ${formatDatePretty(purchase.purchase_date)} purchase of ${grams(purchase.weight_grams)}g? The holding's weight and invested amount will be reduced.`
      )
    )
      return;
    try {
      await api.deleteGoldPurchase(holdingId, purchase.id);
      showToast("Purchase removed");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove purchase");
    }
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
      {/* ── GOLD RATE (24K, excl. GST) WITH SOURCE ── */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent border border-amber-500/25 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Coins size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                24K Gold<span className="hidden sm:inline"> · Estimated Indian Market Rate</span> · per gram
              </div>
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
                ₹{rates?.rate_24k_per_gram ? rates.rate_24k_per_gram.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                22K ₹{rates?.rate_22k_per_gram ? Math.round(rates.rate_22k_per_gram).toLocaleString("en-IN") : "--"}
                <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">·</span>
                18K ₹{rates?.rate_18k_per_gram ? Math.round(rates.rate_18k_per_gram).toLocaleString("en-IN") : "--"}
                <span className="hidden sm:inline">
                  <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">·</span>
                  10g 24K ₹{rates?.rate_24k_per_gram ? Math.round(rates.rate_24k_per_gram * 10).toLocaleString("en-IN") : "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Refresh gold rate"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenAddSheet}
              aria-label="Add Gold"
              className="flex items-center gap-1.5 p-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-xs sm:text-sm shadow-sm shadow-amber-500/25 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Gold</span>
            </button>
          </div>
        </div>
        <div className="pt-3 border-t border-amber-500/20">
          <GoldRateSource rates={rates} />
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
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              {summary.count} assets · {summary.total_grams.toFixed(2)} g
            </span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">XIRR</span>
            <div className={`text-lg sm:text-xl font-bold mt-1 tabular-nums ${
              summary.xirr === null ? "text-neutral-400" : summary.xirr >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>
              {pct(summary.xirr)}
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Annualised return
            </span>
          </Card>
        </div>
      )}

      {/* ── HOLDINGS GROUPED BY CATEGORY ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Gold Holdings ({holdings.length})
          </h3>
          <button
            onClick={handleOpenAddSheet}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Add another</span>
          </button>
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {["All", ...categories.map((c) => c.category)].map((name) => {
              const count = name === "All" ? holdings.length : categories.find((c) => c.category === name)?.count;
              const selected = shownCategory === name;
              return (
                <button
                  key={name}
                  onClick={() => setActiveCategory(name)}
                  aria-pressed={selected}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selected
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                      : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10"
                  }`}
                >
                  {name} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}

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
              Add your chains, rings, coins, Sovereign Gold Bonds (SGB) or digital gold to track their value at today&apos;s rate.
            </p>
            <button
              onClick={handleOpenAddSheet}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shadow-amber-500/25 active:scale-95"
            >
              + Add First Gold Holding
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {categories
              .filter((c) => shownCategory === "All" || c.category === shownCategory)
              .map((cat) => {
                const items = holdings.filter((h) => cat.holding_ids.includes(h.id));
                const isOpen = !collapsed[cat.category];
                const catGain = cat.gain >= 0;
                return (
                  <section
                    key={cat.category}
                    className="rounded-2xl bg-white dark:bg-white/[0.03] border border-neutral-200/90 dark:border-white/10 shadow-sm overflow-hidden"
                  >
                    {/* Category header: totals and XIRR for the group */}
                    <button
                      onClick={() => setCollapsed((prev) => ({ ...prev, [cat.category]: isOpen }))}
                      aria-expanded={isOpen}
                      className="w-full text-left p-4 sm:p-5 flex items-center gap-3 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-black text-sm">
                        {cat.category.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm sm:text-base">{cat.category}</h4>
                          <span className="text-[11px] text-neutral-500 tabular-nums">
                            {cat.count} {cat.count === 1 ? "item" : "items"} · {cat.total_grams.toFixed(2)} g
                          </span>
                        </div>
                        <div className="text-[11px] sm:text-xs tabular-nums mt-0.5 flex gap-x-2 flex-wrap">
                          <span className="text-neutral-500">
                            Invested <PrivacyMask>₹{formatINRShort(cat.total_invested)}</PrivacyMask>
                          </span>
                          <ReturnLine stats={cat} absPct={cat.return_pct} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white tabular-nums">
                          <PrivacyMask>₹{formatINRShort(cat.total_current_value)}</PrivacyMask>
                        </div>
                        <div className={`text-[11px] font-semibold tabular-nums ${catGain ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>
                          <PrivacyMask>{catGain ? "+" : "-"}₹{formatINRShort(Math.abs(cat.gain))}</PrivacyMask> ({pct(cat.return_pct)})
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <ul className="divide-y divide-neutral-100 dark:divide-white/5 border-t border-neutral-100 dark:border-white/5">
                        {items.map((item) => {
                          const isGain = item.gain >= 0;
                          const making = item.making_charges || 0;
                          return (
                            <li key={item.id} className="px-4 sm:px-5 py-3.5">
                              <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-neutral-900 dark:text-white text-sm capitalize">
                                    {/* Older names carry a weight, e.g. "24K Gold (0.01g)". The weight chip is the real one. */}
                                    {(item.asset_name ?? "").replace(/\s*\(\s*[\d.]+\s*g\s*\)\s*$/i, "")}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                                    {item.purity}
                                  </span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                                    {grams(item.weight_grams)}g
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums flex gap-x-2 flex-wrap">
                                  <span>
                                    {item.purchases?.length > 1 ? "Since " : ""}
                                    {formatDatePretty(item.purchase_date)}
                                  </span>
                                  <span>
                                    Invested <PrivacyMask>₹{formatINRShort(item.total_invested)}</PrivacyMask>
                                    {making > 0 && <> (incl. ₹{formatINRShort(making)} making)</>}
                                  </span>
                                  <ReturnLine stats={item} absPct={item.return_pct} />
                                </div>
                                {/* The holding's own note; for a multi-purchase holding it is shown unless a purchase already carries it. */}
                                {!item.purchases?.some((p) => p.notes === item.notes) && <NoteLine text={item.notes} />}
                                {item.purchases?.length > 1 && (
                                  <button
                                    onClick={() => setOpenHistory((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                                    aria-expanded={!!openHistory[item.id]}
                                    className="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                                  >
                                    {item.purchases.length} purchases
                                    <ChevronDown
                                      size={12}
                                      className={`transition-transform ${openHistory[item.id] ? "rotate-180" : ""}`}
                                    />
                                  </button>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
                                  <PrivacyMask>₹{formatINRShort(item.current_value)}</PrivacyMask>
                                </div>
                                <div className={`text-[11px] font-semibold tabular-nums ${isGain ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>
                                  {pct(item.return_pct)}
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row items-center gap-0.5 shrink-0 -mr-1.5">
                                <button
                                  onClick={() => handleOpenEditSheet(item)}
                                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                                  title="Edit"
                                  aria-label={`Edit ${item.asset_name}`}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteHolding(item.id)}
                                  className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                  title="Delete"
                                  aria-label={`Delete ${item.asset_name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              </div>

                              {/* Purchase history: each top-up's date, amount, value today and XIRR */}
                              {item.purchases?.length > 1 && openHistory[item.id] && (
                                <ol className="mt-2.5 ml-1 pl-3 border-l-2 border-amber-500/30 space-y-2">
                                  {item.purchases.map((p) => (
                                    <li key={p.id} className="flex items-start justify-between gap-2 text-[11px] tabular-nums">
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                                          {formatDatePretty(p.purchase_date)} · {grams(p.weight_grams)}g
                                        </div>
                                        <div className="text-neutral-500 dark:text-neutral-400">
                                          @ ₹{Math.round(p.price_per_gram).toLocaleString("en-IN")}/g · Invested{" "}
                                          <PrivacyMask>₹{formatINRShort(p.amount)}</PrivacyMask>
                                        </div>
                                        <NoteLine text={p.notes} />
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="font-semibold text-neutral-900 dark:text-white">
                                          <PrivacyMask>₹{formatINRShort(p.current_value)}</PrivacyMask>
                                        </div>
                                        <ReturnLine stats={p} absPct={p.return_pct} />
                                      </div>
                                      <div className="flex items-center gap-0.5 shrink-0 -mr-1.5">
                                        <button
                                          onClick={() => setEditingPurchase({ holdingId: item.id, purchase: p })}
                                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                                          title="Edit purchase"
                                          aria-label={`Edit purchase of ${formatDatePretty(p.purchase_date)}`}
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePurchase(item.id, p)}
                                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                          title="Remove purchase"
                                          aria-label={`Remove purchase of ${formatDatePretty(p.purchase_date)}`}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
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
        existingCategories={categories.map((c) => c.category)}
        amountsLocked={(editingItem?.purchases?.length || 0) > 1}
        initialData={
          editingItem
            ? {
                id: editingItem.id,
                asset_name: editingItem.asset_name,
                asset_type: editingItem.asset_type,
                category: editingItem.category,
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

      <GoldPurchaseModal
        purchase={editingPurchase?.purchase ?? null}
        onClose={() => setEditingPurchase(null)}
        onSave={handleSavePurchase}
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
