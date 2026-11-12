"use client";

import React, { useState } from "react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";
import { ChevronDown } from "lucide-react";
import { NetWorthAssetPreferences } from "@/lib/assetPreferences";

interface PortfolioSummaryProps {
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
  xirr?: number | null;
  mfXirr?: number | null;
  stockXirr?: number | null;
  mfProfit?: number;
  stockProfit?: number;
  fiProfit?: number;
  goldProfit?: number;
  reProfit?: number;
  mfInvested?: number;
  stockInvested?: number;
  fiInvested?: number;
  goldInvested?: number;
  reInvested?: number;
  mfCurrent?: number;
  stockCurrent?: number;
  fiCurrent?: number;
  goldCurrent?: number;
  reCurrent?: number;
  assetPrefs?: NetWorthAssetPreferences;
}

export default function PortfolioSummary({
  invested,
  current,
  profit,
  returnPct,
  dayChange = 0,
  dayChangePct = 0,
  mfDayChange,
  mfDayChangePct,
  stockDayChange,
  stockDayChangePct,
  xirr,
  mfXirr = 0,
  stockXirr = 0,
  mfProfit,
  stockProfit,
  fiProfit,
  goldProfit,
  reProfit,
  mfInvested = 0,
  stockInvested = 0,
  fiInvested = 0,
  goldInvested = 0,
  reInvested = 0,
  mfCurrent,
  stockCurrent,
  fiCurrent,
  goldCurrent,
  reCurrent,
  assetPrefs,
}: PortfolioSummaryProps) {
  const isPositive = profit >= 0;
  const isDayPositive = dayChange >= 0;
  const [isInvestedExpanded, setIsInvestedExpanded] = useState(false);
  const [isCurrentExpanded, setIsCurrentExpanded] = useState(false);
  const [isDayChangeExpanded, setIsDayChangeExpanded] = useState(false);
  const [isXirrExpanded, setIsXirrExpanded] = useState(false);

  const showMf = assetPrefs?.mutual_funds ?? true;
  const showStock = assetPrefs?.stocks ?? true;
  const showFi = assetPrefs?.fixed_income ?? true;
  const showGold = assetPrefs?.gold ?? true;
  const showRe = assetPrefs?.real_estate ?? true;

  const mfCurrentVal = mfCurrent ?? (mfInvested + (mfProfit || 0));
  const stockCurrentVal = stockCurrent ?? (stockInvested + (stockProfit || 0));
  const fiCurrentVal = fiCurrent ?? (fiInvested + (fiProfit || 0));
  const goldCurrentVal = goldCurrent ?? (goldInvested + (goldProfit || 0));
  const reCurrentVal = reCurrent ?? (reInvested + (reProfit || 0));

  const mfReturnPct = mfInvested > 0 && mfProfit !== undefined ? (mfProfit / mfInvested) * 100 : 0;
  const stockReturnPct = stockInvested > 0 && stockProfit !== undefined ? (stockProfit / stockInvested) * 100 : 0;
  const fiReturnPct = fiInvested > 0 && fiProfit !== undefined ? (fiProfit / fiInvested) * 100 : 0;
  const goldReturnPct = goldInvested > 0 && goldProfit !== undefined ? (goldProfit / goldInvested) * 100 : 0;
  const reReturnPct = reInvested > 0 && reProfit !== undefined ? (reProfit / reInvested) * 100 : 0;

  const hasMf = mfInvested > 0 || mfCurrentVal > 0 || (mfProfit !== undefined && mfProfit !== 0);
  const hasStock = stockInvested > 0 || stockCurrentVal > 0 || (stockProfit !== undefined && stockProfit !== 0);
  const hasFi = fiInvested > 0 || fiCurrentVal > 0 || (fiProfit !== undefined && fiProfit !== 0);
  const hasGold = goldInvested > 0 || goldCurrentVal > 0 || (goldProfit !== undefined && goldProfit !== 0);
  const hasRe = reInvested > 0 || reCurrentVal > 0 || (reProfit !== undefined && reProfit !== 0);
  const hasAnyAsset = hasMf || hasStock || hasFi || hasGold || hasRe;

  return (
    <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <h3 className="text-base sm:text-lg font-semibold mb-6 text-neutral-900 dark:text-white">
        Portfolio Summary
      </h3>

      <div className="space-y-4">
        {/* Invested Section - Expandable */}
        <div className="flex flex-col">
          <div
            className="flex justify-between items-center group cursor-pointer select-none"
            onClick={() => setIsInvestedExpanded(!isInvestedExpanded)}>
            <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
              Invested
              <div
                className={`p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors duration-200`}>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    isInvestedExpanded
                      ? "rotate-180 text-primary-600 dark:text-primary-400"
                      : ""
                  }`}
                />
              </div>
            </span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              <PrivacyMask>₹{invested.toLocaleString("en-IN")}</PrivacyMask>
            </span>
          </div>

          {/* Expanded Breakdown */}
          {isInvestedExpanded && (
            <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {showMf && (hasMf || !hasAnyAsset) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Mutual Funds
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{mfInvested.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showStock && (hasStock || !hasAnyAsset) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Stocks
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{stockInvested.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showFi && hasFi && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Fixed Income
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{fiInvested.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showGold && hasGold && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Gold &amp; Bullion
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{goldInvested.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showRe && hasRe && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Real Estate
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{reInvested.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Value - Expandable */}
        <div className="flex flex-col">
          <div
            className="flex justify-between items-center group cursor-pointer select-none"
            onClick={() => setIsCurrentExpanded(!isCurrentExpanded)}>
            <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
              Current Value
              <div
                className={`p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors duration-200`}>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    isCurrentExpanded
                      ? "rotate-180 text-primary-600 dark:text-primary-400"
                      : ""
                  }`}
                />
              </div>
            </span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              <PrivacyMask>₹{current.toLocaleString("en-IN")}</PrivacyMask>
            </span>
          </div>

          {/* Expanded Breakdown */}
          {isCurrentExpanded && (
            <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {showMf && (hasMf || !hasAnyAsset) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Mutual Funds
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{mfCurrentVal.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showStock && (hasStock || !hasAnyAsset) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Stocks
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{stockCurrentVal.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showFi && hasFi && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Fixed Income
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{fiCurrentVal.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showGold && hasGold && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Gold &amp; Bullion
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{goldCurrentVal.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
              {showRe && hasRe && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Real Estate
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    <PrivacyMask>
                      ₹{reCurrentVal.toLocaleString("en-IN")}
                    </PrivacyMask>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Day's Change Section - Expandable */}
        <div className="flex flex-col">
          <div
            className="flex justify-between items-center group cursor-pointer select-none"
            onClick={() => setIsDayChangeExpanded(!isDayChangeExpanded)}>
            <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
              Day&apos;s Change
              <div
                className={`p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors duration-200`}>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    isDayChangeExpanded
                      ? "rotate-180 text-primary-600 dark:text-primary-400"
                      : ""
                  }`}
                />
              </div>
            </span>
            <div className="text-right">
              <PrivacyMask>
                <span
                  className={`font-semibold ${
                    isDayPositive
                      ? "text-emerald-500 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}>
                  {isDayPositive ? "+" : ""}₹
                  {Math.abs(dayChange).toLocaleString("en-IN")}
                </span>
              </PrivacyMask>
              <span
                className={`text-xs ml-1.5 ${
                  isDayPositive
                    ? "text-emerald-600/80 dark:text-emerald-500/80"
                    : "text-red-600/80 dark:text-red-500/80"
                }`}>
                ({isDayPositive ? "+" : ""}{dayChangePct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Expanded Breakdown */}
          {isDayChangeExpanded && (
            <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500">
                  Mutual Funds
                </span>
                <div className="text-right">
                  <PrivacyMask>
                    <span
                      className={`font-medium ${
                        (mfDayChange ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(mfDayChange ?? 0) >= 0 ? "+" : ""}₹
                      {Math.abs(mfDayChange ?? 0).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  {mfDayChangePct !== undefined && (
                    <span
                      className={`text-xs ml-1.5 ${
                        (mfDayChangePct ?? 0) >= 0
                          ? "text-emerald-600/80 dark:text-emerald-500/80"
                          : "text-red-600/80 dark:text-red-500/80"
                      }`}>
                      ({(mfDayChangePct ?? 0) >= 0 ? "+" : ""}{(mfDayChangePct ?? 0).toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400 dark:text-neutral-500">
                  Stocks
                </span>
                <div className="text-right">
                  <PrivacyMask>
                    <span
                      className={`font-medium ${
                        (stockDayChange ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(stockDayChange ?? 0) >= 0 ? "+" : ""}₹
                      {Math.abs(stockDayChange ?? 0).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  {stockDayChangePct !== undefined && (
                    <span
                      className={`text-xs ml-1.5 ${
                        (stockDayChangePct ?? 0) >= 0
                          ? "text-emerald-600/80 dark:text-emerald-500/80"
                          : "text-red-600/80 dark:text-red-500/80"
                      }`}>
                      ({(stockDayChangePct ?? 0) >= 0 ? "+" : ""}{(stockDayChangePct ?? 0).toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* null = cannot be calculated: show "--", not 0% (decision 2, 2026-11-12) */}
        {xirr !== undefined && (
          <div className="flex flex-col">
            <div
              className="flex justify-between items-center group cursor-pointer select-none"
              onClick={() => setIsXirrExpanded(!isXirrExpanded)}>
              <span
                className="text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors cursor-help flex items-center gap-1.5"
                title="Annualized return across your portfolio, including mutual funds and stocks">
                XIRR
                <div
                  className={`p-0.5 rounded-full bg-neutral-100 dark:bg-white/5 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors duration-200`}>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      isXirrExpanded
                        ? "rotate-180 text-primary-600 dark:text-primary-400"
                        : ""
                    }`}
                  />
                </div>
              </span>
              <span
                className={`font-semibold ${
                  xirr === null
                    ? "text-neutral-500"
                    : xirr >= 0
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}>
                {xirr === null ? "--" : `${xirr.toFixed(2)}%`}
              </span>
            </div>

            {isXirrExpanded && (
              <div className="mt-2 ml-1 pl-3 border-l-2 border-neutral-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Mutual Funds
                  </span>
                  <span
                    className={`font-medium ${
                      mfXirr === null
                        ? "text-neutral-500"
                        : mfXirr >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}>
                    {mfXirr === null ? "--" : `${mfXirr.toFixed(2)}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    Stocks
                  </span>
                  <span
                    className={`font-medium ${
                      stockXirr === null
                        ? "text-neutral-500"
                        : stockXirr >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}>
                    {stockXirr === null ? "--" : `${stockXirr.toFixed(2)}%`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-px bg-neutral-100 dark:bg-white/5 my-4" />

        {/* Total Gains (Returns) highlight box */}
        <div className="bg-neutral-50 dark:bg-white/5 rounded-xl p-3 sm:p-4 -mx-1 space-y-3">
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white px-1 truncate">
              Total Gains (Returns)
            </span>
            <div className="text-right px-1 shrink-0">
              <PrivacyMask>
                <span
                  className={`text-base sm:text-xl font-bold tabular-nums ${
                    isPositive
                      ? "text-emerald-500 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}>
                  {isPositive ? "+" : ""}₹
                  {Math.round(Math.abs(profit)).toLocaleString("en-IN")}
                </span>
              </PrivacyMask>
              <span
                className={`text-xs sm:text-sm font-medium ml-1.5 tabular-nums ${
                  isPositive
                    ? "text-emerald-600/80 dark:text-emerald-500/80"
                    : "text-red-600/80 dark:text-red-500/80"
                }`}>
                ({isPositive ? "+" : ""}
                {returnPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Asset breakdown */}
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-white/10 px-1 text-xs sm:text-sm">
            {showMf && (hasMf || !hasAnyAsset) && (
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Mutual Funds
                </span>
                <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                  <PrivacyMask blurStrength="sm">
                    <span
                      className={`font-semibold ${
                        (mfProfit ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(mfProfit ?? 0) >= 0 ? "▲ +" : "▼ -"}₹
                      {Math.round(Math.abs(mfProfit ?? 0)).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  <span
                    className={`text-xs ${
                      (mfProfit ?? 0) >= 0
                        ? "text-emerald-600/80 dark:text-emerald-500/80"
                        : "text-red-600/80 dark:text-red-500/80"
                    }`}>
                    ({(mfProfit ?? 0) >= 0 ? "+" : ""}{mfReturnPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            {showStock && (hasStock || !hasAnyAsset) && (
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  Stocks
                </span>
                <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                  <PrivacyMask blurStrength="sm">
                    <span
                      className={`font-semibold ${
                        (stockProfit ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(stockProfit ?? 0) >= 0 ? "▲ +" : "▼ -"}₹
                      {Math.round(Math.abs(stockProfit ?? 0)).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  <span
                    className={`text-xs ${
                      (stockProfit ?? 0) >= 0
                        ? "text-emerald-600/80 dark:text-emerald-500/80"
                        : "text-red-600/80 dark:text-red-500/80"
                    }`}>
                    ({(stockProfit ?? 0) >= 0 ? "+" : ""}{stockReturnPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            {showFi && (fiInvested > 0 || (fiProfit !== undefined && fiProfit !== 0)) && (
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  Fixed Income (Interest)
                </span>
                <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                  <PrivacyMask blurStrength="sm">
                    <span
                      className={`font-semibold ${
                        (fiProfit ?? 0) >= 0
                          ? "text-cyan-600 dark:text-cyan-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(fiProfit ?? 0) >= 0 ? "▲ +" : "▼ -"}₹
                      {Math.round(Math.abs(fiProfit ?? 0)).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  <span
                    className={`text-xs ${
                      (fiProfit ?? 0) >= 0
                        ? "text-cyan-600/80 dark:text-cyan-400/80"
                        : "text-red-600/80 dark:text-red-500/80"
                    }`}>
                    ({(fiProfit ?? 0) >= 0 ? "+" : ""}{fiReturnPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            {showGold && (goldInvested > 0 || (goldProfit !== undefined && goldProfit !== 0)) && (
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  Gold &amp; Bullion
                </span>
                <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                  <PrivacyMask blurStrength="sm">
                    <span
                      className={`font-semibold ${
                        (goldProfit ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(goldProfit ?? 0) >= 0 ? "▲ +" : "▼ -"}₹
                      {Math.round(Math.abs(goldProfit ?? 0)).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  <span
                    className={`text-xs ${
                      (goldProfit ?? 0) >= 0
                        ? "text-emerald-600/80 dark:text-emerald-500/80"
                        : "text-red-600/80 dark:text-red-500/80"
                    }`}>
                    ({(goldProfit ?? 0) >= 0 ? "+" : ""}{goldReturnPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            {showRe && (reInvested > 0 || (reProfit !== undefined && reProfit !== 0)) && (
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  Real Estate (Appreciation)
                </span>
                <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                  <PrivacyMask blurStrength="sm">
                    <span
                      className={`font-semibold ${
                        (reProfit ?? 0) >= 0
                          ? "text-rose-500 dark:text-rose-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                      {(reProfit ?? 0) >= 0 ? "▲ +" : "▼ -"}₹
                      {Math.round(Math.abs(reProfit ?? 0)).toLocaleString("en-IN")}
                    </span>
                  </PrivacyMask>
                  <span
                    className={`text-xs ${
                      (reProfit ?? 0) >= 0
                        ? "text-rose-500/80 dark:text-rose-400/80"
                        : "text-red-600/80 dark:text-red-500/80"
                    }`}>
                    ({(reProfit ?? 0) >= 0 ? "+" : ""}{reReturnPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
