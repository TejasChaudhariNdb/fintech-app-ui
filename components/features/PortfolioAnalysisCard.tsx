"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Card from "../ui/Card";
import { api } from "@/lib/api";

type DataType = "stocks" | "sectors" | "market_cap";

// Custom Tooltip moved outside
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-[#1A1F2B] text-white text-xs p-2 rounded-lg shadow-xl border border-white/10">
        <p className="font-semibold">{d.name}</p>
        <p>₹{d.value.toLocaleString("en-IN")}</p>
        <p className="text-neutral-400">{d.percentage}%</p>
      </div>
    );
  }
  return null;
};

export default function PortfolioAnalysisCard() {
  const [activeTab, setActiveTab] = useState<DataType>("stocks");
  const [data, setData] = useState<any>(null);
  const [totalStocks, setTotalStocks] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getEquityAllocation();
        setData(res);
        if (res.stocks) {
          setTotalStocks(res.stocks.length);
        }
      } catch (err) {
        console.error("Failed to load allocation", err);
      }
    };
    fetchData();
  }, []);

  if (!data) return null;

  const currentData = data[activeTab] || [];

  return (
    <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-6">
        {/* Header & Tabs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white border-l-4 border-primary-500 pl-3">
              Portfolio Analysis
            </h3>
          </div>

          <div className="flex gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-xl w-fit">
            {(["stocks", "market_cap", "sectors"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}>
                {tab === "market_cap"
                  ? "Market Cap"
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Banner */}
        {activeTab === "stocks" && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 text-center py-2 rounded-lg text-sm font-medium">
            Total number of stocks - {totalStocks}
          </div>
        )}

        {/* Chart Content */}
        {currentData.length > 0 ? (
          <div className="relative flex flex-col items-center">
            <div className="h-[250px] w-full max-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none">
                    {currentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend List */}
            <div className="w-full mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
              {currentData.map((item: any) => (
                <div
                  key={item.name}
                  className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}></span>
                    <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[100px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-neutral-900 dark:text-white font-medium">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-neutral-400">
            No data available for {activeTab}
          </div>
        )}

        {/* Key Insights */}
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/5 space-y-2">
          <h4 className="text-primary-500 font-medium text-sm">
            Key Insights:
          </h4>
          <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 list-disc pl-4">
            {insights.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
            {insights.length === 0 && <li>No insights available yet.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}
