"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Card from "@/components/ui/Card";
import { useHaptic } from "@/lib/hooks/useHaptic";

interface PerformanceChartProps {
  data?: PerfPoint[];
  investedAmount?: number;
  mfInvested?: number;
  stockInvested?: number;
}

type PerfPoint = {
  date: string;
  value: number;
  invested?: number;
  mf?: number;
  mf_invested?: number;
  equity?: number;
  equity_invested?: number;
  displayDate?: string;
};

type ChartEventState = {
  activePayload?: Array<{
    payload: PerfPoint;
  }>;
};

const ranges = ["1M", "6M", "1Y", "ALL"];

export default function PerformanceChart({
  data: propData,
  investedAmount,
  mfInvested,
  stockInvested,
}: PerformanceChartProps) {
  console.log("PerformanceChart Props:", {
    investedAmount,
    mfInvested,
    stockInvested,
  });
  const [range, setRange] = useState("ALL");
  const [assetType, setAssetType] = useState("ALL"); // ALL, MF, STOCK
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [activePoint, setActivePoint] = useState<PerfPoint | null>(null);
  const { light } = useHaptic();

  // Determine active data key based on asset type
  const activeDataKey = useMemo(() => {
    switch (assetType) {
      case "MF":
        return "mf";
      case "STOCK":
        return "equity";
      case "ALL":
      default:
        return "value";
    }
  }, [assetType]);

  const activeInvestedKey = useMemo(() => {
    switch (assetType) {
      case "MF":
        return "mf_invested";
      case "STOCK":
        return "equity_invested";
      case "ALL":
      default:
        return "invested";
    }
  }, [assetType]);

  // Calculate current Reference Line value based on asset type
  const activeReferenceValue = useMemo(() => {
    switch (assetType) {
      case "MF":
        return mfInvested;
      case "STOCK":
        return stockInvested;
      case "ALL":
      default:
        return investedAmount;
    }
  }, [assetType, investedAmount, mfInvested, stockInvested]);

  // If no data provided (e.g. loading), use empty array
  const sourceData = useMemo(() => {
    if (!propData) return [];

    return propData.map((d) => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [propData]);

  const handleRangeChange = (r: string) => {
    light();
    setRange(r);
  };

  const handleAssetChange = (type: string) => {
    light();
    setAssetType(type);
  };

  // Helper to format large numbers
  const formatValue = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  };

  const chartData = useMemo(() => {
    if (!sourceData.length) return [];
    if (range === "ALL") return sourceData;

    const now = new Date();
    const cutoff = new Date();
    if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
    if (range === "6M") cutoff.setMonth(now.getMonth() - 6);
    if (range === "1Y") cutoff.setFullYear(now.getFullYear() - 1);

    return sourceData.filter((d) => new Date(d.date) >= cutoff);
  }, [sourceData, range]);

  // Calculate dynamic domain with buffer
  const yDomain = useMemo(() => {
    if (!chartData.length) return ["auto", "auto"];

    // Extract values for the currently visible series
    const values = chartData.flatMap((d) => [
      Number(d[activeDataKey] || 0),
      Number(d[activeInvestedKey] || 0),
    ]);

    // Include the reference line value in the domain calculation
    if (activeReferenceValue && activeReferenceValue > 0) {
      values.push(activeReferenceValue);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const rangeVal = max - min;

    // Add small initial buffer (5%)
    const paddedMin = min - rangeVal * 0.05;
    const paddedMax = max + rangeVal * 0.05;

    // Calculate "nice" range steps
    const roughTickCount = 5;
    const roughRange = paddedMax - paddedMin;
    if (roughRange === 0) return [min * 0.9, max * 1.1]; // Fallback for flat line

    const rawInterval = roughRange / roughTickCount;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalizedInterval = rawInterval / magnitude;

    let interval;
    if (normalizedInterval <= 1) interval = 1 * magnitude;
    else if (normalizedInterval <= 2) interval = 2 * magnitude;
    else if (normalizedInterval <= 5) interval = 5 * magnitude;
    else interval = 10 * magnitude;

    // Calculate nice bounds
    const niceMin = Math.floor(paddedMin / interval) * interval;
    const niceMax = Math.ceil(paddedMax / interval) * interval;

    // Ensure we don't go below 0 unless data has negatives
    const finalMin = min >= 0 && niceMin < 0 ? 0 : niceMin;

    return [finalMin, niceMax];
  }, [chartData, activeDataKey, activeInvestedKey, activeReferenceValue]);

  const selectedPoint = activePoint || chartData[chartData.length - 1] || null;
  const selectedValue = Number(selectedPoint?.[activeDataKey] || 0);
  const selectedInvested = Number(selectedPoint?.[activeInvestedKey] || 0);
  const selectedGain = selectedValue - selectedInvested;
  const selectedGainPct =
    selectedInvested > 0 ? (selectedGain / selectedInvested) * 100 : 0;

  if (!propData) {
    return (
      <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none mb-6 h-[300px] flex items-center justify-center">
        <div className="text-neutral-400 text-sm animate-pulse">
          Loading Chart...
        </div>
      </Card>
    );
  }

  if (propData.length === 0) {
    return (
      <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none mb-6 h-[300px] flex items-center justify-center flex-col gap-2">
        <div className="text-neutral-400 text-sm">
          Not enough data for chart
        </div>
        <p className="text-xs text-neutral-500">
          Refresh portfolio to generate history.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none mb-6">
      <div className="flex flex-col gap-4 mb-6">
        {/* Top Row: Title and Time Range Selector */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Portfolio Growth
          </h3>

          <div className="flex bg-neutral-100 dark:bg-white/5 rounded-lg p-1">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  range === r
                    ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Row: Asset Type Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => handleAssetChange("ALL")}
            className={`text-xs font-medium transition-colors ${
              assetType === "ALL"
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}>
            All Assets
          </button>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <button
            onClick={() => handleAssetChange("MF")}
            className={`text-xs font-medium transition-colors ${
              assetType === "MF"
                ? "text-blue-600 dark:text-blue-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}>
            Mutual Funds
          </button>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <button
            onClick={() => handleAssetChange("STOCK")}
            className={`text-xs font-medium transition-colors ${
              assetType === "STOCK"
                ? "text-green-600 dark:text-green-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}>
            Stocks
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/5">
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {selectedPoint?.displayDate || "Latest"}
            </p>
            <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">
              ₹{selectedValue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex gap-5 text-sm">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Invested</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                ₹{selectedInvested.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Gain</p>
              <p
                className={`font-semibold ${
                  selectedGain >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                {selectedGain >= 0 ? "+" : ""}₹
                {Math.abs(selectedGain).toLocaleString("en-IN")} ({selectedGainPct.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onMouseMove={(e: ChartEventState) => {
              if (e.activePayload && e.activePayload.length) {
                setHoveredValue(e.activePayload[0].payload[activeDataKey]);
                setActivePoint(e.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => {
              setHoveredValue(null);
              setActivePoint(null);
            }}
            onTouchStart={(e: ChartEventState) => {
              if (e.activePayload && e.activePayload.length) {
                setHoveredValue(e.activePayload[0].payload[activeDataKey]);
                setActivePoint(e.activePayload[0].payload);
              }
            }}
            onTouchMove={(e: ChartEventState) => {
              if (e.activePayload && e.activePayload.length) {
                setHoveredValue(e.activePayload[0].payload[activeDataKey]);
                setActivePoint(e.activePayload[0].payload);
              }
            }}
            onTouchEnd={() => {
              setHoveredValue(null);
              setActivePoint(null);
            }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
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
              minTickGap={30}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              padding={{ bottom: 20 }}
              width={50}
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              tickFormatter={(value) => {
                if (value >= 10000000)
                  return `${(value / 10000000).toFixed(1)}Cr`;
                if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                return value;
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#9CA3AF" }}
              contentStyle={{
                backgroundColor: "#1A1F2B",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: number | string, name: string) => {
                let label = "Total Value";
                if (name === "mf") label = "Mutual Funds";
                if (name === "equity") label = "Stocks";
                if (name === "invested") label = "Invested";
                if (name === "mf_invested") label = "MF Invested";
                if (name === "equity_invested") label = "Stock Invested";
                return [`₹${(Number(value) || 0).toLocaleString()}`, label];
              }}
              labelStyle={{ color: "#9CA3AF", marginBottom: "0.5rem" }}
            />

            <Line
              type="monotone"
              dataKey={activeInvestedKey}
              name={activeInvestedKey}
              stroke="#94A3B8"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
              animationDuration={500}
            />

            {/* 1. TOTAL VALUE (Purple) - Show only if ALL is selected */}
            {assetType === "ALL" && (
              <Area
                type="monotone"
                dataKey="value"
                name="value"
                stroke="#6366F1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                animationDuration={500}
              />
            )}

            {/* 2. MUTUAL FUNDS (Blue) - Show if MF is selected */}
            {assetType === "MF" && (
              <Area
                type="monotone"
                dataKey="mf"
                name="mf"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMf)"
                animationDuration={500}
              />
            )}

            {/* 3. STOCKS (Green) - Show if STOCK is selected */}
            {assetType === "STOCK" && (
              <Area
                type="monotone"
                dataKey="equity"
                name="equity"
                stroke="#22C55E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorStock)"
                animationDuration={500}
              />
            )}

            {/* Reference Line for Invested Amount (Anchor) */}
            {activeReferenceValue && activeReferenceValue > 0 && (
              <ReferenceLine
                y={activeReferenceValue}
                label={{
                  position: "insideBottomRight",
                  value: "Invested",
                  fill: "#6B7280",
                  fontSize: 10,
                }}
                stroke="#9CA3AF"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            )}

            {/* TradingView-style: Current Value Indicator (Permanent) */}
            {chartData.length > 0 && (
              <ReferenceLine
                y={Number(chartData[chartData.length - 1][activeDataKey] || 0)}
                stroke={
                  assetType === "MF"
                    ? "#3B82F6"
                    : assetType === "STOCK"
                    ? "#22C55E"
                    : "#6366F1"
                }
                strokeDasharray="3 3"
                label={{
                  position: "right",
                  value: formatValue(
                    Number(chartData[chartData.length - 1][activeDataKey] || 0)
                  ),
                  fill:
                    assetType === "MF"
                      ? "#3B82F6"
                      : assetType === "STOCK"
                      ? "#22C55E"
                      : "#6366F1",
                  fontSize: 11,
                  fontWeight: "bold",
                  dy: -10,
                }}
              />
            )}

            {/* Crosshair Horizontal Line */}
            {hoveredValue !== null && (
              <ReferenceLine
                y={hoveredValue}
                stroke="#9CA3AF"
                strokeDasharray="3 3"
                label={{
                  position: "right",
                  value: formatValue(hoveredValue),
                  fill: "#9CA3AF",
                  fontSize: 11,
                  dy: 10,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
