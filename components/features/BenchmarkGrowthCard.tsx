"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Card from "@/components/ui/Card";
import { useProfile } from "@/context/ProfileContext";
import { api } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Zap,
} from "lucide-react";

interface BenchmarkSummary {
  portfolio_return_pct: number;
  nifty50_return_pct: number;
  nifty500_return_pct: number;
  alpha_vs_nifty50: number;
  alpha_vs_nifty500: number;
  is_outperforming: boolean;
  portfolio_final_value: number;
  nifty50_final_value: number;
  nifty500_final_value: number;
  total_invested: number;
  total_current_value: number;
}

interface BenchmarkSeriesPoint {
  date: string;
  portfolio: number;
  nifty50: number;
  nifty500: number;
  portfolio_pct: number;
  nifty50_pct: number;
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
] as const;

export default function BenchmarkGrowthCard({
  title = "Performance vs Market Benchmarks",
  subtitle = "Cumulative return comparison against Nifty 50 & Nifty 500",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { activeProfileId } = useProfile();
  const [selectedRange, setSelectedRange] = useState<string>("1Y");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<BenchmarkGrowthResponse | null>(null);

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

  const chartData = useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((pt) => ({
      ...pt,
      formattedDate: new Date(pt.date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: selectedRange === "3Y" || selectedRange === "5Y" ? "2-digit" : undefined,
      }),
    }));
  }, [data, selectedRange]);

  const summary = data?.summary;
  const isOutperforming = summary ? summary.alpha_vs_nifty50 >= 0 : false;

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
        <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {RANGES.map((r) => {
            const isSelected = selectedRange === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRange(r.value)}
                className={`px-3 py-1 rounded-lg transition-all ${
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
                    ? `Generating +${summary.alpha_vs_nifty50.toFixed(1)}% Alpha vs Nifty 50`
                    : `Trailing Nifty 50 by ${summary.alpha_vs_nifty50.toFixed(1)}%`}
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
                  ? `Your portfolio delivered ${(
                      summary.portfolio_return_pct - summary.nifty50_return_pct
                    ).toFixed(1)}% extra return above Nifty 50 over this ${selectedRange} window.`
                  : `Nifty 50 returned ${summary.nifty50_return_pct.toFixed(
                      1
                    )}% while your portfolio returned ${summary.portfolio_return_pct.toFixed(1)}%.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 sm:border-l sm:border-neutral-200 dark:sm:border-white/10 sm:pl-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Alpha vs Nifty 500
              </span>
              <div
                className={`font-black text-sm sm:text-base ${
                  summary.alpha_vs_nifty500 >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {summary.alpha_vs_nifty500 >= 0 ? "+" : ""}
                {summary.alpha_vs_nifty500.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── METRIC STRIP / LEGEND ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Portfolio Metric */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                My Portfolio
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">Return</span>
            </div>
            <div className="flex items-baseline justify-between pt-0.5">
              <span
                className={`text-lg sm:text-xl font-black ${
                  summary.portfolio_return_pct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.portfolio_return_pct >= 0 ? "+" : ""}
                {summary.portfolio_return_pct.toFixed(2)}%
              </span>
              {summary.total_current_value > 0 && (
                <span className="text-xs text-neutral-500 font-medium">
                  ₹{Math.round(summary.total_current_value).toLocaleString("en-IN")} Value
                </span>
              )}
            </div>
          </div>

          {/* Nifty 50 Metric */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                Nifty 50
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">Index Return</span>
            </div>
            <div className="flex items-baseline justify-between pt-0.5">
              <span
                className={`text-lg sm:text-xl font-black ${
                  summary.nifty50_return_pct >= 0
                    ? "text-neutral-900 dark:text-white"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.nifty50_return_pct >= 0 ? "+" : ""}
                {summary.nifty50_return_pct.toFixed(2)}%
              </span>
              <span
                className={`text-xs font-semibold ${
                  summary.alpha_vs_nifty50 >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {summary.alpha_vs_nifty50 >= 0 ? "+" : ""}
                {summary.alpha_vs_nifty50.toFixed(1)}% Spread
              </span>
            </div>
          </div>

          {/* Nifty 500 Metric */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                Nifty 500
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">Broad Market</span>
            </div>
            <div className="flex items-baseline justify-between pt-0.5">
              <span
                className={`text-lg sm:text-xl font-black ${
                  summary.nifty500_return_pct >= 0
                    ? "text-neutral-900 dark:text-white"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.nifty500_return_pct >= 0 ? "+" : ""}
                {summary.nifty500_return_pct.toFixed(2)}%
              </span>
              <span
                className={`text-xs font-semibold ${
                  summary.alpha_vs_nifty500 >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {summary.alpha_vs_nifty500 >= 0 ? "+" : ""}
                {summary.alpha_vs_nifty500.toFixed(1)}% Spread
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── CHART ── */}
      <div className="h-64 sm:h-80 w-full relative">
        {isLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <span className="text-xs">Fetching benchmark index histories...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-neutral-400">
            No historical benchmark data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-neutral-200 dark:text-white/[0.05]"
              />
              <XAxis
                dataKey="formattedDate"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#888888" }}
                dy={8}
                minTickGap={25}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#888888" }}
                domain={["auto", "auto"]}
                tickFormatter={(val) => `${val >= 0 ? "+" : ""}${val.toFixed(0)}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as BenchmarkSeriesPoint & { formattedDate: string };
                  const pVal = `${item.portfolio_pct >= 0 ? "+" : ""}${item.portfolio_pct.toFixed(2)}%`;
                  const n50Val = `${item.nifty50_pct >= 0 ? "+" : ""}${item.nifty50_pct.toFixed(2)}%`;
                  const n500Val = `${item.nifty500_pct >= 0 ? "+" : ""}${item.nifty500_pct.toFixed(2)}%`;
                  const deltaAlpha = (item.portfolio_pct - item.nifty50_pct).toFixed(2);

                  return (
                    <div className="bg-white/95 dark:bg-[#151922]/95 backdrop-blur-md border border-neutral-200 dark:border-white/10 rounded-2xl p-3 shadow-xl text-xs space-y-2 min-w-[210px]">
                      <div className="font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-white/10 pb-1 flex justify-between items-center">
                        <span>{item.formattedDate}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${Number(deltaAlpha) >= 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                          {Number(deltaAlpha) >= 0 ? "+" : ""}{deltaAlpha}% Alpha
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            My Portfolio:
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {pVal}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-400">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            Nifty 50:
                          </span>
                          <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                            {n50Val}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-400">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Nifty 500:
                          </span>
                          <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                            {n500Val}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="portfolio_pct"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#portfolioGradient)"
                name="My Portfolio"
              />
              <Line
                type="monotone"
                dataKey="nifty50_pct"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
                name="Nifty 50"
              />
              <Line
                type="monotone"
                dataKey="nifty500_pct"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="2 2"
                name="Nifty 500"
              />
            </AreaChart>
          </ResponsiveContainer>
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
