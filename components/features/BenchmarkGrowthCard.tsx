"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Card from "@/components/ui/Card";
import { useProfile } from "@/context/ProfileContext";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { Loader2, BarChart3, ChevronsUpDown, X } from "lucide-react";
import TradingViewBenchmarkChart, {
  BenchmarkChartActions,
  BenchmarkChartPoint,
  PORTFOLIO_COLOR,
} from "@/components/features/TradingViewBenchmarkChart";
import type { RangeSelection } from "@/components/features/chartRangeSelect";

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

// Mirrors ../backend/app/services/benchmark_growth.py (GET /portfolio/benchmark-growth).
// Every index field is null when the index has no price history for the window.
type IndexSummary = {
  [K in BenchmarkKey as `${K}_return_pct` | `${K}_final_value` | `${K}_xirr` | `alpha_vs_${K}`]: number | null;
};

interface BenchmarkSummary extends IndexSummary {
  start_date: string;
  end_date: string;
  portfolio_start_value: number;
  period_invested: number;
  period_withdrawn: number;
  /** Value at the window start + money added in the window: the base of every percentage. */
  base_value: number;
  portfolio_final_value: number;
  portfolio_gain_amount: number;
  portfolio_return_pct: number;
  portfolio_xirr: number | null;
  total_current_value: number;
  is_outperforming: boolean;
  includes_stocks: boolean;
}

type IndexSeries = {
  [K in BenchmarkKey as K | `${K}_pct`]: number | null;
};

interface BenchmarkSeriesPoint extends IndexSeries {
  date: string;
  invested: number;
  withdrawn: number;
  portfolio: number;
  portfolio_pct: number;
}

interface BenchmarkGrowthResponse {
  range: string;
  summary: BenchmarkSummary | null;
  series: BenchmarkSeriesPoint[];
}

const RANGES = ["1M", "6M", "1Y", "3Y", "5Y", "10Y", "15Y", "ALL"] as const;
// An annualised rate over a few weeks swings wildly, so XIRR is shown from one year up.
const XIRR_RANGES = new Set(["1Y", "3Y", "5Y", "10Y", "15Y", "ALL"]);

const signed = (v: number, digits = 2) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}%`;
const rupees = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString("en-IN")}`;
const signedRupees = (v: number) => `${v >= 0 ? "+" : "−"}${rupees(v)}`;
const tone = (v: number) =>
  v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Gain between two points of one line, on the money that was at work between them. */
function changeBetween(
  a: BenchmarkSeriesPoint,
  b: BenchmarkSeriesPoint,
  valueKey: "portfolio" | BenchmarkKey
): { amount: number; pct: number } | null {
  const pctKey = `${valueKey}_pct` as const;
  const [pa, pb, va] = [a[pctKey], b[pctKey], a[valueKey]];
  if (pa === null || pb === null || va === null) return null;
  // Cumulative gain at a point = pct × base. The base grows only by money added.
  const amount = (pb * b.invested - pa * a.invested) / 100;
  const base = va + (b.invested - a.invested);
  return base > 0 ? { amount, pct: (amount / base) * 100 } : null;
}

