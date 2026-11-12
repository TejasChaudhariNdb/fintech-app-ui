"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Card from "../ui/Card";

// BUG-038: mutual fund XIRR at each month end (from /portfolio/xirr-timeseries).
export interface XirrPoint {
  date: string;
  xirr_pct: number;
}

interface Props {
  points: XirrPoint[];
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

export default function MfXirrChart({ points }: Props) {
  if (!points || points.length < 2) return null;

  const latest = points[points.length - 1];

  return (
    <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">XIRR over time (current holdings)</h3>
        <span className={`text-xs font-bold ${latest.xirr_pct >= 0 ? "text-green-500" : "text-red-500"}`}>
          Now {latest.xirr_pct.toFixed(2)}%
        </span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={48} />
            <Tooltip
              labelFormatter={(label) => new Date(String(label)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "XIRR"]}
            />
            <Line type="monotone" dataKey="xirr_pct" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-neutral-400 mt-2">
        Funds you still hold. Starts one year after your first investment, because early annualised figures swing widely. Month-end XIRR using the cash flows up to each date and the portfolio value on that date. The last point matches the XIRR on the summary card. Indicative.
      </p>
    </Card>
  );
}
