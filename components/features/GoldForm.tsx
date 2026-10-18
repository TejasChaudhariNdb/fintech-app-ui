"use client";

import React, { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { Sparkles, TrendingUp, TrendingDown, Check, Coins } from "lucide-react";

export interface GoldHoldingFormData {
  id?: number;
  asset_name: string;
  asset_type: string;
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
}

const PRESET_NAMES = [
  "Wedding Chain",
  "Gold Bar",
  "Sovereign Coin",
  "Bangles",
  "Earrings",
  "Mangalsutra",
  "Gold Ring",
];

const WEIGHT_CHIPS = [
  { label: "+1g", add: 1 },
  { label: "+5g", add: 5 },
  { label: "+8g (1 Sov)", add: 8 },
  { label: "+10g", add: 10 },
  { label: "+20g", add: 20 },
  { label: "+50g", add: 50 },
];

export default function GoldForm({
  initialData,
  rates,
  onSave,
  onCancel,
  isSubmitting = false,
}: GoldFormProps) {
  const { profiles, activeProfileId } = useProfile();

  const [purity, setPurity] = useState<"24K" | "22K" | "18K">(
    initialData?.purity || "22K"
  );
  const [assetType, setAssetType] = useState<string>(
    initialData?.asset_type || "JEWELRY"
  );
  const [weightStr, setWeightStr] = useState<string>(
    initialData ? String(initialData.weight_grams) : ""
  );
  const [priceStr, setPriceStr] = useState<string>(
    initialData ? String(initialData.purchase_price_per_gram) : ""
  );
  const [makingChargesStr, setMakingChargesStr] = useState<string>(
    initialData?.making_charges !== undefined ? String(initialData.making_charges) : "0"
  );
  const [assetName, setAssetName] = useState<string>(
    initialData?.asset_name || ""
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
  const makingNum = parseFloat(makingChargesStr) || 0;

  const totalInvested = weightNum * priceNum + makingNum;
  const currentMarketValue = weightNum * currentLiveRate;
  const gain = currentMarketValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

  const handleUseLiveRate = () => {
    setPriceStr(String(Math.round(currentLiveRate)));
  };

  const handleWeightChip = (addGrams: number) => {
    const cur = parseFloat(weightStr) || 0;
    const next = Math.round((cur + addGrams) * 100) / 100;
    setWeightStr(String(next));
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

    const finalName =
      assetName.trim() ||
      `${purity} ${assetType === "JEWELRY" ? "Jewelry" : "Gold"} (${weightNum}g)`;

    const resolvedProfileId = selectedProfileId
      ? parseInt(selectedProfileId)
      : activeProfileId !== "all"
      ? parseInt(activeProfileId)
      : profiles.find((p) => p.is_default)?.id || profiles[0]?.id;

    try {
      await onSave({
        id: initialData?.id,
        asset_name: finalName,
        asset_type: assetType,
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

      {/* ── PURITY SELECTOR ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Gold Purity
          </label>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Coins size={13} />
            Live: ₹{liveRateFormatted}/g
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
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
          ).map((item) => {
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

      {/* ── ASSET CATEGORY ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          Asset Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "JEWELRY", label: "Jewelry" },
            { id: "PHYSICAL_BAR_COIN", label: "Coin / Bar" },
            { id: "DIGITAL_GOLD", label: "Digital / SGB" },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setAssetType(type.id)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                assetType === type.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs"
                  : "bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── WEIGHT (GRAMS) ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Weight in Grams <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] text-neutral-500">
            {weightNum > 0 ? `${(weightNum / 8).toFixed(2)} Sovereigns` : ""}
          </span>
        </div>

        <div className="relative">
          <input
            type="number"
            step="any"
            min="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-4 py-3 text-lg font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums placeholder:text-neutral-300 dark:placeholder:text-neutral-600 pr-12"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
            grams
          </span>
        </div>

        {/* Quick Weight Chips */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-neutral-400 uppercase font-medium mr-1">
            Add:
          </span>
          {WEIGHT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleWeightChip(chip.add)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {chip.label}
            </button>
          ))}
          {weightStr && (
            <button
              type="button"
              onClick={() => setWeightStr("")}
              className="text-[11px] text-neutral-400 hover:text-red-500 ml-auto transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── PURCHASE PRICE & MAKING CHARGES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
              <Sparkles size={11} /> Use Live Rate
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
      </div>

      {/* ── LIVE INVESTMENT PREVIEW CARD ── */}
      {weightNum > 0 && priceNum > 0 && (
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/70 dark:from-[#1A202C]/60 dark:to-[#121620]/80 p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Holding Summary</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {weightNum}g · {purity} Gold
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

      {/* ── ASSET NAME & SUGGESTIONS ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          Asset Name / Label
        </label>
        <input
          type="text"
          placeholder="e.g. Wedding chain, Tanishq coin"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none transition-all placeholder:text-neutral-400"
        />

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setAssetName(name)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 font-medium transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ── PURCHASE DATE & NOTES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Stored in SBI locker, receipt saved"
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
