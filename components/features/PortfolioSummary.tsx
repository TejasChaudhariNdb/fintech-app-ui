"use client";

import React from "react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";

interface PortfolioSummaryProps {
  invested: number;
  current: number;
  profit: number;
  returnPct: number;
  dayChange?: number;
  dayChangePct?: number;
  xirr?: number;
  mfProfit?: number;
  stockProfit?: number;
}

export default function PortfolioSummary({
  invested,
  current,
  profit,
  returnPct,
  dayChange = 0,
  dayChangePct = 0,
  xirr,
  mfProfit,
  stockProfit,
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
            <PrivacyMask>₹{invested.toLocaleString("en-IN")}</PrivacyMask>
          </span>
        </div>

        <div className="flex justify-between items-center group">
          <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            Current Value
          </span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            <PrivacyMask>₹{current.toLocaleString("en-IN")}</PrivacyMask>
          </span>
        </div>

        <div className="flex justify-between items-center group">
          <span className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            Day&apos;s Change
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
              ({dayChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {xirr !== undefined && xirr !== null && (
          <div className="flex justify-between items-center group">
            <span
              className="text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors cursor-help flex items-center gap-1"
              title="XIRR calculation currently includes Mutual Funds only">
              XIRR <span className="text-[10px] opacity-70">(MF only)</span>
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

        <div className="bg-neutral-50 dark:bg-white/5 rounded-xl p-3 -mx-2 mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-neutral-900 dark:text-white px-2">
              Total Gain
            </span>
            <div className="text-right px-2">
              <PrivacyMask>
                <span
                  className={`font-bold text-lg ${
                    isPositive
                      ? "text-emerald-500 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}>
                  {isPositive ? "+" : ""}₹
                  {Math.abs(profit).toLocaleString("en-IN")}
                </span>
              </PrivacyMask>
              <span
                className={`text-xs font-medium ml-2 ${
                  isPositive
                    ? "text-emerald-600/80 dark:text-emerald-500/80"
                    : "text-red-600/80 dark:text-red-500/80"
                }`}>
                ({isPositive ? "+" : ""}
                {returnPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {mfProfit !== undefined && stockProfit !== undefined ? (
            <div className="px-2 pt-2 mt-1 border-t border-neutral-200 dark:border-white/10 flex justify-between text-[11px]">
              <div className="flex gap-3 text-neutral-500 dark:text-neutral-400">
                <span>
                  MF:{" "}
                  <span
                    className={`font-medium ${
                      mfProfit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}>
                    {mfProfit >= 0 ? "+" : ""}₹
                    {Math.floor(Math.abs(mfProfit)).toLocaleString("en-IN")}
                  </span>
                </span>
                <span>
                  Stocks:{" "}
                  <span
                    className={`font-medium ${
                      stockProfit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}>
                    {stockProfit >= 0 ? "+" : ""}₹
                    {Math.floor(Math.abs(stockProfit)).toLocaleString("en-IN")}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="px-2 text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
              Realized + Unrealized (MF & Stocks)
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
