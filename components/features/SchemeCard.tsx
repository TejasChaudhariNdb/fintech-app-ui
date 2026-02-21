"use client";

import { Share2, Pencil, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";

interface SchemeCardProps {
  schemeId: number;
  scheme: string;
  amc: string;
  nav: number; // New Prop
  units?: number;
  current: number;
  returnPct: number;
  onClick?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SchemeCard({
  scheme,
  amc,
  nav,
  units,
  current,
  returnPct,
  onClick,
  onShare,
  onEdit,
  onDelete,
}: SchemeCardProps) {
  const isPositive = returnPct >= 0;

  return (
    <Card
      className="p-5 bg-surface border border-neutral-200 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors relative group"
      onClick={onClick}>
      <div
        className={`flex justify-between items-start ${onShare ? "pr-6" : ""}`}>
        <div className="flex-1 mr-4 min-w-0">
          <h4 className="font-semibold text-[15px] mb-1.5 line-clamp-2 text-neutral-900 dark:text-white leading-snug tracking-tight">
            {scheme}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[150px]">
              {amc}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 font-medium tracking-tight whitespace-nowrap">
              NAV: ₹
              {nav.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
            {units !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 font-medium tracking-tight whitespace-nowrap">
                {units.toFixed(2)} Units
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 ml-2">
          <p className="font-bold text-base text-neutral-900 dark:text-white leading-none mb-1">
            <PrivacyMask>₹{current.toLocaleString("en-IN")}</PrivacyMask>
          </p>
          <p
            className={`text-xs font-bold leading-none ${
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
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
          className="absolute top-2 right-2 p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Share Performance">
          <Share2 size={16} />
        </button>
      )}

      {(onEdit || onDelete) && (
        <div className="pt-3 mt-4 border-t border-neutral-100 dark:border-white/5 flex gap-5 opacity-80 hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-500 transition-colors">
              <Pencil size={14} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-red-500 transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
