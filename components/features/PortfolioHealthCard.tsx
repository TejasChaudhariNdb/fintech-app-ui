"use client";

import React from "react";
import Card from "../ui/Card";
import { Activity, Shield, PieChart } from "lucide-react";

interface PortfolioHealthCardProps {
  score?: number; // 0-100
  diversificationScore?: number; // 0-100
  riskScore?: number; // 0-100
}

export default function PortfolioHealthCard({
  score = 84,
  diversificationScore = 78,
  riskScore = 45,
}: PortfolioHealthCardProps) {
  const getScoreStatus = (val: number) => {
    if (val >= 80)
      return {
        label: "Excellent",
        color: "text-emerald-500",
        bar: "bg-emerald-500",
      };
    if (val >= 60)
      return { label: "Good", color: "text-amber-500", bar: "bg-amber-500" };
    return { label: "Needs Work", color: "text-red-500", bar: "bg-red-500" };
  };

  const getRiskStatus = (val: number) => {
    if (val <= 40)
      return { label: "Low", color: "text-emerald-500", bar: "bg-emerald-500" };
    if (val <= 70)
      return {
        label: "Moderate",
        color: "text-amber-500",
        bar: "bg-amber-500",
      };
    return { label: "High", color: "text-red-500", bar: "bg-red-500" };
  };

  const health = getScoreStatus(score);
  const diversification = getScoreStatus(diversificationScore);
  const risk = getRiskStatus(riskScore);

  return (
    <Card className="p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none" />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Portfolio Health Score
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Based on asset allocation and historical volatility
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-8">
        {/* Main Score Circular display */}
        <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100">
            <circle
              className="text-neutral-100 dark:text-white/5"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className={`${health.color} drop-shadow-md`}
              strokeWidth="10"
              strokeDasharray={`${score * 2.51} 251.2`} /* 2 * PI * 40 = 251.2 */
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
              style={{
                transition: "stroke-dasharray 1s ease-out",
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-neutral-900 dark:text-white leading-none">
              {score}
            </span>
            <span
              className={`text-[10px] uppercase font-bold mt-1 ${health.color}`}>
              {health.label}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Your portfolio is in{" "}
            <span className={`font-semibold ${health.color}`}>
              {health.label.toLowerCase()}
            </span>{" "}
            shape. Maintain your current SIPs to preserve this balance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Diversification Score */}
        <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
          <div className="flex flex-row justify-between items-start gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <PieChart className="h-4 w-4 shrink-0" />
              <span className="font-medium text-sm whitespace-nowrap">
                Diversification
              </span>
            </div>
            <div
              className={`text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-200/50 dark:bg-white/10 ${diversification.color}`}>
              {diversificationScore}/100
            </div>
          </div>
          <div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 mb-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${diversification.bar}`}
                style={{ width: `${diversificationScore}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Asset spread looks{" "}
              <span className={diversification.color}>
                {diversification.label.toLowerCase()}
              </span>
              .
            </p>
          </div>
        </div>

        {/* Risk Score */}
        <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
          <div className="flex flex-row justify-between items-start gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <Shield className="h-4 w-4 shrink-0" />
              <span className="font-medium text-sm whitespace-nowrap">
                Risk Score
              </span>
            </div>
            <div
              className={`text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-200/50 dark:bg-white/10 ${risk.color}`}>
              {riskScore}/100
            </div>
          </div>
          <div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 mb-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${risk.bar}`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Volatility exposure is{" "}
              <span className={risk.color}>{risk.label.toLowerCase()}</span>.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
