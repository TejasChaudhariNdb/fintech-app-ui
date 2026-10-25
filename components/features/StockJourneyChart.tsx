"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import TradingViewJourneyChart, {
  TradingViewJourneyPoint,
} from "@/components/features/TradingViewJourneyChart";

type JourneyPoint = {
  date: string;
  invested: number;
  value: number;
};

interface StockJourneyChartProps {
  data?: JourneyPoint[];
  coverageStart?: string | null;
  coveredStocks?: number;
  onRangeChange?: (range: string) => void;
  selectedRange?: string;
  isRefetching?: boolean;
}

const ranges = ["1W", "1M", "6M", "1Y", "3Y", "5Y", "10Y", "ALL"] as const;

export default function StockJourneyChart({
  data,
  coverageStart,
  coveredStocks = 0,
  onRangeChange,
  selectedRange = "6M",
  isRefetching = false,
}: StockJourneyChartProps) {
  const { resolvedTheme } = useTheme();
  const [activePoint, setActivePoint] = useState<JourneyPoint | null>(null);

  const chartData = useMemo(() => {
    return data || [];
  }, [data]);

  const firstPoint = chartData[0] || null;
  const lastPoint = chartData[chartData.length - 1] || null;
  const selected = activePoint || lastPoint;

  // Active point metrics (when user is scrubbing / hovering)
  const hoveredGain = (activePoint?.value || 0) - (activePoint?.invested || 0);
  const hoveredGainPct =
    (activePoint?.invested || 0) > 0
      ? (hoveredGain / (activePoint?.invested || 1)) * 100
      : 0;

  // Period-specific metrics (when user is viewing the range without scrubbing)
  const periodValueDelta = (lastPoint?.value || 0) - (firstPoint?.value || 0);
  const periodReturnPct =
    (firstPoint?.value || 0) > 0
      ? (periodValueDelta / (firstPoint?.value || 1)) * 100
      : 0;
  const periodInvestedDelta = Math.max(
    0,
    (lastPoint?.invested || 0) - (firstPoint?.invested || 0)
  );
  const allTimeGain = (lastPoint?.value || 0) - (lastPoint?.invested || 0);
  const allTimeGainPct =
    (lastPoint?.invested || 0) > 0
      ? (allTimeGain / (lastPoint?.invested || 1)) * 100
      : 0;

  if (!data || isRefetching) {
    return (
      <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
        <div className="h-[280px] flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-neutral-100 dark:border-white/5" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-t-2 border-primary-500 animate-spin" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Analyzing Portfolio History
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isRefetching
                ? "Refreshing range..."
                : "This might take a moment depending on your transaction volume..."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
        <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center justify-between sm:justify-start bg-neutral-100 dark:bg-white/5 rounded-xl p-1 mb-4 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {ranges.map((item) => (
              <button
                key={item}
                onClick={() => onRangeChange?.(item)}
                className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-medium rounded-lg transition-all text-center whitespace-nowrap ${
                  selectedRange === item
                    ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm font-semibold"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}>
                {item}
              </button>
            ))}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Investment history is not available for this range.
          </p>
          <p className="text-xs text-neutral-400">
            Try a longer time range or ensure you have uploaded transactions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
              Investment History
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Historical value vs invested amount across your stock portfolio.
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-start bg-neutral-100 dark:bg-white/5 rounded-xl p-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {ranges.map((item) => (
              <button
                key={item}
                onClick={() => onRangeChange?.(item)}
                className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-medium rounded-lg transition-all text-center whitespace-nowrap ${
                  selectedRange === item
                    ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm font-semibold"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-50 px-4 py-3.5 dark:bg-white/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {activePoint ? (
                    new Date(activePoint.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  ) : selectedRange === "ALL" ? (
                    "Portfolio Value • All-Time"
                  ) : (
                    `Portfolio Value • ${selectedRange} Range`
                  )}
                </span>
                {!activePoint && selectedRange !== "ALL" && firstPoint && lastPoint && (
                  <span className="text-[11px] text-neutral-400">
                    ({new Date(firstPoint.date).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "2-digit",
                    })}{" "}
                    – Today)
                  </span>
                )}
                {activePoint && (
                  <span className="text-[10px] bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded font-semibold">
                    Hovered Point
                  </span>
                )}
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                ₹{Math.round(selected?.value || 0).toLocaleString("en-IN")}
              </p>
            </div>

            {activePoint ? (
              <div className="flex items-center gap-5 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Invested</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    ₹{Math.round(activePoint.invested || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Gain</p>
                  <p
                    className={`font-semibold ${
                      hoveredGain >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}>
                    {hoveredGain >= 0 ? "+" : ""}₹
                    {Math.round(Math.abs(hoveredGain)).toLocaleString("en-IN")} (
                    {hoveredGainPct.toFixed(2)}%)
                  </p>
                </div>
              </div>
            ) : selectedRange === "ALL" ? (
              <div className="flex items-center gap-5 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Invested</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    ₹{Math.round(lastPoint?.invested || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">All-Time Gain</p>
                  <p
                    className={`font-semibold ${
                      allTimeGain >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}>
                    {allTimeGain >= 0 ? "+" : ""}₹
                    {Math.round(Math.abs(allTimeGain)).toLocaleString("en-IN")} (
                    {allTimeGainPct.toFixed(2)}%)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedRange} Return
                  </p>
                  <p
                    className={`font-semibold ${
                      periodValueDelta >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}>
                    {periodValueDelta >= 0 ? "+" : ""}₹
                    {Math.round(Math.abs(periodValueDelta)).toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-semibold">
                      ({periodReturnPct >= 0 ? "+" : ""}{periodReturnPct.toFixed(2)}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Invested in {selectedRange}
                  </p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    ₹{Math.round(periodInvestedDelta).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Start Value
                  </p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    ₹{Math.round(firstPoint?.value || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          {coverageStart ? (
            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 dark:bg-white/8">
              History from{" "}
              {new Date(coverageStart).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : null}
          <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 dark:bg-white/8">
            {coveredStocks} stocks covered
          </span>
          <span className="text-neutral-400">
            Scroll to pan • Pinch to zoom • Ctrl+scroll to zoom
          </span>
        </div>
      </div>
      {/* TradingView Lightweight Journey Chart */}
      <div className="w-full pt-1">
        <TradingViewJourneyChart
          data={chartData}
          primaryColor="#10B981"
          investedColor="#94A3B8"
          primaryTitle="Portfolio Value"
          investedTitle="Invested Capital"
          height={320}
          isDark={resolvedTheme === "dark"}
          onHoverPoint={(pt) =>
            setActivePoint(
              pt ? { date: pt.date, value: pt.value, invested: pt.invested } : null
            )
          }
        />
      </div>
    </Card>
  );
}
