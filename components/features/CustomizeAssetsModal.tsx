"use client";

import React, { useState, useEffect, useMemo } from "react";
import Modal from "../ui/Modal";
import {
  TrendingUp,
  LineChart,
  Landmark,
  Sparkles,
  Home,
  ShieldCheck,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  NetWorthAssetPreferences,
  DEFAULT_ASSET_PREFERENCES,
  countActiveAssets,
} from "@/lib/assetPreferences";

interface CustomizeAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NetWorthAssetPreferences;
  onSave: (prefs: NetWorthAssetPreferences) => void;
  values?: {
    mutual_funds?: number;
    stocks?: number;
    fixed_income?: number;
    gold?: number;
    real_estate?: number;
    insurance_cover?: number;
  };
}

interface AssetOption {
  key: keyof NetWorthAssetPreferences;
  label: string;
  description: string;
  icon: React.ElementType;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
  isCoreWealth: boolean;
}

const ASSET_OPTIONS: AssetOption[] = [
  {
    key: "mutual_funds",
    label: "Mutual Funds",
    description: "Active, index, ETF, and flexi-cap portfolios",
    icon: TrendingUp,
    colorClass: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/20",
      badgeBg: "bg-emerald-500",
    },
    isCoreWealth: true,
  },
  {
    key: "stocks",
    label: "Stocks & Equities",
    description: "Direct equity shares and demat holdings",
    icon: LineChart,
    colorClass: {
      bg: "bg-blue-500/10 dark:bg-blue-500/15",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/20",
      badgeBg: "bg-blue-500",
    },
    isCoreWealth: true,
  },
  {
    key: "fixed_income",
    label: "Fixed Income & Debt",
    description: "Fixed Deposits, PPF, EPF, and government bonds",
    icon: Landmark,
    colorClass: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-500/20",
      badgeBg: "bg-cyan-500",
    },
    isCoreWealth: true,
  },
  {
    key: "gold",
    label: "Gold & Bullion",
    description: "Sovereign Gold Bonds (SGB), digital, and physical bullion",
    icon: Sparkles,
    colorClass: {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/20",
      badgeBg: "bg-amber-500",
    },
    isCoreWealth: true,
  },
  {
    key: "real_estate",
    label: "Real Estate & Land",
    description: "Residential properties, commercial assets, and land holdings",
    icon: Home,
    colorClass: {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/20",
      badgeBg: "bg-rose-500",
    },
    isCoreWealth: true,
  },
  {
    key: "show_insurance_cover",
    label: "Family Insurance Cover",
    description: "Display term life & health sum assured in family protection cards",
    icon: ShieldCheck,
    colorClass: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/20",
      badgeBg: "bg-indigo-500",
    },
    isCoreWealth: false,
  },
];

