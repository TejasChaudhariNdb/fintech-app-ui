import React from "react";
import Card from "../ui/Card";

interface SchemeCardProps {
  schemeId: number;
  scheme: string;
  amc: string;
  current: number;
  returnPct: number;
  onClick?: () => void;
}

export default function SchemeCard({
  scheme,
  amc,
  current,
  returnPct,
  onClick,
}: SchemeCardProps) {
  const isPositive = returnPct >= 0;

  return (
    <Card
      className="p-4 bg-surface border border-neutral-200 dark:border-white/5 hover:bg-surface-highlight transition-colors"
      onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-3">
          <h4 className="font-medium mb-1 line-clamp-2 text-neutral-900 dark:text-white">
            {scheme}
          </h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {amc}
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-neutral-900 dark:text-white">
            ₹{current.toLocaleString("en-IN")}
          </p>
          <p
            className={`text-sm font-medium ${
              isPositive
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            }`}>
            {isPositive ? "+" : ""}
            {returnPct.toFixed(2)}%
          </p>
        </div>
      </div>
    </Card>
  );
}
