import React from "react";
import Card from "../ui/Card";

interface PortfolioSummaryProps {
  invested: number;
  current: number;
  profit: number;
  returnPct: number;
  dayChange?: number;
  dayChangePct?: number;
  xirr?: number;
}

export default function PortfolioSummary({
  invested,
  current,
  profit,
  returnPct,
  dayChange = 0,
  dayChangePct = 0,
  xirr,
}: PortfolioSummaryProps) {
  const isPositive = profit >= 0;
  const isDayPositive = dayChange >= 0;

  return (
    <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <h3 className="text-lg font-semibold mb-6 text-neutral-900 dark:text-white">
        Portfolio Summary
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center group">
          <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            Invested
          </span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            ₹{invested.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex justify-between items-center group">
          <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            Current Value
          </span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            ₹{current.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex justify-between items-center group">
          <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            Day&apos;s Change
          </span>
          <div className="text-right">
            <span
              className={`font-semibold ${
                isDayPositive
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}>
              {isDayPositive ? "+" : ""}₹
              {Math.abs(dayChange).toLocaleString("en-IN")}
            </span>
            <span
              className={`text-xs ml-1.5 ${
                isDayPositive
                  ? "text-emerald-600/80 dark:text-emerald-500/80"
                  : "text-red-600/80 dark:text-red-500/80"
              }`}>
              ({dayChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {xirr !== undefined && xirr !== null && (
          <div className="flex justify-between items-center group">
            <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
              XIRR
            </span>
            <span
              className={`font-semibold ${
                xirr >= 0
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}>
              {xirr.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="h-px bg-neutral-100 dark:bg-white/5 my-4" />

        <div className="flex justify-between items-center bg-neutral-50 dark:bg-white/5 rounded-xl p-3 -mx-2">
          <span className="font-medium text-neutral-900 dark:text-white px-2">
            Total Gain
          </span>
          <div className="text-right px-2">
            <p
              className={`font-bold text-lg ${
                isPositive
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}>
              {isPositive ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN")}
            </p>
            <p
              className={`text-xs font-medium ${
                isPositive
                  ? "text-emerald-600/80 dark:text-emerald-500/80"
                  : "text-red-600/80 dark:text-red-500/80"
              }`}>
              ({isPositive ? "+" : ""}
              {returnPct.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
