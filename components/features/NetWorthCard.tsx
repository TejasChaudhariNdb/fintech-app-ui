import React from "react";
import Card from "../ui/Card";
import { RefreshCw, Loader2 } from "lucide-react";

interface NetWorthCardProps {
  netWorth: number;
  mfValue: number;
  stockValue: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dayChangePct?: number;
}

export default function NetWorthCard({
  netWorth,
  mfValue,
  stockValue,
  onRefresh,
  isRefreshing = false,
  dayChangePct = 0,
}: NetWorthCardProps) {
  const isPositive = dayChangePct >= 0;

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
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10">
              {isRefreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <h1 className="text-4xl font-bold tracking-tight">
            ₹{netWorth.toLocaleString("en-IN")}
          </h1>
          <div
            className={`px-2 py-0.5 rounded-lg text-sm font-medium flex items-center ${
              isPositive
                ? "bg-emerald-500/20 text-emerald-100"
                : "bg-red-500/20 text-red-100"
            }`}>
            {isPositive ? "▲" : "▼"} {Math.abs(dayChangePct).toFixed(2)}%
          </div>
        </div>
        <p className="text-xs text-primary-200 mb-6">
          Last updated: Today,{" "}
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
            <p className="text-xs font-medium text-primary-100 mb-1">
              Mutual Funds
            </p>
            <p className="text-lg font-semibold tracking-wide">
              ₹{mfValue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
            <p className="text-xs font-medium text-primary-100 mb-1">Stocks</p>
            <p className="text-lg font-semibold tracking-wide">
              ₹{stockValue.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
