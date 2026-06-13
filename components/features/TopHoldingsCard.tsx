"use client";

import React, { useState } from "react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface Holding {
  id: string;
  type: "MF" | "STOCK";
  name: string;
  symbol?: string;
  current_value: number;
  invested: number;
  gain: number;
  return_pct: number;
  units?: number;
  nav?: number;
  quantity?: number;
  avg_price?: number;
  current_price?: number;
  profile_id: number;
  profile_name: string;
  profile_color: string;
  profile_relation: string;
}

interface TopHoldingsCardProps {
  holdings: Holding[];
}

type Filter = "ALL" | "MF" | "STOCK";

const PROFILE_COLOR_DOT: Record<string, string> = {
  blue:   "bg-blue-500",
  purple: "bg-purple-500",
  green:  "bg-emerald-500",
  orange: "bg-orange-500",
  yellow: "bg-amber-500",
  indigo: "bg-indigo-500",
};

const PROFILE_COLOR_TEXT: Record<string, string> = {
  blue:   "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/8",
  purple: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/8",
  green:  "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/8",
  orange: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/8",
  yellow: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/8",
  indigo: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/8",
};

function fmt(n: number | undefined | null, decimals = 0): string {
  const v = Number(n);
  if (!isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function HoldingRow({ h, totalValue }: { h: Holding; totalValue: number }) {
  const isGain = h.gain >= 0;
  const dotColor = PROFILE_COLOR_DOT[h.profile_color] || PROFILE_COLOR_DOT.indigo;
  const profileTextColor = PROFILE_COLOR_TEXT[h.profile_color] || PROFILE_COLOR_TEXT.indigo;
  const sharePercent = totalValue > 0 ? (h.current_value / totalValue) * 100 : 0;

  return (
    <div className="group flex items-center justify-between gap-3 py-3 sm:py-3.5 border-b border-neutral-100 dark:border-white/5 last:border-0 hover:bg-neutral-50/50 dark:hover:bg-white/2 transition-colors rounded-lg px-1">
      {/* Left side: Type pill + Name and details */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        {/* Type pill */}
        <div className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
          h.type === "MF"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
        }`}>
          {h.type}
        </div>

        {/* Name + profile badge */}
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-[15px] font-semibold text-neutral-900 dark:text-white leading-snug truncate">
            {h.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {/* Share bar - hidden on small mobile to avoid layout crowding */}
            <div className="hidden sm:block w-16 sm:w-20 h-1 bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${dotColor}`}
                style={{ width: `${Math.min(sharePercent, 100)}%` }}
              />
            </div>
            {/* Profile badge */}
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none ${profileTextColor}`}>
              {h.profile_name}
            </span>
            {h.type === "STOCK" && h.quantity && (
              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">
                {h.quantity} qty
              </span>
            )}
            {h.type === "MF" && h.units && (
              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">
                {h.units.toFixed(2)} units
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Value and gain/loss */}
      <div className="text-right shrink-0 min-w-[75px]">
        <PrivacyMask>
          <p className="text-sm sm:text-[15px] font-bold text-neutral-900 dark:text-white">
            ₹{fmt(h.current_value)}
          </p>
        </PrivacyMask>
        <div className={`flex items-center justify-end gap-0.5 text-[11px] sm:text-xs font-semibold mt-0.5 ${
          isGain ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
        }`}>
          {isGain
            ? <TrendingUp size={10} className="shrink-0" />
            : <TrendingDown size={10} className="shrink-0" />
          }
          <PrivacyMask>
            <span>{isGain ? "+" : ""}{Number(h.return_pct).toFixed(2)}%</span>
          </PrivacyMask>
        </div>
      </div>
    </div>
  );
}

export default function TopHoldingsCard({ holdings }: TopHoldingsCardProps) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = filter === "ALL"
    ? holdings
    : holdings.filter((h) => h.type === filter);

  const totalValue = filtered.reduce((s, h) => s + h.current_value, 0);

  const mfCount    = holdings.filter((h) => h.type === "MF").length;
  const stockCount = holdings.filter((h) => h.type === "STOCK").length;

  if (!holdings || holdings.length === 0) return null;

  const TABS: { label: string; value: Filter; count: number }[] = [
    { label: "All",    value: "ALL",   count: holdings.length },
    { label: "Funds",  value: "MF",    count: mfCount },
    { label: "Stocks", value: "STOCK", count: stockCount },
  ];

  return (
    <Card className="p-4 sm:p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-500/10 rounded-lg shrink-0">
            <BarChart2 size={16} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-tight">
              Top Holdings
            </h3>
            <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Largest investments across all family members
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center bg-neutral-100 dark:bg-white/5 rounded-lg p-0.5 self-start sm:self-auto overflow-x-auto max-w-full">
          {TABS.map((tab) => (
            tab.count > 0 && (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === tab.value
                    ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                {tab.label}
                <span className={`ml-1 text-[9px] ${filter === tab.value ? "text-primary-600 dark:text-primary-400" : "text-neutral-400"}`}>
                  {tab.count}
                </span>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Holdings list */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-6">
            No holdings found
          </p>
        ) : (
          filtered.map((h) => (
            <HoldingRow key={h.id} h={h} totalValue={totalValue} />
          ))
        )}
      </div>

      {/* Footer summary */}
      {filtered.length > 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between text-xs sm:text-sm text-neutral-400 dark:text-neutral-500">
          <span>Showing top {filtered.length} holdings</span>
          <PrivacyMask>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              Total: ₹{fmt(totalValue)}
            </span>
          </PrivacyMask>
        </div>
      )}
    </Card>
  );
}
