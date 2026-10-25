"use client";

import React, { useState, useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Zap,
  ChevronsUpDown,
} from "lucide-react";
import TradingViewBenchmarkChart, {
  ChartDataPoint,
} from "@/components/features/TradingViewBenchmarkChart";

export type BenchmarkKey =
  | "nifty50"
  | "nifty100"
  | "nifty_midcap150"
  | "nifty_smallcap250"
  | "nifty500";

export interface BenchmarkOption {
  key: BenchmarkKey;
  name: string;
  shortName: string;
  category: string;
  color: string;
}

export const BENCHMARKS: BenchmarkOption[] = [
  { key: "nifty50", name: "Nifty 50", shortName: "NIFTY 50", category: "Large Cap", color: "#6366f1" },
  { key: "nifty100", name: "Nifty 100", shortName: "NIFTY 100", category: "Top 100", color: "#3b82f6" },
  { key: "nifty_midcap150", name: "Nifty MidCap 150", shortName: "NIFTY MIDCAP 150", category: "Mid Cap", color: "#f59e0b" },
  { key: "nifty_smallcap250", name: "Nifty SmallCap 250", shortName: "NIFTY SMALLCAP 250", category: "Small Cap", color: "#ec4899" },
  { key: "nifty500", name: "Nifty 500", shortName: "NIFTY 500", category: "Broad Market", color: "#a855f7" },
];

interface BenchmarkSummary {
  portfolio_return_pct: number;
  nifty50_return_pct: number;
  nifty100_return_pct?: number;
  nifty_midcap150_return_pct?: number;
  nifty_smallcap250_return_pct?: number;
  nifty500_return_pct: number;
  alpha_vs_nifty50: number;
  alpha_vs_nifty100?: number;
  alpha_vs_nifty_midcap150?: number;
  alpha_vs_nifty_smallcap250?: number;
  alpha_vs_nifty500: number;
  is_outperforming: boolean;
  portfolio_final_value: number;
  portfolio_start_value?: number;
  portfolio_value_delta?: number;
  nifty50_final_value: number;
  nifty100_final_value?: number;
  nifty_midcap150_final_value?: number;
  nifty_smallcap250_final_value?: number;
  nifty500_final_value: number;
  total_invested: number;
  total_current_value: number;
}

interface BenchmarkSeriesPoint {
  date: string;
  portfolio: number;
  portfolio_pct: number;
  nifty50: number;
  nifty50_pct: number;
  nifty100?: number;
  nifty100_pct?: number;
  nifty_midcap150?: number;
  nifty_midcap150_pct?: number;
  nifty_smallcap250?: number;
  nifty_smallcap250_pct?: number;
  nifty500: number;
  nifty500_pct: number;
}

interface BenchmarkGrowthResponse {
  range: string;
  base_amount: number;
  summary: BenchmarkSummary;
  series: BenchmarkSeriesPoint[];
}

