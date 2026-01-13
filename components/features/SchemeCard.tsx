"use client";

import { Share2 } from "lucide-react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";

interface SchemeCardProps {
  schemeId: number;
  scheme: string;
  amc: string;
  nav: number; // New Prop
  current: number;
  returnPct: number;
  onClick?: () => void;
  onShare?: () => void;
}

export default function SchemeCard({
  scheme,
  amc,
  nav,
  current,
  returnPct,
  onClick,
  onShare,
}: SchemeCardProps) {
  const isPositive = returnPct >= 0;

  return (
    <Card
      className="p-4 bg-surface border border-neutral-200 dark:border-white/5 hover:bg-surface-highlight transition-colors relative group"
      onClick={onClick}>
      <div
        className={`flex justify-between items-start ${onShare ? "pr-8" : ""}`}>
        <div className="flex-1 mr-4">
          <h4 className="font-medium mb-1 line-clamp-2 text-neutral-900 dark:text-white">
            {scheme}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {amc}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400 font-medium">
              NAV: ₹
              {nav.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-semibold text-neutral-900 dark:text-white">
            <PrivacyMask>₹{current.toLocaleString("en-IN")}</PrivacyMask>
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

      {onShare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-full transition-all opacity-100 z-10"
          title="Share Performance">
          <Share2 size={18} />
        </button>
      )}
    </Card>
  );
}
