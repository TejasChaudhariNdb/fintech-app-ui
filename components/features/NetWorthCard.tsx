"use client";

import React from "react";
import Card from "../ui/Card";
import { RefreshCw, Loader2, Clock } from "lucide-react";
import PrivacyMask from "../ui/PrivacyMask";

interface NetWorthCardProps {
  netWorth: number;
  mfValue: number;
  stockValue: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dayChangePct?: number;
  lastUpdated?: string;
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
  lastUpdated,
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

  return (
    <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none shadow-2xl shadow-primary-900/40 relative overflow-hidden group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl transform -translate-x-5 translate-y-5" />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-1">
          <p className="text-sm font-medium text-primary-100">
            Total Net Worth
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/10 disabled:opacity-50 active:scale-95">
              {isRefreshing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {isRefreshing ? "Updating..." : "Refresh"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <PrivacyMask blurStrength="md">
              ₹{netWorth.toLocaleString("en-IN")}
            </PrivacyMask>
          </h1>
          <div
            className={`px-2 py-0.5 rounded-lg text-xs sm:text-sm font-medium flex items-center ${
              isPositive
                ? "bg-emerald-500/20 text-emerald-100"
                : "bg-rose-500/30 text-rose-200"
            }`}>
            {isPositive ? "▲" : "▼"} {Math.abs(dayChangePct).toFixed(2)}%
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mb-6 text-[10px] sm:text-[11px] font-medium text-primary-200/60">
          <p>
            Updated: <span className="text-white/80">{formattedDate}</span>
          </p>
          <span className="text-primary-400/30">•</span>
          <p className="flex items-center gap-1 text-primary-300/70">
            <Clock size={10} />
            Next: {nextRefreshText}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium text-primary-100">
                Mutual Funds
              </p>
              {mfValue === 0 && (
                <span
                  onClick={onAddMF}
                  className="text-[9px] uppercase tracking-wider text-primary-300/60 bg-white/5 px-1.5 py-0.5 rounded cursor-pointer hover:bg-white/10 transition-colors">
                  Add +
                </span>
              )}
            </div>
            <p
              className={`text-base sm:text-lg font-semibold tracking-wide truncate ${mfValue === 0 ? "opacity-50" : ""}`}>
              <PrivacyMask>₹{mfValue.toLocaleString("en-IN")}</PrivacyMask>
            </p>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium text-primary-100">Stocks</p>
              {stockValue === 0 && (
                <span
                  onClick={onAddStock}
                  className="text-[9px] uppercase tracking-wider text-primary-300/60 bg-white/5 px-1.5 py-0.5 rounded cursor-pointer hover:bg-white/10 transition-colors">
                  Add +
                </span>
              )}
            </div>
            <p
              className={`text-base sm:text-lg font-semibold tracking-wide truncate ${stockValue === 0 ? "opacity-50" : ""}`}>
              <PrivacyMask>₹{stockValue.toLocaleString("en-IN")}</PrivacyMask>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