export default function CustomizeAssetsModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  values,
}: CustomizeAssetsModalProps) {
  const [localPrefs, setLocalPrefs] = useState<NetWorthAssetPreferences>(preferences);
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences);
      setValidationError("");
    }
  }, [isOpen, preferences]);

  const activeCoreCount = useMemo(() => {
    return countActiveAssets(localPrefs).active;
  }, [localPrefs]);

  // Calculate live preview of recalculated Net Worth
  const previewNetWorth = useMemo(() => {
    if (!values) return null;
    let total = 0;
    if (localPrefs.mutual_funds) total += values.mutual_funds || 0;
    if (localPrefs.stocks) total += values.stocks || 0;
    if (localPrefs.fixed_income) total += values.fixed_income || 0;
    if (localPrefs.gold) total += values.gold || 0;
    if (localPrefs.real_estate) total += values.real_estate || 0;
    return total;
  }, [localPrefs, values]);

  const handleToggle = (key: keyof NetWorthAssetPreferences) => {
    setValidationError("");
    // If it's a core wealth asset and turning it OFF would leave 0 active, disallow it
    const option = ASSET_OPTIONS.find((o) => o.key === key);
    if (option?.isCoreWealth && localPrefs[key] && activeCoreCount <= 1) {
      setValidationError("At least one core asset class must remain enabled in your Net Worth.");
      return;
    }

    setLocalPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (preset: "all" | "liquid" | "financial") => {
    setValidationError("");
    if (preset === "all") {
      setLocalPrefs({
        mutual_funds: true,
        stocks: true,
        fixed_income: true,
        gold: true,
        real_estate: true,
        show_insurance_cover: localPrefs.show_insurance_cover,
      });
    } else if (preset === "liquid") {
      setLocalPrefs({
        mutual_funds: true,
        stocks: true,
        fixed_income: false,
        gold: false,
        real_estate: false,
        show_insurance_cover: localPrefs.show_insurance_cover,
      });
    } else if (preset === "financial") {
      setLocalPrefs({
        mutual_funds: true,
        stocks: true,
        fixed_income: true,
        gold: true,
        real_estate: false,
        show_insurance_cover: localPrefs.show_insurance_cover,
      });
    }
  };

  const handleResetToDefault = () => {
    setLocalPrefs({ ...DEFAULT_ASSET_PREFERENCES });
    setValidationError("");
  };

  const handleSave = () => {
    if (activeCoreCount === 0) {
      setValidationError("Please select at least one core wealth asset class.");
      return;
    }
    onSave(localPrefs);
    onClose();
  };

  const formatRupee = (val?: number) => {
    if (val === undefined || val === null) return "₹0";
    return `₹${Math.round(val).toLocaleString("en-IN")}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Net Worth">
      <div className="space-y-5 text-neutral-900 dark:text-white pt-1">
        {/* Intro */}
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Tailor your Net Worth calculation. Choose which asset classes and holdings are aggregated across your dashboard, allocation charts, and family breakdown.
        </p>

        {/* Quick Presets */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-2">
            Quick Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                localPrefs.mutual_funds &&
                localPrefs.stocks &&
                localPrefs.fixed_income &&
                localPrefs.gold &&
                localPrefs.real_estate
                  ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/30 font-bold"
                  : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-white/10 hover:bg-neutral-200/60 dark:hover:bg-white/10"
              }`}
            >
              All Assets (5/5)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("liquid")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                localPrefs.mutual_funds &&
                localPrefs.stocks &&
                !localPrefs.fixed_income &&
                !localPrefs.gold &&
                !localPrefs.real_estate
                  ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/30 font-bold"
                  : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-white/10 hover:bg-neutral-200/60 dark:hover:bg-white/10"
              }`}
            >
              Liquid Only (MF + Stocks)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("financial")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                localPrefs.mutual_funds &&
                localPrefs.stocks &&
                localPrefs.fixed_income &&
                localPrefs.gold &&
                !localPrefs.real_estate
                  ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/30 font-bold"
                  : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-white/10 hover:bg-neutral-200/60 dark:hover:bg-white/10"
              }`}
            >
              Financial Only (No Property)
            </button>
          </div>
        </div>

        {/* Live Preview Banner */}
        {previewNetWorth !== null && (
          <div className="rounded-2xl p-4 bg-linear-to-r from-primary-600/10 via-indigo-600/10 to-primary-600/5 dark:from-primary-500/15 dark:via-indigo-500/10 dark:to-transparent border border-primary-500/20 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 block">
                Calculated Net Worth Preview
              </span>
              <p className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                {formatRupee(previewNetWorth)}
              </p>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Aggregating {activeCoreCount} of 5 core wealth categories
              </span>
            </div>
            <div className="shrink-0 p-2.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <SlidersHorizontal size={20} />
            </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-shake">
            <AlertCircle size={16} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Asset Toggle List */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
            Core Asset Classes
          </span>

          <div className="space-y-2">
            {ASSET_OPTIONS.map((opt) => {
              const isChecked = !!localPrefs[opt.key];
              const Icon = opt.icon;
              const valKey =
                opt.key === "mutual_funds"
                  ? "mutual_funds"
                  : opt.key === "stocks"
                  ? "stocks"
                  : opt.key === "fixed_income"
                  ? "fixed_income"
                  : opt.key === "gold"
                  ? "gold"
                  : opt.key === "real_estate"
                  ? "real_estate"
                  : "insurance_cover";
              const assetVal = values ? values[valKey] : undefined;

              return (
                <div
                  key={opt.key}
                  onClick={() => handleToggle(opt.key)}
                  className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "bg-white dark:bg-white/5 border-neutral-300/80 dark:border-white/15 shadow-xs"
                      : "bg-neutral-50/70 dark:bg-black/20 border-neutral-200/50 dark:border-white/5 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${opt.colorClass.bg} ${opt.colorClass.border} ${opt.colorClass.text}`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {opt.label}
                        </span>
                        {assetVal !== undefined && assetVal > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 tabular-nums">
                            {formatRupee(assetVal)}
                          </span>
                        )}
                        {!opt.isCoreWealth && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            Protection
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="shrink-0 flex items-center">
                    <div
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 duration-200 ease-in-out ${
                        isChecked ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          isChecked ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-200/80 dark:border-white/10">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-primary-600/20 cursor-pointer"
            >
              <Check size={14} />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

