"use client";

import { useMemo, useState, useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/ui/Card";
import { ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";

type JourneyPoint = {
  date: string;
  invested: number;
  value: number;
};

interface MutualFundJourneyChartProps {
  data?: JourneyPoint[];
  coverageStart?: string | null;
  coveredSchemes?: number;
  onRangeChange?: (range: string) => void;
  selectedRange?: string;
  isRefetching?: boolean;
}

const ranges = ["1W", "1M", "6M", "1Y", "3Y", "5Y", "10Y", "ALL"] as const;

export default function MutualFundJourneyChart({
  data,
  coverageStart,
  coveredSchemes = 0,
  onRangeChange,
  selectedRange = "6M",
  isRefetching = false,
}: MutualFundJourneyChartProps) {
  const [activePoint, setActivePoint] = useState<JourneyPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startTranslateX, setStartTranslateX] = useState(0);

  const sourceData = useMemo(() => {
    return (data || []).map((point) => ({
      ...point,
      displayDate: new Date(point.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      }),
    }));
  }, [data]);

  const chartData = sourceData;

  const handleReset = () => {
    setScale(1);
    setTranslateX(0);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.25, 1);
      if (newScale === 1) setTranslateX(0);
      return newScale;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setStartX(dist);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setStartX(e.touches[0].clientX);
      setStartTranslateX(translateX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const delta = dist - startX;
      if (delta > 20) {
        handleZoomIn();
        setStartX(dist);
      } else if (delta < -20) {
        handleZoomOut();
        setStartX(dist);
      }
    } else if (e.touches.length === 1 && isDragging) {
      const currentX = e.touches[0].clientX;
      const delta = currentX - startX;
      const maxTranslate =
        (containerRef.current?.scrollWidth || 0) -
        (containerRef.current?.clientWidth || 0);
      const newTranslate = Math.max(
        -maxTranslate,
        Math.min(0, startTranslateX + delta),
      );
      setTranslateX(newTranslate);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setStartTranslateX(translateX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    const maxTranslate =
      (containerRef.current?.scrollWidth || 0) -
      (containerRef.current?.clientWidth || 0);
    const newTranslate = Math.max(
      -maxTranslate,
      Math.min(0, startTranslateX + delta),
    );
    setTranslateX(newTranslate);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
          {isRefetching ? (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Loader2 size={26} className="animate-spin text-primary-500" />
              <p className="text-sm font-medium">Loading investment history...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Investment history is not available for this range.
              </p>
              <p className="text-xs text-neutral-400">
                Try a longer time range or ensure you have uploaded transactions.
              </p>
            </>
          )}
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
              Historical value vs invested amount across your portfolio.
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
            {coveredSchemes} schemes covered
          </span>
          <span className="text-neutral-400">
            Scroll to pan • Pinch to zoom • Ctrl+scroll to zoom
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-surface transition-colors">
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-surface disabled:opacity-30 transition-colors">
          <ZoomOut size={14} />
          Zoom Out
        </button>

        <button
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-surface disabled:opacity-30 transition-colors">
          Zoom In
          <ZoomIn size={14} />
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-[300px] overflow-hidden select-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}>
        <div
          className="h-full"
          style={{
            width: `${scale * 100}%`,
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              onMouseMove={(state: any) => {
                const payload = state.activePayload?.[0]?.payload as
                  | JourneyPoint
                  | undefined;
                if (payload) setActivePoint(payload);
              }}
              onMouseLeave={() => setActivePoint(null)}>
              <defs>
                <linearGradient id="mfJourneyValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
                className="dark:stroke-white/5"
              />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={56}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                tickFormatter={(value: any) => {
                  if (value >= 10000000)
                    return `${(value / 10000000).toFixed(1)}Cr`;
                  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return `${value}`;
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#9CA3AF" }}
                contentStyle={{
                  backgroundColor: "#1A1F2B",
                  border: "none",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(value: any, name: any) => [
                  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`,
                  name === "invested" ? "Invested" : "Value",
                ]}
                labelStyle={{ color: "#9CA3AF", marginBottom: "0.5rem" }}
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="#94A3B8"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563EB"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#mfJourneyValue)"
              />
              {selected ? (
                <ReferenceLine
                  y={selected.value}
                  stroke="#2563EB"
                  strokeDasharray="3 3"
                  label={{
                    position: "right",
                    value:
                      selected.value >= 10000000
                        ? `${(selected.value / 10000000).toFixed(1)}Cr`
                        : selected.value >= 100000
                          ? `${(selected.value / 100000).toFixed(1)}L`
                          : `${Math.round(selected.value)}`,
                    fill: "#2563EB",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
