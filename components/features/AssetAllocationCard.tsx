"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../ui/Card";

interface AssetAllocationCardProps {
  data: {
    category: string;
    value: number;
    percentage: number;
  }[];
}

const COLORS = {
  Equity: "#8B5CF6", // Violet-500
  Debt: "#3B82F6", // Blue-500
  Gold: "#F59E0B", // Amber-500
  Hybrid: "#10B981", // Emerald-500
  Other: "#9CA3AF", // Gray-400
};

export default function AssetAllocationCard({
  data,
}: AssetAllocationCardProps) {
  // Filter out zero values and prepare chart data
  const chartData = data
    .filter((d) => d.value > 0)
    .map((d) => ({
      ...d,
      fill: COLORS[d.category as keyof typeof COLORS] || COLORS.Other,
    }));

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none h-full">
      <h3 className="text-lg font-semibold mb-6 text-neutral-900 dark:text-white">
        Asset Allocation
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="h-[200px] w-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1A1F2B",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-neutral-500 font-medium">Total</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {/* Just a decorative center, or could show count */}
              Assets
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-4 w-full">
          {chartData.map((item) => (
            <div key={item.category} className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {item.category}
                </span>
              </div>
              <div className="flex justify-between md:block pl-5">
                <span className="text-sm font-semibold block text-neutral-900 dark:text-white">
                  {item.percentage}%
                </span>
                <span className="text-xs text-neutral-500 block">
                  ₹{item.value.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
