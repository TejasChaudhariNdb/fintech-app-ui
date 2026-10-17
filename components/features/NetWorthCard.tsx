"use client";

import React from "react";
import Card from "../ui/Card";
import { RefreshCw, Loader2, Clock, ArrowDownUp } from "lucide-react";
import PrivacyMask from "../ui/PrivacyMask";

interface NetWorthCardProps {
  netWorth: number;
  mfValue: number;
  stockValue: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dayChangePct?: number;
  mfDayChange?: number;
  mfDayChangePct?: number;
  stockDayChange?: number;
  stockDayChangePct?: number;
  lastUpdated?: string;
  xirr?: number;
  mfXirr?: number;
  stockXirr?: number;
  lifetimeXirr?: number;
  mfLifetimeXirr?: number;
  stockLifetimeXirr?: number;
  onAddMF?: () => void;
  onAddStock?: () => void;
}

export default function NetWorthCard({
  netWorth,
  mfValue,
  stockValue,
  onRefresh,
  isRefreshing = false,
  dayChangePct = 0,
  mfDayChange,
  mfDayChangePct,
  stockDayChange,
  stockDayChangePct,
  lastUpdated,
  xirr,
  mfXirr,
  stockXirr,
  lifetimeXirr,
  mfLifetimeXirr,
  stockLifetimeXirr,
  onAddMF,
  onAddStock,
}: NetWorthCardProps) {
  const isPositive = dayChangePct >= 0;

  // Format the date if provided
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  const [nextRefreshText, setNextRefreshText] = React.useState("7:00 AM / 11:00 PM");

  React.useEffect(() => {
    const calculateText = () => {
      const now = new Date();
      
      const getUTCTarget = (baseDate: Date, addDays: number, hours: number, minutes: number) => {
        const d = new Date(baseDate.getTime());
        d.setUTCDate(d.getUTCDate() + addDays);
        d.setUTCHours(hours, minutes, 0, 0);
        return d;
      };

      // Cron is '30 1,17 * * *' (UTC) -> 1:30 UTC and 17:30 UTC.
      // In IST (UTC+5:30), these correspond to 7:00 AM and 11:00 PM respectively.
      const runAToday = getUTCTarget(now, 0, 1, 30);
      const runBToday = getUTCTarget(now, 0, 17, 30);
      const runATomorrow = getUTCTarget(now, 1, 1, 30);
      const runBTomorrow = getUTCTarget(now, 1, 17, 30);

      const targets = [runAToday, runBToday, runATomorrow, runBTomorrow];
      const futureTargets = targets.filter(t => t.getTime() > now.getTime());
      futureTargets.sort((a, b) => a.getTime() - b.getTime());

      const nextTarget = futureTargets[0];
      if (!nextTarget) return "7:00 AM";

      const diffMs = nextTarget.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));

      let countdownText = "";
      if (diffMinutes < 60) {
        countdownText = `in ${diffMinutes}m`;
      } else {
        const hours = Math.round(diffMinutes / 60);
        countdownText = `in ${hours}h`;
      }

      // Format target time to user-friendly local format (in IST Asia/Kolkata)
      const timeStr = nextTarget.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${timeStr} (${countdownText})`;
    };

    setNextRefreshText(calculateText());

    // Update every minute (60000 ms) to keep the countdown fresh
    const interval = setInterval(() => {
      setNextRefreshText(calculateText());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const [mfXirrMode, setMfXirrMode] = React.useState<"xirr" | "lifetime">("xirr");
  const [stockXirrMode, setStockXirrMode] = React.useState<"xirr" | "lifetime">("xirr");

  return (
    <Card id="tour-net-worth-card" className="p-4 sm:p-6 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white border-none shadow-2xl shadow-primary-900/40 relative overflow-hidden group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl transform -translate-x-5 translate-y-5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-primary-100 uppercase">
            Total Net Worth
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-medium transition-all border border-white/15 disabled:opacity-50 cursor-pointer">
              {isRefreshing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
            </button>
          )}
        </div>

        {/* Amount & Badges */}
        <div className="flex flex-col gap-2 mb-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
            <PrivacyMask blurStrength="md">
              ₹{Math.round(netWorth).toLocaleString("en-IN")}
            </PrivacyMask>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 backdrop-blur-md shadow-xs ${
                isPositive
                  ? "bg-emerald-500/25 text-emerald-100 border border-emerald-400/30"
                  : "bg-rose-500/30 text-rose-100 border border-rose-400/30"
              }`}>
              <span>{isPositive ? "▲" : "▼"}</span>
              <span>{Math.abs(dayChangePct).toFixed(2)}%</span>
              <span className="text-white/60 font-medium text-[10px]">1D</span>
            </div>

            {xirr !== undefined && xirr !== null && (
              <div
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-xs ${
                  xirr >= 0
                    ? "bg-white/15 text-white border border-white/20"
                    : "bg-rose-500/25 text-rose-100 border border-rose-400/30"
                }`}
                title="Annualized return across entire portfolio">
                <span className="text-white/70 font-medium text-[11px]">Portfolio XIRR:</span>
                <span className={xirr >= 0 ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
                  {xirr.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-5 text-[10px] sm:text-[11px] font-medium text-primary-200/70">
          <p>
            Updated: <span className="text-white/90">{formattedDate}</span>
          </p>
          <span className="text-primary-400/40">•</span>
          <p className="flex items-center gap-1 text-primary-300/80">
            <Clock size={11} />
            Next: {nextRefreshText}
          </p>
        </div>

        {/* 2-Column Asset Subcards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {/* Mutual Funds */}
          <div className="bg-white/10 dark:bg-black/25 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 shadow-sm flex flex-col justify-between transition-all hover:bg-white/15">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <p className="text-[11px] font-semibold text-primary-100 uppercase tracking-wider truncate">
                    Mutual Funds
                  </p>
                </div>
                {mfValue === 0 && (
                  <span
                    onClick={onAddMF}
                    className="text-[9px] uppercase tracking-wider text-primary-200 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors font-medium shrink-0">
                    + Add
                  </span>
                )}
              </div>
              <p
                className={`text-base sm:text-xl font-bold tracking-tight truncate tabular-nums text-white ${mfValue === 0 ? "opacity-50" : ""}`}>
                <PrivacyMask>₹{Math.round(mfValue).toLocaleString("en-IN")}</PrivacyMask>
              </p>
              {mfDayChange !== undefined && (
                <div className="text-[11px] font-medium mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${mfDayChange >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {mfDayChange >= 0 ? "▲ +" : "▼ "}₹{Math.round(Math.abs(mfDayChange)).toLocaleString("en-IN")}
                    {mfDayChangePct !== undefined && ` (${mfDayChangePct >= 0 ? "+" : ""}${mfDayChangePct.toFixed(2)}%)`}
                  </span>
                  <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">1D</span>
                </div>
              )}
            </div>

            {/* XIRR Toggle Switch */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMfXirrMode(m => m === "xirr" ? "lifetime" : "xirr")}
                className="w-full inline-flex items-center justify-between px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-98 text-[11px] font-medium text-white transition-all border border-white/15 shadow-xs cursor-pointer select-none group/btn"
                title="Tap to toggle between XIRR and Lifetime XIRR">
                <span className="flex items-center gap-1.5 truncate">
                  <ArrowDownUp size={11} className="text-emerald-300 shrink-0 group-hover/btn:rotate-180 transition-transform duration-300" />
                  <span className="text-white/70 text-[10px]">{mfXirrMode === "xirr" ? "XIRR" : "Lifetime"}</span>
                </span>
                <span className="font-bold text-emerald-300 shrink-0 tabular-nums">
                  {mfXirrMode === "xirr" 
                    ? (mfXirr !== undefined ? `${mfXirr.toFixed(2)}%` : "--")
                    : ((mfLifetimeXirr ?? mfXirr) !== undefined ? `${(mfLifetimeXirr ?? mfXirr)!.toFixed(2)}%` : "--")
                  }
                </span>
              </button>
            </div>
          </div>

          {/* Stocks */}
          <div className="bg-white/10 dark:bg-black/25 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 shadow-sm flex flex-col justify-between transition-all hover:bg-white/15">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <p className="text-[11px] font-semibold text-primary-100 uppercase tracking-wider truncate">
                    Stocks
                  </p>
                </div>
                {stockValue === 0 && (
                  <span
                    onClick={onAddStock}
                    className="text-[9px] uppercase tracking-wider text-primary-200 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors font-medium shrink-0">
                    + Add
                  </span>
                )}
              </div>
              <p
                className={`text-base sm:text-xl font-bold tracking-tight truncate tabular-nums text-white ${stockValue === 0 ? "opacity-50" : ""}`}>
                <PrivacyMask>₹{Math.round(stockValue).toLocaleString("en-IN")}</PrivacyMask>
              </p>
              {stockDayChange !== undefined && (
                <div className="text-[11px] font-medium mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${stockDayChange >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {stockDayChange >= 0 ? "▲ +" : "▼ "}₹{Math.round(Math.abs(stockDayChange)).toLocaleString("en-IN")}
                    {stockDayChangePct !== undefined && ` (${stockDayChangePct >= 0 ? "+" : ""}${stockDayChangePct.toFixed(2)}%)`}
                  </span>
                  <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">1D</span>
                </div>
              )}
            </div>

            {/* XIRR Toggle Switch */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStockXirrMode(m => m === "xirr" ? "lifetime" : "xirr")}
                className="w-full inline-flex items-center justify-between px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-98 text-[11px] font-medium text-white transition-all border border-white/15 shadow-xs cursor-pointer select-none group/btn"
                title="Tap to toggle between XIRR and Lifetime XIRR">
                <span className="flex items-center gap-1.5 truncate">
                  <ArrowDownUp size={11} className="text-blue-300 shrink-0 group-hover/btn:rotate-180 transition-transform duration-300" />
                  <span className="text-white/70 text-[10px]">{stockXirrMode === "xirr" ? "XIRR" : "Lifetime"}</span>
                </span>
                <span className="font-bold text-blue-300 shrink-0 tabular-nums">
                  {stockXirrMode === "xirr" 
                    ? (stockXirr !== undefined ? `${stockXirr.toFixed(2)}%` : "--")
                    : ((stockLifetimeXirr ?? stockXirr) !== undefined ? `${(stockLifetimeXirr ?? stockXirr)!.toFixed(2)}%` : "--")
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
