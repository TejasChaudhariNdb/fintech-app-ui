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
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

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

const ranges = ["1W", "1M", "6M", "1Y", "ALL"] as const;

export default function StockJourneyChart({
  data,
  coverageStart,
  coveredStocks = 0,
  onRangeChange,
  selectedRange = "6M",
  isRefetching = false,
}: StockJourneyChartProps) {
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

  const selected = activePoint || chartData[chartData.length - 1] || null;
  const gain = (selected?.value || 0) - (selected?.invested || 0);
  const gainPct =
    (selected?.invested || 0) > 0
      ? (gain / (selected?.invested || 1)) * 100
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
          <div className="flex bg-neutral-100 dark:bg-white/5 rounded-lg p-1 mb-4">
            {ranges.map((item) => (
              <button
                key={item}
                onClick={() => onRangeChange?.(item)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedRange === item
                    ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
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
    <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Investment History
            </h3>
          </div>
          <div className="flex bg-neutral-100 dark:bg-white/5 rounded-lg p-1 shrink-0">
            {ranges.map((item) => (
              <button
                key={item}
                onClick={() => onRangeChange?.(item)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedRange === item
                    ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Historical value vs invested amount across your stock portfolio.
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/5">
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {selected
                ? new Date(selected.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Latest"}
            </p>
            <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">
              ₹{Math.round(selected?.value || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex gap-5 text-sm">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Invested</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                ₹{Math.round(selected?.invested || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Gain</p>
              <p
                className={`font-semibold ${
                  gain >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                {gain >= 0 ? "+" : ""}₹
                {Math.round(Math.abs(gain)).toLocaleString("en-IN")} (
                {gainPct.toFixed(2)}%)
              </p>
            </div>
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
      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
        <button
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-surface disabled:opacity-30 transition-colors">
          <ZoomOut size={14} />
          Zoom Out
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-surface transition-colors">
          <RotateCcw size={14} />
          Reset
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
                <linearGradient
                  id="stockJourneyValue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#stockJourneyValue)"
              />
              {selected ? (
                <ReferenceLine
                  y={selected.value}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  label={{
                    position: "right",
                    value:
                      selected.value >= 10000000
                        ? `${(selected.value / 10000000).toFixed(1)}Cr`
                        : selected.value >= 100000
                          ? `${(selected.value / 100000).toFixed(1)}L`
                          : `${Math.round(selected.value)}`,
                    fill: "#10B981",
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