const RANGES = [
  { label: "1M", value: "1M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "3Y", value: "3Y" },
  { label: "5Y", value: "5Y" },
  { label: "10Y", value: "10Y" },
  { label: "15Y", value: "15Y" },
  { label: "ALL", value: "ALL" },
] as const;

export default function BenchmarkGrowthCard({
  title = "Performance vs Market Benchmarks",
  subtitle = "Comparative return and alpha against key market indices",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { activeProfileId } = useProfile();
  const { resolvedTheme } = useTheme();
  const [selectedRange, setSelectedRange] = useState<string>("1Y");
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkKey>("nifty50");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<BenchmarkGrowthResponse | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    portfolioPct: number;
    benchmarkPct: number;
    alpha: number;
  } | null>(null);

  // Restore preferred benchmark from localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_benchmark") as BenchmarkKey | null;
      if (saved && BENCHMARKS.some((b) => b.key === saved)) {
        setSelectedBenchmark(saved);
      }
    }
  }, []);

  const handleBenchmarkSelect = (key: BenchmarkKey) => {
    setSelectedBenchmark(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_benchmark", key);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchGrowth = async () => {
      try {
        setIsLoading(true);
        const res: BenchmarkGrowthResponse = await api.getBenchmarkGrowth(
          selectedRange,
          10000,
          activeProfileId
        );
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error("Failed to load benchmark growth", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchGrowth();
    return () => {
      isMounted = false;
    };
  }, [selectedRange, activeProfileId]);

  // Clean date helper to guarantee YYYY-MM-DD for TradingView lightweight charts
  const toCleanDateStr = (raw: string) => {
    if (!raw) return "";
    const clean = raw.includes("T") ? raw.split("T")[0] : raw;
    return clean;
  };

  const portfolioSeriesData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.series) return [];
    return data.series
      .filter((pt) => pt.date)
      .map((pt) => ({
        time: toCleanDateStr(pt.date),
        value: Number((pt.portfolio_pct ?? 0).toFixed(2)),
      }));
  }, [data]);

  const benchmarkSeriesData = useMemo<ChartDataPoint[]>(() => {
    if (!data?.series) return [];
    const bPctKey = `${selectedBenchmark}_pct` as keyof BenchmarkSeriesPoint;
    return data.series
      .filter((pt) => pt.date)
      .map((pt) => {
        const val = (pt[bPctKey] as number) ?? pt.nifty50_pct ?? 0;
        return {
          time: toCleanDateStr(pt.date),
          value: Number(val.toFixed(2)),
        };
      });
  }, [data, selectedBenchmark]);

  const summary = data?.summary;
  const currentBenchmarkObj =
    BENCHMARKS.find((b) => b.key === selectedBenchmark) || BENCHMARKS[0];

  // Dynamically compute return and alpha vs currently selected benchmark
  const benchmarkReturnPct = useMemo(() => {
    if (!summary) return 0;
    const key = `${selectedBenchmark}_return_pct` as keyof BenchmarkSummary;
    const val = summary[key];
    return typeof val === "number" ? val : summary.nifty50_return_pct;
  }, [summary, selectedBenchmark]);

  const benchmarkAlpha = useMemo(() => {
    if (!summary) return 0;
    const key = `alpha_vs_${selectedBenchmark}` as keyof BenchmarkSummary;
    const val = summary[key];
    return typeof val === "number" ? val : summary.alpha_vs_nifty50;
  }, [summary, selectedBenchmark]);

  const isOutperforming = benchmarkAlpha >= 0;

  return (
    <Card className="p-4 sm:p-6 bg-white dark:bg-surface border border-neutral-200/80 dark:border-white/5 rounded-3xl shadow-xs space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
          {RANGES.map((r) => {
            const isSelected = selectedRange === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRange(r.value)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all shrink-0 ${
                  isSelected
                    ? "bg-primary-600 text-white shadow-xs font-bold"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ALPHA HIGHLIGHT BANNER ── */}
      {summary && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isOutperforming
              ? "bg-gradient-to-r from-emerald-500/[0.08] to-emerald-500/[0.02] border-emerald-500/25"
              : "bg-gradient-to-r from-amber-500/[0.08] to-amber-500/[0.02] border-amber-500/25"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isOutperforming
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}
            >
              {isOutperforming ? <Zap size={20} /> : <TrendingDown size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white">
                  {isOutperforming
                    ? `Generating +${benchmarkAlpha.toFixed(1)}% Alpha vs ${currentBenchmarkObj.name}`
                    : `Trailing ${currentBenchmarkObj.name} by ${Math.abs(benchmarkAlpha).toFixed(1)}%`}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isOutperforming
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {isOutperforming ? "Outperforming" : "Trailing"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isOutperforming
                  ? `Your portfolio delivered ${benchmarkAlpha.toFixed(
                      1
                    )}% extra return above ${currentBenchmarkObj.name} over this ${selectedRange} window.`
                  : `${currentBenchmarkObj.name} returned ${benchmarkReturnPct.toFixed(
                      1
                    )}% while your portfolio returned ${summary.portfolio_return_pct.toFixed(1)}%.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 sm:border-l sm:border-neutral-200 dark:sm:border-white/10 sm:pl-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Alpha vs {currentBenchmarkObj.shortName}
              </span>
              <div
                className={`font-black text-sm sm:text-base ${
                  benchmarkAlpha >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {benchmarkAlpha >= 0 ? "+" : ""}
                {benchmarkAlpha.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── METRIC STRIP / BENCHMARK SELECTOR ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Portfolio Metric */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                My Portfolio
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">
                {selectedRange === "ALL" ? "All-Time Return" : `${selectedRange} Return`}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-0.5">
              <span
                className={`text-xl sm:text-2xl font-black ${
                  summary.portfolio_return_pct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.portfolio_return_pct >= 0 ? "+" : ""}
                {summary.portfolio_return_pct.toFixed(2)}%
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {selectedRange === "ALL" ? (
                  summary.total_current_value > 0 ? (
                    `₹${Math.round(summary.total_current_value).toLocaleString("en-IN")} Value`
                  ) : null
                ) : summary.portfolio_value_delta !== undefined ? (
                  `${summary.portfolio_value_delta >= 0 ? "+" : ""}₹${Math.round(Math.abs(summary.portfolio_value_delta)).toLocaleString("en-IN")} (${selectedRange})`
                ) : summary.total_current_value > 0 ? (
                  `₹${Math.round(summary.total_current_value).toLocaleString("en-IN")} Value`
                ) : null}
              </span>
            </div>
          </div>

          {/* Dynamic Benchmark Selector Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-primary-500/30 dark:border-primary-500/30 shadow-xs space-y-1.5 relative group">
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentBenchmarkObj.color }}
                />
                <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  {currentBenchmarkObj.shortName}
                </span>
              </div>

              {/* Corner: Category badge + clean visible switch icon */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded">
                  {currentBenchmarkObj.category}
                </span>
                <ChevronsUpDown size={15} className="text-primary-500 dark:text-primary-400 transition-colors" />
                <select
                  value={selectedBenchmark}
                  onChange={(e) => handleBenchmarkSelect(e.target.value as BenchmarkKey)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Switch Benchmark Index"
                >
                  {BENCHMARKS.map((b) => (
                    <option
                      key={b.key}
                      value={b.key}
                      className="bg-white dark:bg-[#151922] text-neutral-900 dark:text-white py-1"
                    >
                      {b.shortName} ({b.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <span
                className={`text-xl sm:text-2xl font-black ${
                  benchmarkReturnPct >= 0
                    ? "text-neutral-900 dark:text-white"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {benchmarkReturnPct >= 0 ? "+" : ""}
                {benchmarkReturnPct.toFixed(2)}%
              </span>
              <span
                className={`text-xs font-semibold ${
                  benchmarkAlpha >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {benchmarkAlpha >= 0 ? "+" : ""}
                {benchmarkAlpha.toFixed(1)}% Alpha
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── CHART ── */}
      <div className="w-full relative">
        {isLoading ? (
          <div className="h-72 w-full flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <span className="text-xs">Fetching benchmark index histories...</span>
          </div>
        ) : portfolioSeriesData.length === 0 ? (
          <div className="h-72 w-full flex items-center justify-center text-xs text-neutral-400">
            No historical benchmark data available for this range
          </div>
        ) : (
          <div className="space-y-2">
            {/* Live Hover HUD / Series Legend Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-neutral-100/80 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/10 text-xs min-h-[36px]">
              {hoveredPoint ? (
                <>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                    {hoveredPoint.date}
                  </span>
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Portfolio: {hoveredPoint.portfolioPct >= 0 ? "+" : ""}
                      {hoveredPoint.portfolioPct.toFixed(2)}%
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentBenchmarkObj.color }}
                      />
                      {currentBenchmarkObj.shortName}:{" "}
                      {hoveredPoint.benchmarkPct >= 0 ? "+" : ""}
                      {hoveredPoint.benchmarkPct.toFixed(2)}%
                    </span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase ${
                        hoveredPoint.alpha >= 0
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {hoveredPoint.alpha >= 0 ? "+" : ""}
                      {hoveredPoint.alpha.toFixed(2)}% Alpha
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full text-neutral-500 dark:text-neutral-400 text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      My Portfolio
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentBenchmarkObj.color }}
                      />
                      {currentBenchmarkObj.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 hidden sm:inline">
                    Move cursor over chart for crosshair details
                  </span>
                </div>
              )}
            </div>

            {/* TradingView Lightweight Chart */}
            <TradingViewBenchmarkChart
              portfolioData={portfolioSeriesData}
              benchmarkData={benchmarkSeriesData}
              benchmarkName={currentBenchmarkObj.name}
              benchmarkColor={currentBenchmarkObj.color}
              isDark={resolvedTheme === "dark"}
              height={320}
              onHoverPoint={setHoveredPoint}
            />
          </div>
        )}
      </div>

      {/* ── FOOTER GUIDANCE ── */}
      <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Cumulative return % over the selected window</span>
        <span className="font-semibold text-neutral-500">Live NSE Data</span>
      </div>
    </Card>
  );
}
