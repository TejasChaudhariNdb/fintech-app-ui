"use client";

import React, { useState } from "react";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import {
  PieChart,
  ShieldCheck,
  TrendingUp,
  Zap,
  HelpCircle,
  ChevronDown,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";

export interface ConstituentItem {
  name: string;
  type: "MUTUAL_FUND" | "STOCK";
  allocated_value: number;
  total_value: number;
  ratio: number;
}

export interface MarketCapData {
  total_equity_value: number;
  total_portfolio_value: number;
  non_equity_value: number;
  large_cap: {
    value: number;
    percentage: number;
    items?: ConstituentItem[];
  };
  mid_cap: {
    value: number;
    percentage: number;
    items?: ConstituentItem[];
  };
  small_cap: {
    value: number;
    percentage: number;
    items?: ConstituentItem[];
  };
}

interface MarketCapAllocationCardProps {
  data?: MarketCapData | null;
  isLoading?: boolean;
}

export default function MarketCapAllocationCard({
  data,
  isLoading = false,
}: MarketCapAllocationCardProps) {
  const [activeCapDetail, setActiveCapDetail] = useState<"large" | "mid" | "small" | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-5 sm:p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl animate-pulse">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-white/10 rounded-md mb-4" />
        <div className="h-4 w-full bg-neutral-200 dark:bg-white/10 rounded-full mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 bg-neutral-200 dark:bg-white/10 rounded-xl" />
          <div className="h-20 bg-neutral-200 dark:bg-white/10 rounded-xl" />
          <div className="h-20 bg-neutral-200 dark:bg-white/10 rounded-xl" />
        </div>
      </Card>
    );
  }

  if (!data || data.total_equity_value <= 0) {
    return null;
  }

  const { large_cap, mid_cap, small_cap, total_equity_value } = data;

  const largeWidth = Math.max(0, Math.min(100, large_cap.percentage || 0));
  const midWidth = Math.max(0, Math.min(100, mid_cap.percentage || 0));
  const smallWidth = Math.max(0, Math.min(100, small_cap.percentage || 0));

  const currentItems =
    activeCapDetail === "large"
      ? large_cap.items || []
      : activeCapDetail === "mid"
      ? mid_cap.items || []
      : activeCapDetail === "small"
      ? small_cap.items || []
      : [];

  const currentTitle =
    activeCapDetail === "large"
      ? "Large Cap Holdings"
      : activeCapDetail === "mid"
      ? "Mid Cap Holdings"
      : "Small Cap Holdings";

  return (
    <Card className="p-5 sm:p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <PieChart size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Market Cap Allocation
              </h3>
              <button
                type="button"
                onClick={() => setShowHowItWorks((prev) => !prev)}
                className="cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title="Tap to see how stocks and funds are classified">
                <HelpCircle size={14} />
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Equity exposure split across Large, Mid &amp; Small cap tiers (Tap card to see holdings)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 rounded-xl self-start sm:self-auto border border-neutral-200/50 dark:border-white/5">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Equity:
          </span>
          <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
            <PrivacyMask>₹{Math.round(total_equity_value).toLocaleString("en-IN")}</PrivacyMask>
          </span>
        </div>
      </div>

      {/* Explainer Accordion if opened */}
      {showHowItWorks && (
        <div className="mb-5 p-3.5 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
            <Info size={14} className="text-blue-500" />
            <span>How your stocks &amp; mutual funds are classified:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-400 text-[11px]">
            <div>
              <strong className="text-neutral-900 dark:text-white">Stocks (SEBI Standard):</strong>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                <li><strong>Large Cap:</strong> Top 100 Indian companies by market cap (Reliance, TCS, HDFC Bank, etc.)</li>
                <li><strong>Mid Cap:</strong> 101st to 250th companies (Polycab, Tata Tech, BHEL, etc.)</li>
                <li><strong>Small Cap:</strong> 251st and below (Emerging microcaps &amp; small caps)</li>
              </ul>
            </div>
            <div>
              <strong className="text-neutral-900 dark:text-white">Mutual Funds:</strong>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                <li><strong>Pure Funds:</strong> Large Cap / Mid Cap / Small Cap funds map 100% to their tier.</li>
                <li><strong>Flexi &amp; Multi Cap:</strong> Standard SEBI portfolio split (65% Large, 25% Mid, 10% Small).</li>
                <li><strong>Hybrid / Balanced:</strong> 65% equity component mapped across tiers.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Visual Multi-Segment Bar */}
      <div className="space-y-2 mb-6">
        <div className="h-4 w-full bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-neutral-200/50 dark:border-white/5">
          {largeWidth > 0 && (
            <button
              type="button"
              onClick={() => setActiveCapDetail((prev) => (prev === "large" ? null : "large"))}
              style={{ width: `${largeWidth}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-l-full transition-all duration-300 hover:opacity-90 cursor-pointer"
              title={`Large Cap: ${large_cap.percentage}% (Click to see holdings)`}
            />
          )}
          {midWidth > 0 && (
            <button
              type="button"
              onClick={() => setActiveCapDetail((prev) => (prev === "mid" ? null : "mid"))}
              style={{ width: `${midWidth}%` }}
              className={`h-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-300 hover:opacity-90 cursor-pointer ${
                largeWidth === 0 ? "rounded-l-full" : ""
              } ${smallWidth === 0 ? "rounded-r-full" : ""}`}
              title={`Mid Cap: ${mid_cap.percentage}% (Click to see holdings)`}
            />
          )}
          {smallWidth > 0 && (
            <button
              type="button"
              onClick={() => setActiveCapDetail((prev) => (prev === "small" ? null : "small"))}
              style={{ width: `${smallWidth}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-r-full transition-all duration-300 hover:opacity-90 cursor-pointer"
              title={`Small Cap: ${small_cap.percentage}% (Click to see holdings)`}
            />
          )}
        </div>

        {/* Legend strip */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1">
          <button
            type="button"
            onClick={() => setActiveCapDetail((prev) => (prev === "large" ? null : "large"))}
            className={`flex items-center gap-1.5 hover:underline cursor-pointer ${
              activeCapDetail === "large" ? "font-bold text-blue-600 dark:text-blue-400" : ""
            }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Large Cap</span>
            <span className="tabular-nums">({large_cap.percentage}%)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCapDetail((prev) => (prev === "mid" ? null : "mid"))}
            className={`flex items-center gap-1.5 hover:underline cursor-pointer ${
              activeCapDetail === "mid" ? "font-bold text-purple-600 dark:text-purple-400" : ""
            }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>Mid Cap</span>
            <span className="tabular-nums">({mid_cap.percentage}%)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCapDetail((prev) => (prev === "small" ? null : "small"))}
            className={`flex items-center gap-1.5 hover:underline cursor-pointer ${
              activeCapDetail === "small" ? "font-bold text-emerald-600 dark:text-emerald-400" : ""
            }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Small Cap</span>
            <span className="tabular-nums">({small_cap.percentage}%)</span>
          </button>
        </div>
      </div>

      {/* 3 Detail Cards (Clickable to inspect individual funds and stocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Large Cap */}
        <button
          type="button"
          onClick={() => setActiveCapDetail((prev) => (prev === "large" ? null : "large"))}
          className={`p-3.5 sm:p-4 rounded-xl text-left transition-all cursor-pointer ${
            activeCapDetail === "large"
              ? "ring-2 ring-blue-500 bg-blue-100/60 dark:bg-blue-500/15"
              : "bg-blue-50/60 dark:bg-blue-500/[0.04] hover:bg-blue-100/40"
          } border border-blue-100 dark:border-blue-500/10 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2 w-full">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Large Cap
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-md">
              Top 100
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1 w-full">
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              <PrivacyMask>₹{Math.round(large_cap.value).toLocaleString("en-IN")}</PrivacyMask>
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {large_cap.percentage}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 pt-2 border-t border-blue-200/40 dark:border-blue-500/10 w-full">
            <span>{large_cap.items?.length || 0} holdings</span>
            <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold">
              {activeCapDetail === "large" ? "Hide" : "View"}
              <ChevronDown size={12} className={activeCapDetail === "large" ? "rotate-180" : ""} />
            </span>
          </div>
        </button>

        {/* Mid Cap */}
        <button
          type="button"
          onClick={() => setActiveCapDetail((prev) => (prev === "mid" ? null : "mid"))}
          className={`p-3.5 sm:p-4 rounded-xl text-left transition-all cursor-pointer ${
            activeCapDetail === "mid"
              ? "ring-2 ring-purple-500 bg-purple-100/60 dark:bg-purple-500/15"
              : "bg-purple-50/60 dark:bg-purple-500/[0.04] hover:bg-purple-100/40"
          } border border-purple-100 dark:border-purple-500/10 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2 w-full">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Mid Cap
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-md">
              101 - 250
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1 w-full">
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              <PrivacyMask>₹{Math.round(mid_cap.value).toLocaleString("en-IN")}</PrivacyMask>
            </div>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums">
              {mid_cap.percentage}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 pt-2 border-t border-purple-200/40 dark:border-purple-500/10 w-full">
            <span>{mid_cap.items?.length || 0} holdings</span>
            <span className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-semibold">
              {activeCapDetail === "mid" ? "Hide" : "View"}
              <ChevronDown size={12} className={activeCapDetail === "mid" ? "rotate-180" : ""} />
            </span>
          </div>
        </button>

        {/* Small Cap */}
        <button
          type="button"
          onClick={() => setActiveCapDetail((prev) => (prev === "small" ? null : "small"))}
          className={`p-3.5 sm:p-4 rounded-xl text-left transition-all cursor-pointer ${
            activeCapDetail === "small"
              ? "ring-2 ring-emerald-500 bg-emerald-100/60 dark:bg-emerald-500/15"
              : "bg-emerald-50/60 dark:bg-emerald-500/[0.04] hover:bg-emerald-100/40"
          } border border-emerald-100 dark:border-emerald-500/10 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2 w-full">
            <div className="flex items-center gap-1.5">
              <Zap size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Small Cap
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md">
              251+
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1 w-full">
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              <PrivacyMask>₹{Math.round(small_cap.value).toLocaleString("en-IN")}</PrivacyMask>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {small_cap.percentage}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 pt-2 border-t border-emerald-200/40 dark:border-emerald-500/10 w-full">
            <span>{small_cap.items?.length || 0} holdings</span>
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              {activeCapDetail === "small" ? "Hide" : "View"}
              <ChevronDown size={12} className={activeCapDetail === "small" ? "rotate-180" : ""} />
            </span>
          </div>
        </button>
      </div>

      {/* ── EXPANDED HOLDINGS DRILLDOWN ── */}
      {activeCapDetail && (
        <div className="mt-4 pt-4 border-t border-neutral-200/70 dark:border-white/5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>{currentTitle}</span>
              <span className="text-neutral-400 font-normal">({currentItems.length})</span>
            </h4>
            <button
              onClick={() => setActiveCapDetail(null)}
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
              Close
            </button>
          </div>

          {currentItems.length === 0 ? (
            <p className="text-xs text-neutral-400 py-3 text-center">No holdings in this tier.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {currentItems.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        item.type === "STOCK"
                          ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                          : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      }`}>
                      {item.type === "STOCK" ? "Stock" : "MF"}
                    </span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {item.name}
                    </span>
                    {item.ratio < 100 && (
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        ({item.ratio}% allocated)
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                      <PrivacyMask>₹{Math.round(item.allocated_value).toLocaleString("en-IN")}</PrivacyMask>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