export default function BenchmarkGrowthCard({
  title = "Performance vs Market Benchmarks",
  subtitle = "Your actual investments compared with the same money in a market index",
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selection, setSelection] = useState<RangeSelection | null>(null);
  const [pinIndex, setPinIndex] = useState<number | null>(null);
  // "return": cumulative return % lines. "value": rupee value lines (as in PowerUp's switch).
  const [view, setView] = useState<"return" | "value">("return");
  const chartActions = useRef<BenchmarkChartActions | null>(null);
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [showBenchmark, setShowBenchmark] = useState(true);

  // Restore preferred benchmark from localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_benchmark") as BenchmarkKey | null;
      if (saved && BENCHMARKS.some((b) => b.key === saved)) {
        setSelectedBenchmark(saved);
      }
      if (localStorage.getItem("benchmark_chart_view") === "value") setView("value");
    }
  }, []);

  const handleBenchmarkSelect = (key: BenchmarkKey) => {
    setSelectedBenchmark(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_benchmark", key);
    }
  };

  const handleViewSelect = (next: "return" | "value") => {
    setView(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("benchmark_chart_view", next);
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
          setHoverIndex(null);
          setSelection(null);
          setPinIndex(null);
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

  const benchmark = BENCHMARKS.find((b) => b.key === selectedBenchmark) || BENCHMARKS[0];
  const summary = data?.summary ?? null;

  // One row per date, sorted: hover and selection indices from the chart refer to this array.
  const series = useMemo<BenchmarkSeriesPoint[]>(() => {
    const byDate = new Map<string, BenchmarkSeriesPoint>();
    for (const pt of data?.series ?? []) {
      if (pt.date) byDate.set(pt.date.split("T")[0], pt);
    }
    return Array.from(byDate.keys())
      .sort()
      .map((d) => ({ ...byDate.get(d)!, date: d }));
  }, [data]);

  const chartPoints = useMemo<BenchmarkChartPoint[]>(
    () =>
      series.map((pt) => ({
        time: pt.date,
        portfolio: view === "value" ? pt.portfolio : pt.portfolio_pct,
        benchmark: view === "value" ? pt[selectedBenchmark] : pt[`${selectedBenchmark}_pct`],
      })),
    [series, selectedBenchmark, view]
  );

  const benchmarkReturn = summary ? summary[`${selectedBenchmark}_return_pct`] : null;
  const benchmarkValue = summary ? summary[`${selectedBenchmark}_final_value`] : null;
  const benchmarkXirr = summary ? summary[`${selectedBenchmark}_xirr`] : null;
  const showXirr = XIRR_RANGES.has(selectedRange);
  const rangeLabel = selectedRange === "ALL" ? "All-time" : selectedRange;

  // A pinned first date reads like a hovered one, plus the prompt for the second date.
  const shownIndex = pinIndex ?? hoverIndex;
  const hovered = shownIndex !== null ? series[shownIndex] ?? null : null;
  const picked =
    selection && series[selection.from] && series[selection.to]
      ? { a: series[selection.from], b: series[selection.to] }
      : null;
  const pickedPortfolio = picked ? changeBetween(picked.a, picked.b, "portfolio") : null;
  const pickedBenchmark = picked ? changeBetween(picked.a, picked.b, selectedBenchmark) : null;

  const handleHover = useCallback((index: number | null) => setHoverIndex(index), []);
  const handleSelect = useCallback((sel: RangeSelection | null) => setSelection(sel), []);
  const handlePin = useCallback((index: number | null) => setPinIndex(index), []);

  const clearButton = (
    <button
      type="button"
      onClick={() => chartActions.current?.clearSelection()}
      aria-label="Clear selected dates"
      className="shrink-0 ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 text-neutral-600 dark:text-neutral-300 transition-colors"
    >
      <X size={14} />
    </button>
  );

  // The figure the active view leads with, and the other one beside it
  const figure = (pct: number, value: number) =>
    view === "value" ? (
      <>
        <span className="font-bold text-neutral-900 dark:text-white">
          <PrivacyMask>{rupees(value)}</PrivacyMask>
        </span>
        <span className={`font-semibold ${tone(pct)}`}>{signed(pct)}</span>
      </>
    ) : (
      <>
        <span className={`font-bold ${tone(pct)}`}>{signed(pct)}</span>
        <span className="font-semibold text-neutral-700 dark:text-neutral-200">
          <PrivacyMask>{rupees(value)}</PrivacyMask>
        </span>
      </>
    );

  const legendChip = (
    label: string,
    color: string,
    active: boolean,
    toggle: () => void,
    disabled: boolean
  ) => (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={active}
      title={active ? `Hide ${label}` : `Show ${label}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-white/5"
          : "text-neutral-400 dark:text-neutral-500 line-through hover:bg-neutral-100 dark:hover:bg-white/5"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span
        className="w-3 h-[3px] rounded-full shrink-0"
        style={{ backgroundColor: active ? color : "currentColor" }}
      />
      {label}
    </button>
  );

  const readoutValue = (label: string, color: string, text: React.ReactNode) => (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      {text}
    </span>
  );

  return (
    <Card className="p-4 sm:p-6 bg-white dark:bg-surface border border-neutral-200/80 dark:border-white/5 rounded-3xl shadow-xs space-y-4">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
          <BarChart3 size={16} />
        </div>
        <div className="min-w-0">
          <h3 className="font-extrabold text-base sm:text-lg leading-tight text-neutral-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        </div>
      </div>

      {/* ── CONTROLS: period, and what the chart plots ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                selectedRange === r
                  ? "bg-primary-600 text-white shadow-xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Chart shows"
          className="flex items-center p-0.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-xs font-semibold ml-auto"
        >
          {(["return", "value"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => handleViewSelect(v)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                view === v
                  ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {v === "return" ? "Return %" : "Value ₹"}
            </button>
          ))}
        </div>
      </div>

      {/* ── YOUR PORTFOLIO vs THE SAME MONEY IN THE INDEX ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PORTFOLIO_COLOR }} />
              Your Portfolio
            </div>
            {view === "value" ? (
              <>
                <div className="mt-1.5 text-xl sm:text-2xl font-black tabular-nums text-neutral-900 dark:text-white truncate">
                  <PrivacyMask>{rupees(summary.portfolio_final_value)}</PrivacyMask>
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums">
                  <span className={tone(summary.portfolio_return_pct)}>{signed(summary.portfolio_return_pct)}</span>
                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap">{rangeLabel} return</span>
                </div>
              </>
            ) : (
              <>
                <div className={`mt-1.5 text-xl sm:text-2xl font-black tabular-nums ${tone(summary.portfolio_return_pct)}`}>
                  {signed(summary.portfolio_return_pct)}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{rangeLabel} return</div>
                <div className="mt-0.5 text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                  <PrivacyMask>{rupees(summary.portfolio_final_value)}</PrivacyMask>
                </div>
              </>
            )}
            <dl className="mt-2 pt-2 border-t border-emerald-500/15 space-y-0.5 text-[11px] tabular-nums">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500 dark:text-neutral-400">Gain</dt>
                <dd className={`font-bold ${tone(summary.portfolio_gain_amount)}`}>
                  <PrivacyMask>{signedRupees(summary.portfolio_gain_amount)}</PrivacyMask>
                </dd>
              </div>
              {showXirr && summary.portfolio_xirr !== null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">XIRR</dt>
                  <dd className={`font-bold ${tone(summary.portfolio_xirr)}`}>{signed(summary.portfolio_xirr)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 min-w-0">
            {/* The index name is the picker */}
            <label className="relative flex items-center justify-between gap-1 text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: benchmark.color }} />
                <span className="truncate">{benchmark.shortName}</span>
              </span>
              <ChevronsUpDown size={15} className="text-primary-500 dark:text-primary-400 shrink-0" />
              <select
                value={selectedBenchmark}
                onChange={(e) => handleBenchmarkSelect(e.target.value as BenchmarkKey)}
                className="absolute -inset-2 opacity-0 cursor-pointer"
                title="Switch benchmark index"
                aria-label="Benchmark index"
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
            </label>
            {benchmarkReturn !== null && benchmarkValue !== null ? (
              <>
                {view === "value" ? (
                  <>
                    <div className="mt-1.5 text-xl sm:text-2xl font-black tabular-nums text-neutral-900 dark:text-white truncate">
                      <PrivacyMask>{rupees(benchmarkValue)}</PrivacyMask>
                    </div>
                    <div className="mt-0.5 text-sm font-bold tabular-nums">
                      <span className={tone(benchmarkReturn)}>{signed(benchmarkReturn)}</span>
                      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap">{rangeLabel} return</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`mt-1.5 text-xl sm:text-2xl font-black tabular-nums ${tone(benchmarkReturn)}`}>
                      {signed(benchmarkReturn)}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{rangeLabel} return</div>
                    <div className="mt-0.5 text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                      <PrivacyMask>{rupees(benchmarkValue)}</PrivacyMask>
                    </div>
                  </>
                )}
                <dl className="mt-2 pt-2 border-t border-neutral-200/80 dark:border-white/10 space-y-0.5 text-[11px] tabular-nums">
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500 dark:text-neutral-400">Gain</dt>
                    <dd className={`font-bold ${tone(benchmarkReturn)}`}>
                      <PrivacyMask>
                        {signedRupees((benchmarkReturn * summary.base_value) / 100)}
                      </PrivacyMask>
                    </dd>
                  </div>
                  {showXirr && benchmarkXirr !== null && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-neutral-500 dark:text-neutral-400">XIRR</dt>
                      <dd className={`font-bold ${tone(benchmarkXirr)}`}>{signed(benchmarkXirr)}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                No {benchmark.name} price history for this period. Try a shorter range or another index.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── CHART ── */}
      <div className="w-full relative">
        {isLoading ? (
          <div className="h-72 w-full flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <span className="text-xs">Loading your investments and index history...</span>
          </div>
        ) : !summary || chartPoints.length === 0 ? (
          <div className="h-72 w-full flex items-center justify-center text-xs text-neutral-400 text-center px-6">
            No mutual fund or stock value history for this range yet
          </div>
        ) : (
          <div className="space-y-1">
            {/* Fixed readout above the chart, left aligned: legend → one date → two dates compared.
                It never floats over the lines. */}
            <div className="min-h-[60px] sm:min-h-[40px] flex items-center gap-2 text-xs tabular-nums">
              {picked ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 min-w-0">
                    <span className="font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                      {shortDate(picked.a.date)} – {shortDate(picked.b.date)}
                    </span>
                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                      {showPortfolio &&
                        pickedPortfolio &&
                        readoutValue(
                          "Portfolio",
                          PORTFOLIO_COLOR,
                          <span className={`font-bold ${tone(pickedPortfolio.amount)}`}>
                            <PrivacyMask>{signedRupees(pickedPortfolio.amount)}</PrivacyMask> ({signed(pickedPortfolio.pct)})
                          </span>
                        )}
                      {showBenchmark &&
                        pickedBenchmark &&
                        readoutValue(
                          benchmark.name,
                          benchmark.color,
                          <span className={`font-bold ${tone(pickedBenchmark.amount)}`}>
                            <PrivacyMask>{signedRupees(pickedBenchmark.amount)}</PrivacyMask> ({signed(pickedBenchmark.pct)})
                          </span>
                        )}
                    </div>
                  </div>
                  {clearButton}
                </>
              ) : hovered ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 min-w-0">
                    <span className="font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                      {shortDate(hovered.date)}
                      {pinIndex !== null && (
                        <span className="ml-2 font-medium text-primary-600 dark:text-primary-400">
                          Now pick a second date
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                      {showPortfolio &&
                        readoutValue("Portfolio", PORTFOLIO_COLOR, figure(hovered.portfolio_pct, hovered.portfolio))}
                      {showBenchmark &&
                        hovered[`${selectedBenchmark}_pct`] !== null &&
                        readoutValue(
                          benchmark.name,
                          benchmark.color,
                          figure(hovered[`${selectedBenchmark}_pct`] ?? 0, hovered[selectedBenchmark] ?? 0)
                        )}
                    </div>
                  </div>
                  {pinIndex !== null && clearButton}
                </>
              ) : (
                <div className="flex items-center gap-1 -ml-2">
                  {legendChip("Your Portfolio", PORTFOLIO_COLOR, showPortfolio, () => setShowPortfolio((v) => !v), showPortfolio && !showBenchmark)}
                  {benchmarkReturn !== null &&
                    legendChip(benchmark.name, benchmark.color, showBenchmark, () => setShowBenchmark((v) => !v), showBenchmark && !showPortfolio)}
                </div>
              )}
            </div>

            <TradingViewBenchmarkChart
              points={chartPoints}
              unit={view === "value" ? "rupees" : "percent"}
              benchmarkColor={benchmark.color}
              showPortfolio={showPortfolio}
              showBenchmark={showBenchmark}
              isDark={resolvedTheme === "dark"}
              height={300}
              onHoverIndex={handleHover}
              onSelectRange={handleSelect}
              onPinIndex={handlePin}
              actionsRef={chartActions}
              selectionPositive={(pickedPortfolio?.amount ?? 0) >= 0}
            />
          </div>
        )}
      </div>

      {/* ── HOW TO READ IT ── */}
      {summary && (
        <details className="pt-3 border-t border-neutral-100 dark:border-white/5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          <summary className="cursor-pointer font-semibold select-none py-1">How is this calculated?</summary>
          <p className="mt-1">
            Return = gain ÷ (value on {shortDate(summary.start_date)} + money you added since). The{" "}
            {benchmark.name} figures put the same money into the index on the same dates, so the
            returns and the rupee values of both are directly comparable.
            {summary.includes_stocks && " Stocks are counted at cost before their first daily price snapshot."}
          </p>
        </details>
      )}
    </Card>
  );
}
