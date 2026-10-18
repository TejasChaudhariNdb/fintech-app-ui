"use client";

import React, { useState } from "react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";
import { ChevronDown, TrendingUp, TrendingDown, Users, ArrowDownUp } from "lucide-react";

interface ProfileBreakdown {
  id: number;
  name: string;
  relation: string;
  color: string;
  is_default: boolean;
  mutual_fund_value: number;
  stock_value: number;
  total_value: number;
  mf_invested?: number;
  stock_invested?: number;
  total_invested?: number;
  mf_gain?: number;
  stock_gain?: number;
  total_gain?: number;
  return_pct?: number;
  day_change?: number;
  day_change_pct?: number;
  mf_day_change?: number;
  mf_day_change_pct?: number;
  stock_day_change?: number;
  stock_day_change_pct?: number;
  xirr?: number;
  lifetime_xirr?: number;
  mf_xirr?: number;
  mf_lifetime_xirr?: number;
  stock_xirr?: number;
  stock_lifetime_xirr?: number;
}

interface FamilyPortfolioSummaryProps {
  invested: number;
  current: number;
  profit: number;
  returnPct: number;
  dayChange?: number;
  dayChangePct?: number;
  mfDayChange?: number;
  mfDayChangePct?: number;
  stockDayChange?: number;
  stockDayChangePct?: number;
  mfProfit?: number;
  stockProfit?: number;
  mfInvested?: number;
  stockInvested?: number;
  mfCurrent?: number;
  stockCurrent?: number;
  profileBreakdown?: ProfileBreakdown[];
}

