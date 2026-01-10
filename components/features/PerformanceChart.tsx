"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import { useHaptic } from "@/lib/hooks/useHaptic";

interface PerformanceChartProps {
  data?: { date: string; value: number }[];
}

const ranges = ["1M", "6M", "1Y", "ALL"];

export default function PerformanceChart({
  data: propData,
}: PerformanceChartProps) {
  const [range, setRange] = useState("ALL");
  const { light } = useHaptic();

  // If no data provided (e.g. loading), use empty array
  const sourceData = useMemo(() => {
    if (!propData) return [];
    // Transform formatting if needed. Assuming API returns { date: "YYYY-MM-DD", value: 123 }
    // We might want to format date for display
    return propData.map((d) => ({
      ...d,
      // Format date like "Jan 01"
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

  const chartData = useMemo(() => {
    if (!sourceData.length) return [];
    if (range === "ALL") return sourceData;

    // Filter based on range
    const now = new Date();
    let cutoff = new Date();
    if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
    if (range === "6M") cutoff.setMonth(now.getMonth() - 6);
    if (range === "1Y") cutoff.setFullYear(now.getFullYear() - 1);

    return sourceData.filter((d) => new Date(d.date) >= cutoff);
  }, [sourceData, range]);

  if (!propData) {
    // Loading State
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
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Portfolio Growth
        </h3>
        <div className="flex bg-neutral-100 dark:bg-white/5 rounded-lg p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                range === r
                  ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
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
            <YAxis hide={true} domain={["dataMin - 1000", "dataMax + 1000"]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1F2B",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: any) => [
                `₹${(Number(value) || 0).toLocaleString()}`,
                "Value",
              ]}
              labelStyle={{ color: "#9CA3AF", marginBottom: "0.5rem" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
