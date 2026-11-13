"use client";
import DatePicker from "@/components/ui/DatePicker";
import GoldWeightInput from "@/components/features/GoldWeightInput";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useProfile } from "@/context/ProfileContext";
import { Sparkles, TrendingUp, TrendingDown, Check, Coins, ChevronDown, Plus } from "lucide-react";
import {
  COMMON_GOLD_CATEGORIES,
  assetTypeForCategory,
  cleanGoldCategory,
  inferGoldCategory,
  isPure24KCategory,
} from "@/lib/goldCategories";

export interface GoldHoldingFormData {
  id?: number;
  asset_name: string;
  asset_type: string;
  category?: string;
  purity: "24K" | "22K" | "18K";
  weight_grams: number;
  purchase_price_per_gram: number;
  making_charges: number;
  purchase_date: string;
  notes?: string;
  profile_id?: number;
}

interface GoldFormProps {
  initialData?: GoldHoldingFormData | null;
  rates: {
    rate_24k_per_gram?: number;
    rate_22k_per_gram?: number;
    rate_18k_per_gram?: number;
  } | null;
  onSave: (data: GoldHoldingFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  /** Categories the user already has, offered first in the picker. */
  existingCategories?: string[];
  /** A holding made of several purchases: its weight, price and date are edited on each purchase. */
  amountsLocked?: boolean;
}

export default function GoldForm({
  initialData,
  rates,
  onSave,
  onCancel,
  isSubmitting = false,
  existingCategories = [],
  amountsLocked = false,
}: GoldFormProps) {
  const { profiles, activeProfileId } = useProfile();

  const [chosenPurity, setPurity] = useState<"24K" | "22K" | "18K">(
    initialData?.purity || "24K"
  );
  // One field for what the gold is. Picking from the list ("Chain") or typing ("Wedding chain") both work:
  // the category is the picked option, a keyword in the text, or else the typed text as a new category.
  const initialItem = initialData?.asset_name || "";
  const [item, setItem] = useState<string>(initialItem);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const [weightStr, setWeightStr] = useState<string>(
    initialData ? String(initialData.weight_grams) : ""
  );
  const [priceStr, setPriceStr] = useState<string>(
    initialData ? String(initialData.purchase_price_per_gram) : ""
  );
  const [makingChargesStr, setMakingChargesStr] = useState<string>(
    initialData?.making_charges !== undefined ? String(initialData.making_charges) : "0"
  );
  const [purchaseDate, setPurchaseDate] = useState<string>(
    initialData?.purchase_date || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    if (initialData?.profile_id) return String(initialData.profile_id);
    if (activeProfileId && activeProfileId !== "all") return activeProfileId;
    return profiles[0]?.id ? String(profiles[0].id) : "";
  });

