"use client";

import React from "react";
import Card from "../ui/Card";
import { TrendingUp, TrendingDown } from "lucide-react";

// BUG-028: both values are XIRRs over the same dated cash flows, so the comparison is like with like.
interface BenchmarkCardProps {
  portfolioXirr: number;
  benchmarkXirr: number | null;
  benchmarkName?: string;
}

export default function BenchmarkCard({
  portfolioXirr,
  benchmarkXirr,
  benchmarkName = "Nifty 50",
}: BenchmarkCardProps) {
  const hasBenchmark = benchmarkXirr !== null && benchmarkXirr !== undefined;
  const diff = hasBenchmark ? portfolioXirr - (benchmarkXirr as number) : 0;
  const isBeating = diff >= 0;

  return (
    <Card className="p-4 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Market Benchmark (XIRR)
        </h3>
        <span className="text-xs text-neutral-400">vs {benchmarkName}</span>
      </div>

      {!hasBenchmark ? (
        <p className="text-xs text-neutral-500">
          Not enough price history to compare. Try again later.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between">
            {/* Portfolio */}
            <div>
              <p className="text-xs text-neutral-500 mb-1">Your XIRR</p>
              <p
                className={`text-xl font-bold ${
                  portfolioXirr >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                {portfolioXirr.toFixed(2)}%
              </p>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-neutral-200 dark:bg-white/10 mx-2" />

            {/* Benchmark: same cash flows invested in the index */}
            <div>
              <p className="text-xs text-neutral-500 mb-1">
                {benchmarkName} (same cash flows)
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {(benchmarkXirr as number).toFixed(2)}%
              </p>
            </div>
          </div>

          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${
              isBeating
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
            }`}>
            {isBeating ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <div>
              <p className="text-xs font-semibold">
                You are {isBeating ? "beating" : "lagging"} the market
              </p>
              <p className="text-[10px] opacity-90">
                By {Math.abs(diff).toFixed(2)} percentage points (annualised)
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
