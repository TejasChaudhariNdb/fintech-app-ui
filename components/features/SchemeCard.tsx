"use client";

import { Share2, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
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
  xirr?: number | null;
  onClick?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onBuy?: () => void;
  onSell?: () => void;
}

export default function SchemeCard({
  scheme,
  amc,
  nav,
  units,
  current,
  returnPct,
  xirr,
  onClick,
  onShare,
  onEdit,
  onDelete,
  onBuy,
  onSell,
}: SchemeCardProps) {
  const isPositive = returnPct >= 0;
  const performanceTone = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-500 dark:text-red-400";

  return (
    <Card
      className="group relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md dark:border-white/5 dark:bg-surface dark:hover:bg-white/[0.03]"
      onClick={onClick}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-500/6 to-transparent opacity-80 dark:from-emerald-400/8" />
      <div
        className={`relative flex items-start justify-between gap-4 ${onShare ? "pr-8" : ""}`}>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white sm:text-[16px]">
            {scheme}
          </h4>
          <p className="mt-2 truncate text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {amc}
          </p>

       
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[15px] font-bold leading-none text-neutral-900 dark:text-white sm:text-[16px]">
            <PrivacyMask>₹{current.toLocaleString("en-IN")}</PrivacyMask>
          </p>
          <div
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"} ${performanceTone}`}>
            {isPositive ? "+" : ""}
            {returnPct.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-neutral-100 px-2.5 py-1 text-[11px] font-medium tracking-tight text-neutral-600 dark:bg-white/8 dark:text-neutral-300">
              NAV: ₹
              {nav.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
            {units !== undefined && (
              <span className="rounded-xl bg-neutral-100 px-2.5 py-1 text-[11px] font-medium tracking-tight text-neutral-600 dark:bg-white/8 dark:text-neutral-300">
                {units.toFixed(2)} Units
              </span>
            )}
            {xirr !== undefined && xirr !== null && (
              <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
                XIRR: {xirr.toFixed(2)}%
              </span>
            )}
          </div>

      {onShare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="absolute right-3 top-3 rounded-full p-2 text-neutral-400 transition-all hover:bg-primary-50 hover:text-primary-600 focus:opacity-100 dark:hover:bg-primary-500/10"
          title="Share Performance">
          <Share2 size={16} />
        </button>
      )}

      {(onBuy || onSell || onEdit || onDelete) && (
        <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {onBuy && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy();
                }}
                className="flex items-center gap-1.5 transition-colors hover:text-emerald-500">
                <TrendingUp size={14} /> Buy
              </button>
            )}
            {onSell && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSell();
                }}
                className="flex items-center gap-1.5 transition-colors hover:text-red-500">
                <TrendingDown size={14} /> Sell
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center gap-1.5 transition-colors hover:text-primary-500">
                <Pencil size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center gap-1.5 transition-colors hover:text-red-500">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