  useEffect(() => {
    if (initialData?.profile_id) {
      setSelectedProfileId(String(initialData.profile_id));
    } else if (activeProfileId && activeProfileId !== "all") {
      setSelectedProfileId(activeProfileId);
    } else if (profiles && profiles.length > 0 && !selectedProfileId) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      if (def) setSelectedProfileId(String(def.id));
    }
  }, [activeProfileId, profiles, initialData]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...existingCategories, ...COMMON_GOLD_CATEGORIES]) {
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        out.push(c);
      }
    }
    return out;
  }, [existingCategories]);

  const query = item.trim().toLowerCase();
  const filteredOptions = query ? categoryOptions.filter((c) => c.toLowerCase().includes(query)) : categoryOptions;
  const exactOption = categoryOptions.find((c) => c.toLowerCase() === query);

  const category = useMemo(() => {
    // An unchanged name keeps the category already saved on the holding.
    if (initialData?.category && item.trim() === initialItem.trim()) return initialData.category;
    if (!query) return "";
    return exactOption || inferGoldCategory(item) || cleanGoldCategory(item);
  }, [item, query, exactOption, initialData?.category, initialItem]);

  // Digital gold and SGBs are always 24K with no making charges.
  const isPure24K = isPure24KCategory(category);
  const purity = isPure24K ? "24K" : chosenPurity;

  const chooseOption = (value: string) => {
    setItem(value);
    setListOpen(false);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setListOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && listOpen) {
      e.preventDefault();
      if (filteredOptions[highlight]) chooseOption(filteredOptions[highlight]);
      else setListOpen(false);
    } else if (e.key === "Escape") {
      setListOpen(false);
    }
  };

  // Live rates based on selected purity
  const currentLiveRate =
    purity === "24K"
      ? rates?.rate_24k_per_gram || 13500
      : purity === "18K"
      ? rates?.rate_18k_per_gram || 10125
      : rates?.rate_22k_per_gram || 12375;

  const liveRateFormatted = Math.round(currentLiveRate).toLocaleString("en-IN");

  const weightNum = parseFloat(weightStr) || 0;
  const priceNum = parseFloat(priceStr) || 0;
  const makingNum = isPure24K ? 0 : parseFloat(makingChargesStr) || 0;

  const totalInvested = weightNum * priceNum + makingNum;
  const currentMarketValue = weightNum * currentLiveRate;
  const gain = currentMarketValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

  const handleUseLiveRate = () => {
    setPriceStr(String(Math.round(currentLiveRate)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (weightNum <= 0) {
      setErrorMsg("Please enter a valid weight in grams (greater than 0).");
      return;
    }
    if (priceNum <= 0) {
      setErrorMsg("Please enter a valid purchase price per gram.");
      return;
    }

    // The weight is shown on its own chip. Putting it in the name goes stale when the weight is edited.
    if (!item.trim()) {
      setErrorMsg("Please choose or type what this gold is, e.g. Chain or Digital Gold.");
      return;
    }
    const finalCategory = category || "Other Jewellery";
    const finalName = item.trim();

    const resolvedProfileId = selectedProfileId
      ? parseInt(selectedProfileId)
      : activeProfileId !== "all"
      ? parseInt(activeProfileId)
      : profiles.find((p) => p.is_default)?.id || profiles[0]?.id;

    try {
      await onSave({
        id: initialData?.id,
        asset_name: finalName,
        asset_type: assetTypeForCategory(finalCategory),
        category: finalCategory,
        purity,
        weight_grams: weightNum,
        purchase_price_per_gram: priceNum,
        making_charges: makingNum,
        purchase_date: purchaseDate,
        notes: notes.trim() || undefined,
        profile_id: resolvedProfileId || undefined,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save gold asset. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── PROFILE SELECTOR (If multiple profiles exist) ── */}
      {profiles.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Holding Owner
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-all dark:text-white"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.relation})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── WHAT IS IT: one type-ahead field for the name and category ── */}
      <div className="relative">
        <label
          htmlFor="gold-item"
          className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider"
        >
          Gold Item <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="gold-item"
            ref={itemInputRef}
            type="text"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls="gold-item-list"
            aria-autocomplete="list"
            autoComplete="off"
            maxLength={60}
            placeholder="Type or pick: Chain, Ring, Coin, Digital Gold..."
            value={item}
            onChange={(e) => {
              setItem(e.target.value);
              setListOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setListOpen(true)}
            onBlur={() => setListOpen(false)}
            onKeyDown={handleItemKeyDown}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-4 pr-10 py-3 text-sm font-semibold text-neutral-900 dark:text-white outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show options"
            onMouseDown={(e) => {
              e.preventDefault();
              setListOpen((o) => !o);
              itemInputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <ChevronDown size={16} className={`transition-transform ${listOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {listOpen && (filteredOptions.length > 0 || (query && !exactOption)) && (
          <ul
            id="gold-item-list"
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A202C] shadow-lg py-1"
          >
            {filteredOptions.map((opt, i) => (
              <li
                key={opt}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  chooseOption(opt);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between ${
                  i === highlight
                    ? "bg-amber-50 dark:bg-amber-500/10 text-neutral-900 dark:text-white"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <span>{opt}</span>
                {exactOption === opt && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
              </li>
            ))}
            {query && !exactOption && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setListOpen(false);
                }}
                className="px-4 py-2 text-sm cursor-pointer text-amber-700 dark:text-amber-400 flex items-center gap-1.5 border-t border-neutral-100 dark:border-white/5"
              >
                <Plus size={13} /> Use &ldquo;{item.trim()}&rdquo;
              </li>
            )}
          </ul>
        )}

        {query && category && category.toLowerCase() !== query && (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
            Grouped under <span className="font-semibold text-neutral-700 dark:text-neutral-200">{category}</span>
          </p>
        )}
      </div>

      {amountsLocked ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-3.5 py-2.5">
          This holding has several purchases. Edit the weight, price or date on each purchase in the list.
        </p>
      ) : (
      <>
      {/* ── PURITY SELECTOR ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Gold Purity
          </label>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Coins size={13} />
            Today: ₹{liveRateFormatted}/g
          </span>
        </div>

        {isPure24K && (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">
            {category} is always 24K (99.9%) gold.
          </p>
        )}
        <div className={`grid gap-2.5 ${isPure24K ? "grid-cols-1" : "grid-cols-3"}`}>
          {(
            [
              {
                id: "24K",
                label: "24K",
                sub: "99.9%",
                rate: rates?.rate_24k_per_gram,
              },
              {
                id: "22K",
                label: "22K",
                sub: "91.6%",
                rate: rates?.rate_22k_per_gram,
              },
              {
                id: "18K",
                label: "18K",
                sub: "75.0%",
                rate: rates?.rate_18k_per_gram,
              },
            ] as const
          )
            .filter((item) => !isPure24K || item.id === "24K")
            .map((item) => {
            const isSelected = purity === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPurity(item.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer touch-manipulation ${
                  isSelected
                    ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-300 ring-2 ring-amber-500/25 shadow-xs"
                    : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">{item.label}</span>
                  {isSelected && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {item.sub}
                </span>
                {item.rate && (
                  <span className="text-[11px] font-semibold text-neutral-900 dark:text-white mt-1 tabular-nums">
                    ₹{Math.round(item.rate).toLocaleString("en-IN")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── WEIGHT (grams or milligrams; stored in grams) ── */}
      <GoldWeightInput grams={weightStr} onChange={setWeightStr} />

      {/* ── PURCHASE PRICE & MAKING CHARGES ── */}
      <div className={`grid grid-cols-1 gap-3.5 ${isPure24K ? "" : "sm:grid-cols-2"}`}>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Buy Price / Gram <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleUseLiveRate}
              className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5"
            >
              <Sparkles size={11} /> Use Today&apos;s Rate
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="1"
              inputMode="decimal"
              placeholder={liveRateFormatted}
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
            />
          </div>
        </div>

        {!isPure24K && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Making Charges (Total)
            </label>
            <span className="text-[10px] text-neutral-400">Optional</span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0"
              value={makingChargesStr}
              onChange={(e) => setMakingChargesStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
            />
          </div>
        </div>
        )}
      </div>

      {/* ── LIVE INVESTMENT PREVIEW CARD ── */}
      {weightNum > 0 && priceNum > 0 && (
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/70 dark:from-[#1A202C]/60 dark:to-[#121620]/80 p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Holding Summary</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {weightNum}g · {purity} {category || "Gold"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-200/50 dark:border-white/5">
            <div>
              <div className="text-[11px] text-neutral-500">Invested</div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
                ₹{Math.round(totalInvested).toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-500">Today&apos;s Value</div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
                ₹{Math.round(currentMarketValue).toLocaleString("en-IN")}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-neutral-500">Net Return</div>
              <div
                className={`text-sm font-bold tabular-nums flex items-center justify-end gap-0.5 ${
                  gain >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {gain >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span>
                  {gain >= 0 ? "+" : ""}
                  {gainPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      </>
      )}

      {/* ── PURCHASE DATE & NOTES ── */}
      <div className={`grid grid-cols-1 gap-3.5 ${amountsLocked ? "" : "sm:grid-cols-2"}`}>
        {!amountsLocked && (
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Purchase Date
          </label>
          <DatePicker
            value={purchaseDate}
            onChange={(v) => setPurchaseDate(v)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none transition-all"
          />
        </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Tanishq, wedding gift, in SBI locker"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none transition-all placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* ── ERROR MESSAGE BANNER ── */}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div className="pt-2 flex items-center gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-sm shadow-md shadow-amber-500/25 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{initialData ? "Update Gold Asset" : "Save Gold Holding"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