function fmt(n: number | undefined | null, decimals = 0): string {
  const v = Number(n);
  if (!isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function fmtPct(n: number | undefined | null): string {
  const v = Number(n);
  if (!isFinite(v)) return "0.00";
  return Math.abs(v).toFixed(2);
}

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; gradient: string; bar: string }> = {
  blue:   { border: "border-blue-500/20",   bg: "bg-blue-500/5 dark:bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   gradient: "from-blue-500 to-indigo-500",   bar: "bg-blue-500" },
  purple: { border: "border-purple-500/20", bg: "bg-purple-500/5 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", gradient: "from-purple-500 to-fuchsia-500", bar: "bg-purple-500" },
  green:  { border: "border-emerald-500/20",bg: "bg-emerald-500/5 dark:bg-emerald-500/10",text: "text-emerald-600 dark:text-emerald-400",gradient: "from-emerald-500 to-teal-500",  bar: "bg-emerald-500" },
  orange: { border: "border-orange-500/20", bg: "bg-orange-500/5 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-500 to-amber-500",  bar: "bg-orange-500" },
  yellow: { border: "border-amber-500/20",  bg: "bg-amber-500/5 dark:bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400",  gradient: "from-amber-400 to-yellow-500", bar: "bg-amber-500" },
  indigo: { border: "border-indigo-500/20", bg: "bg-indigo-500/5 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", gradient: "from-indigo-500 to-violet-500", bar: "bg-indigo-500" },
};

function ProfileCard({ p, totalFamilyValue }: { p: ProfileBreakdown; totalFamilyValue: number }) {
  const [expanded, setExpanded] = useState(false);
  const [headerXirrMode, setHeaderXirrMode] = useState<"xirr" | "lifetime">("xirr");
  const [mfMetricMode, setMfMetricMode] = useState<"xirr" | "lifetime" | "absolute">("xirr");
  const [stockMetricMode, setStockMetricMode] = useState<"xirr" | "lifetime" | "absolute">("xirr");

  const colors = COLOR_MAP[p.color] || COLOR_MAP.indigo;

  const totalValue    = Number(p.total_value)    || 0;
  const totalInvested = Number(p.total_invested) || 0;
  const totalGain     = Number(p.total_gain)     || (totalValue - totalInvested);
  const returnPct     = isFinite(Number(p.return_pct)) ? Number(p.return_pct) : (totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0);
  const mfValue       = Number(p.mutual_fund_value) || 0;
  const stockValue    = Number(p.stock_value)    || 0;
  const mfInvested    = Number(p.mf_invested)    || 0;
  const stockInvested = Number(p.stock_invested) || 0;
  const mfGain        = isFinite(Number(p.mf_gain))    ? Number(p.mf_gain)    : (mfValue - mfInvested);
  const stockGain     = isFinite(Number(p.stock_gain)) ? Number(p.stock_gain) : (stockValue - stockInvested);
  const mfReturnPct   = mfInvested > 0 ? (mfGain / mfInvested) * 100 : 0;
  const stockReturnPct = stockInvested > 0 ? (stockGain / stockInvested) * 100 : 0;

  const dayChangePctToDisplay = p.day_change_pct !== undefined ? p.day_change_pct : returnPct;
  const isHeaderDayPositive = dayChangePctToDisplay >= 0;

  const profileXirrVal =
    headerXirrMode === "lifetime"
      ? ((p.lifetime_xirr ?? p.xirr) !== undefined
          ? (p.lifetime_xirr ?? p.xirr)!.toFixed(2)
          : (returnPct > 0 ? returnPct.toFixed(2) : "0.00"))
      : (p.xirr !== undefined ? p.xirr.toFixed(2) : (returnPct > 0 ? returnPct.toFixed(2) : "0.00"));

  const mfXirrVal = p.mf_xirr !== undefined ? p.mf_xirr.toFixed(2) : (mfReturnPct > 0 ? mfReturnPct.toFixed(2) : "0.00");
  const mfLifetimeXirrVal = p.mf_lifetime_xirr !== undefined ? p.mf_lifetime_xirr.toFixed(2) : mfXirrVal;

  const stockXirrVal = p.stock_xirr !== undefined ? p.stock_xirr.toFixed(2) : (stockReturnPct > 0 ? stockReturnPct.toFixed(2) : "0.00");
  const stockLifetimeXirrVal = p.stock_lifetime_xirr !== undefined ? p.stock_lifetime_xirr.toFixed(2) : stockXirrVal;

  const isGain = totalGain >= 0;
  const sharePercent = totalFamilyValue > 0 ? Math.round((totalValue / totalFamilyValue) * 100) : 0;
  const initials = (p.name || "?").charAt(0).toUpperCase();

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden transition-all duration-200`}>

      {/* ── Collapsed Header ──
          Mobile : 2 rows (row1 = avatar+name+value+chevron, row2 = bar+%+return%)
          Desktop: 1 row  (avatar | name+badge | bar+% | value+return% | chevron)
      */}
      {/* ── Collapsed Header ──
          Mobile : 2 clean rows with dedicated badges
          Desktop: 1 spacious row with aligned columns
      */}
      <button className="w-full text-left p-3.5 sm:p-5 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>

        {/* === MOBILE LAYOUT (hidden on sm+) === */}
        <div className="sm:hidden space-y-2.5">
          {/* Row 1: Avatar, Name & Relation, Net Worth & Chevron */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${colors.gradient} shadow-xs shrink-0`}>
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-neutral-900 dark:text-white text-base leading-tight truncate">{p.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider border ${colors.text} ${colors.border} bg-white/60 dark:bg-black/30`}>
                    {p.relation}
                  </span>
                  {p.is_default && <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">Default</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <PrivacyMask>
                <p className="text-base font-extrabold text-neutral-900 dark:text-white tabular-nums">₹{fmt(totalValue)}</p>
              </PrivacyMask>
              <div className={`p-1 rounded-full transition-colors ${expanded ? "bg-neutral-200/60 dark:bg-white/10" : "bg-transparent"}`}>
                <ChevronDown size={15} className={`text-neutral-400 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </div>

          {/* Row 2: Progress & Share on Left, 1D Return & XIRR Chip on Right */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-200/40 dark:border-white/5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-16 h-1.5 bg-neutral-200/70 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${sharePercent}%` }} />
              </div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">{sharePercent}% of family</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* 1D Return badge */}
              <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                isHeaderDayPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-500 dark:text-red-400"
              }`}>
                <span>{isHeaderDayPositive ? "▲" : "▼"}</span>
                <span>{fmtPct(dayChangePctToDisplay)}%</span>
                <span className="opacity-60 text-[9px]">1D</span>
              </div>

              {/* XIRR Toggle Chip */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHeaderXirrMode(m => m === "xirr" ? "lifetime" : "xirr");
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 active:scale-95 text-[10px] font-medium text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-white/10 shadow-2xs transition-all cursor-pointer select-none group/chip"
                title="Tap to toggle between XIRR and Lifetime XIRR">
                <ArrowDownUp size={9} className="text-primary-500 shrink-0 group-hover/chip:rotate-180 transition-transform duration-200" />
                <span className="text-[9px] text-neutral-400">{headerXirrMode === "xirr" ? "XIRR" : "Lifetime"}:</span>
                <span className="font-bold tabular-nums">{profileXirrVal}%</span>
              </button>
            </div>
          </div>
        </div>

        {/* === DESKTOP LAYOUT (hidden on mobile) === */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold text-white bg-gradient-to-br ${colors.gradient} shadow-sm shrink-0`}>
            {initials}
          </div>

          {/* Name + badge */}
          <div className="w-44 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-neutral-900 dark:text-white text-base truncate">{p.name}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider border ${colors.text} ${colors.border} bg-white/50 dark:bg-black/20`}>
                {p.relation}
              </span>
              {p.is_default && <span className="text-xs text-neutral-400 dark:text-neutral-500">Default</span>}
            </div>
          </div>

          {/* Progress bar + % of family */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-28 h-1.5 bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
              <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${sharePercent}%` }} />
            </div>
            <span className="text-sm text-neutral-400 dark:text-neutral-500 font-medium whitespace-nowrap">{sharePercent}% of family</span>
          </div>

          {/* Value + 1D Return % + XIRR Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <PrivacyMask>
                <p className="text-lg font-bold text-neutral-900 dark:text-white leading-tight tabular-nums">₹{fmt(totalValue)}</p>
              </PrivacyMask>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`text-xs font-semibold ${isHeaderDayPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {isHeaderDayPositive ? "▲" : "▼"} {fmtPct(dayChangePctToDisplay)}%
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">(1D Returns)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHeaderXirrMode(m => m === "xirr" ? "lifetime" : "xirr");
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 active:scale-95 text-xs font-medium text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/10 shadow-2xs transition-all cursor-pointer select-none group/chip"
              title="Tap to toggle between XIRR and Lifetime XIRR">
              <ArrowDownUp size={11} className="text-primary-500 group-hover/chip:rotate-180 transition-transform duration-200" />
              <span className="text-neutral-400 text-[11px]">{headerXirrMode === "xirr" ? "XIRR" : "Lifetime"}:</span>
              <span className="font-bold tabular-nums text-neutral-900 dark:text-white">{profileXirrVal}%</span>
            </button>
          </div>

          <ChevronDown size={18} className={`text-neutral-400 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="h-px bg-neutral-200/60 dark:bg-white/10 mb-3.5" />

          {/* MF + Stocks side by side */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {/* Mutual Funds */}
            <div className="bg-white/80 dark:bg-black/25 rounded-xl p-3 sm:p-4 border border-neutral-200/60 dark:border-white/5 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] sm:text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Mutual Funds</span>
                </div>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 dark:text-neutral-500">Current</span>
                    <PrivacyMask>
                      <span className="font-bold text-neutral-900 dark:text-white tabular-nums">₹{fmt(mfValue)}</span>
                    </PrivacyMask>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 dark:text-neutral-500">Invested</span>
                    <PrivacyMask blurStrength="sm">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">₹{fmt(mfInvested)}</span>
                    </PrivacyMask>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100 dark:border-white/5">
                    <span className="text-neutral-400 dark:text-neutral-500 font-medium">Returns</span>
                    <PrivacyMask>
                      <span className={`font-bold tabular-nums ${mfGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {mfGain >= 0 ? "+" : ""}₹{fmt(mfGain)}
                      </span>
                    </PrivacyMask>
                  </div>
                </div>
              </div>

              {/* XIRR / Lifetime XIRR / Absolute Returns Toggle */}
              <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMfMetricMode((prev) => {
                      if (prev === "xirr") return "lifetime";
                      if (prev === "lifetime") return "absolute";
                      return "xirr";
                    });
                  }}
                  className="w-full inline-flex items-center justify-between px-2 py-1 rounded-md bg-neutral-100/80 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 active:scale-98 text-[10px] font-medium text-neutral-700 dark:text-neutral-200 transition-all border border-neutral-200/60 dark:border-white/10 shadow-xs cursor-pointer select-none group/subbtn"
                  title="Tap to toggle between XIRR, Lifetime XIRR, and Absolute Returns">
                  <span className="flex items-center gap-1 truncate text-neutral-500 dark:text-neutral-400">
                    <ArrowDownUp size={10} className="text-emerald-500 shrink-0 group-hover/subbtn:rotate-180 transition-transform duration-200" />
                    <span>{mfMetricMode === "xirr" ? "XIRR" : mfMetricMode === "lifetime" ? "Lifetime" : "Returns"}</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                    {mfMetricMode === "xirr" && `${mfXirrVal}%`}
                    {mfMetricMode === "lifetime" && `${mfLifetimeXirrVal}%`}
                    {mfMetricMode === "absolute" && `${fmtPct(mfReturnPct)}%`}
                  </span>
                </button>
              </div>
            </div>

            {/* Stocks */}
            <div className="bg-white/80 dark:bg-black/25 rounded-xl p-3 sm:p-4 border border-neutral-200/60 dark:border-white/5 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[11px] sm:text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Stocks</span>
                </div>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 dark:text-neutral-500">Current</span>
                    <PrivacyMask>
                      <span className="font-bold text-neutral-900 dark:text-white tabular-nums">₹{fmt(stockValue)}</span>
                    </PrivacyMask>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 dark:text-neutral-500">Invested</span>
                    <PrivacyMask blurStrength="sm">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">₹{fmt(stockInvested)}</span>
                    </PrivacyMask>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100 dark:border-white/5">
                    <span className="text-neutral-400 dark:text-neutral-500 font-medium">Returns</span>
                    <PrivacyMask>
                      <span className={`font-bold tabular-nums ${stockGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {stockGain >= 0 ? "+" : ""}₹{fmt(stockGain)}
                      </span>
                    </PrivacyMask>
                  </div>
                </div>
              </div>

              {/* XIRR / Lifetime XIRR / Absolute Returns Toggle */}
              <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStockMetricMode((prev) => {
                      if (prev === "xirr") return "lifetime";
                      if (prev === "lifetime") return "absolute";
                      return "xirr";
                    });
                  }}
                  className="w-full inline-flex items-center justify-between px-2 py-1 rounded-md bg-neutral-100/80 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 active:scale-98 text-[10px] font-medium text-neutral-700 dark:text-neutral-200 transition-all border border-neutral-200/60 dark:border-white/10 shadow-xs cursor-pointer select-none group/subbtn"
                  title="Tap to toggle between XIRR, Lifetime XIRR, and Absolute Returns">
                  <span className="flex items-center gap-1 truncate text-neutral-500 dark:text-neutral-400">
                    <ArrowDownUp size={10} className="text-blue-500 shrink-0 group-hover/subbtn:rotate-180 transition-transform duration-200" />
                    <span>{stockMetricMode === "xirr" ? "XIRR" : stockMetricMode === "lifetime" ? "Lifetime" : "Returns"}</span>
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                    {stockMetricMode === "xirr" && `${stockXirrVal}%`}
                    {stockMetricMode === "lifetime" && `${stockLifetimeXirrVal}%`}
                    {stockMetricMode === "absolute" && `${fmtPct(stockReturnPct)}%`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Overall Gain/Loss bar */}
          <div className={`mt-3 flex items-center justify-between px-4 py-3 rounded-xl border ${
            isGain
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
              : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
          }`}>
            <div className="flex items-center gap-2">
              {isGain
                ? <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
                : <TrendingDown size={15} className="text-red-500 dark:text-red-400" />
              }
              <span className={`text-sm sm:text-base font-semibold ${isGain ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                Overall {isGain ? "Gain" : "Loss"}
              </span>
            </div>
            <PrivacyMask>
              <span className={`text-sm sm:text-base font-bold ${isGain ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {isGain ? "+" : ""}₹{fmt(totalGain)}{" "}
                <span className="text-xs sm:text-sm font-medium opacity-80">
                  ({isGain ? "+" : ""}{fmtPct(returnPct)}%)
                </span>
              </span>
            </PrivacyMask>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyPortfolioSummary({
  invested,
  current,
  profit,
  returnPct,
  dayChange = 0,
  dayChangePct = 0,
  mfProfit = 0,
  stockProfit = 0,
  mfInvested = 0,
  stockInvested = 0,
  mfCurrent,
  stockCurrent,
  mfDayChange,
  mfDayChangePct,
  stockDayChange,
  stockDayChangePct,
  profileBreakdown = [],
}: FamilyPortfolioSummaryProps) {
  const [investedExpanded, setInvestedExpanded] = useState(false);
  const [currentExpanded, setCurrentExpanded] = useState(false);
  const [dayChangeExpanded, setDayChangeExpanded] = useState(false);
  const isGain    = profit >= 0;
  const isDayGain = dayChange >= 0;

  const mfCurrentVal = mfCurrent ?? (mfInvested + mfProfit);
  const stockCurrentVal = stockCurrent ?? (stockInvested + stockProfit);
  const mfReturnPct = mfInvested > 0 ? (mfProfit / mfInvested) * 100 : 0;
  const stockReturnPct = stockInvested > 0 ? (stockProfit / stockInvested) * 100 : 0;

  return (
    <Card className="p-5 sm:p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 sm:mb-6">
        <div className="p-1.5 bg-primary-500/10 rounded-lg">
          <Users size={16} className="text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
          Family Portfolio Summary
        </h3>
      </div>

      {/* ── Summary rows ── */}
      <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">

        {/* Invested — expandable to show MF + Stock split */}
        <div className="flex flex-col">
          <div
            className="flex justify-between items-center cursor-pointer select-none group"
            onClick={() => setInvestedExpanded(!investedExpanded)}
          >
            <span className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
              Total Invested
              <div className="p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors">
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${investedExpanded ? "rotate-180 text-primary-600 dark:text-primary-400" : ""}`}
                />
              </div>
            </span>
            <PrivacyMask>
              <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">₹{fmt(invested)}</span>
            </PrivacyMask>
          </div>
          {/* Expanded: MF + Stock invested */}
          {investedExpanded && (
            <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mutual Funds
                </span>
                <PrivacyMask>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">₹{fmt(mfInvested)}</span>
                </PrivacyMask>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Stocks
                </span>
                <PrivacyMask>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">₹{fmt(stockInvested)}</span>
                </PrivacyMask>
              </div>
            </div>
          )}
        </div>

        {/* Current Value — expandable to show MF + Stock split */}
        <div className="flex flex-col">
          <div
            className="flex justify-between items-center cursor-pointer select-none group"
            onClick={() => setCurrentExpanded(!currentExpanded)}
          >
            <span className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
              Current Value
              <div className="p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors">
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${currentExpanded ? "rotate-180 text-primary-600 dark:text-primary-400" : ""}`}
                />
              </div>
            </span>
            <PrivacyMask>
              <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">₹{fmt(current)}</span>
            </PrivacyMask>
          </div>
          {/* Expanded: MF + Stock current value */}
          {currentExpanded && (
            <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mutual Funds
                </span>
                <PrivacyMask>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">₹{fmt(mfCurrentVal)}</span>
                </PrivacyMask>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Stocks
                </span>
                <PrivacyMask>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">₹{fmt(stockCurrentVal)}</span>
                </PrivacyMask>
              </div>
            </div>
          )}
        </div>

        {/* Day's Change - Expandable */}
        <div className="flex flex-col">
          <div
            className="flex justify-between items-center cursor-pointer select-none group"
            onClick={() => setDayChangeExpanded(!dayChangeExpanded)}
          >
            <span className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
              Day&apos;s Change
              <div className="p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors">
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${dayChangeExpanded ? "rotate-180 text-primary-600 dark:text-primary-400" : ""}`}
                />
              </div>
            </span>
            <div className="flex items-baseline gap-1.5">
              <PrivacyMask>
                <span className={`text-sm sm:text-base font-semibold ${isDayGain ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {isDayGain ? "+" : ""}₹{fmt(Math.abs(dayChange))}
                </span>
              </PrivacyMask>
              <span className={`text-xs sm:text-sm ${isDayGain ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}>
                ({isDayGain ? "+" : ""}{fmtPct(dayChangePct)}%)
              </span>
            </div>
          </div>

          {/* Expanded Breakdown */}
          {dayChangeExpanded && (
            <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mutual Funds
                </span>
                <div className="flex items-baseline gap-1.5">
                  <PrivacyMask>
                    <span className={`font-medium ${(mfDayChange ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {(mfDayChange ?? 0) >= 0 ? "+" : ""}₹{fmt(Math.abs(mfDayChange ?? 0))}
                    </span>
                  </PrivacyMask>
                  {mfDayChangePct !== undefined && (
                    <span className={`text-xs ${(mfDayChangePct ?? 0) >= 0 ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}>
                      ({(mfDayChangePct ?? 0) >= 0 ? "+" : ""}{fmtPct(mfDayChangePct)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Stocks
                </span>
                <div className="flex items-baseline gap-1.5">
                  <PrivacyMask>
                    <span className={`font-medium ${(stockDayChange ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {(stockDayChange ?? 0) >= 0 ? "+" : ""}₹{fmt(Math.abs(stockDayChange ?? 0))}
                    </span>
                  </PrivacyMask>
                  {stockDayChangePct !== undefined && (
                    <span className={`text-xs ${(stockDayChangePct ?? 0) >= 0 ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}>
                      ({(stockDayChangePct ?? 0) >= 0 ? "+" : ""}{fmtPct(stockDayChangePct)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-100 dark:bg-white/5" />

        {/* Total Gains / (Absolute Returns) highlight box */}
        <div className="bg-neutral-50 dark:bg-white/5 rounded-xl p-3 sm:p-4 -mx-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white px-1">
              Total Gains (Returns)
            </span>
            <div className="text-right px-1">
              <PrivacyMask>
                <span className={`text-lg sm:text-xl font-bold ${isGain ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {isGain ? "+" : ""}₹{fmt(Math.abs(profit))}
                </span>
              </PrivacyMask>
              <span className={`text-xs sm:text-sm font-medium ml-1.5 ${isGain ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}>
                ({isGain ? "+" : ""}{fmtPct(returnPct)}%)
              </span>
            </div>
          </div>

          {/* Two-row breakdown: Mutual Funds in one row, Stocks in row below */}
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-white/10 px-1 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Mutual Funds
              </span>
              <div className="flex items-baseline gap-1.5">
                <PrivacyMask blurStrength="sm">
                  <span className={`font-semibold ${mfProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {mfProfit >= 0 ? "▲ +" : "▼ -"}₹{fmt(Math.abs(mfProfit))}
                  </span>
                </PrivacyMask>
                <span className={`text-xs ${mfProfit >= 0 ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}>
                  ({mfProfit >= 0 ? "+" : ""}{fmtPct(mfReturnPct)}%)
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Stocks
              </span>
              <div className="flex items-baseline gap-1.5">
                <PrivacyMask blurStrength="sm">
                  <span className={`font-semibold ${stockProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {stockProfit >= 0 ? "▲ +" : "▼ -"}₹{fmt(Math.abs(stockProfit))}
                  </span>
                </PrivacyMask>
                <span className={`text-xs ${stockProfit >= 0 ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}>
                  ({stockProfit >= 0 ? "+" : ""}{fmtPct(stockReturnPct)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Per-Profile Section ── */}
      {profileBreakdown.length > 0 && (
        <>
          <div className="h-px bg-neutral-100 dark:bg-white/5 mb-4" />
          <p className="text-[10px] sm:text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3">
            By Family Member · tap to expand
          </p>
          <div className="space-y-2.5 sm:space-y-3">
            {profileBreakdown.map((p) => (
              <ProfileCard key={p.id} p={p} totalFamilyValue={current} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
