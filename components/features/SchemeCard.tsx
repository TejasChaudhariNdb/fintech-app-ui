"use client";

import {
  Share2,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import PrivacyMask from "../ui/PrivacyMask";

interface SchemeCardProps {
  schemeId: number;
  scheme: string;
  amc: string;
  nav: number;
  avgPrice?: number;
  units?: number;
  current: number;
  returnPct: number;
  xirr?: number | null;
  dayChange?: number;
  dayChangePct?: number;
  categoryLabel?: string;
  overallRank?: number;
  totalHoldings?: number;
  categoryRank?: number;
  categoryTotal?: number;
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
  avgPrice,
  units,
  current,
  returnPct,
  xirr,
  dayChange = 0,
  dayChangePct = 0,
  categoryLabel,
  overallRank,
  totalHoldings,
  categoryRank,
  categoryTotal,
  onClick,
  onShare,
  onEdit,
  onDelete,
  onBuy,
  onSell,
}: SchemeCardProps) {
  const isPositive = returnPct >= 0;
  const isDayPositive = dayChange >= 0;

  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl
        bg-white dark:bg-surface
        border border-neutral-200/80 dark:border-white/[0.06]
        shadow-sm hover:shadow-lg
        transition-all duration-300 ease-out
        hover:-translate-y-0.5
        ${onClick ? "cursor-pointer" : ""}
      `}>
      {/* Subtle top accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-[2px] ${
          isPositive
            ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
            : "bg-gradient-to-r from-red-400 via-red-500 to-rose-500"
        }`}
      />

      {/* Main Content */}
      <div className="p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: Scheme Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {categoryLabel && (
                <span className="inline-flex items-center rounded-md bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  {categoryLabel}
                </span>
              )}
              {overallRank && (
                <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  #{overallRank}
                  {totalHoldings ? `/${totalHoldings}` : ""}
                </span>
              )}
            </div>
            <h4 className="mt-2 text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2 tracking-tight">
              {scheme}
            </h4>
            <p className="mt-1 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {amc}
            </p>
          </div>

          {/* Right: Value & Returns */}
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
              <PrivacyMask>₹{current.toLocaleString("en-IN")}</PrivacyMask>
            </p>

            {/* Two Return Indicators - Overall & Day */}
            <div className="mt-2 flex items-center justify-end gap-2">
              {/* Overall Return */}
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Overall
                </span>
                <div
                  className={`
                    mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5
                    text-[11px] font-semibold tabular-nums
                    ${
                      isPositive
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                    }
                  `}>
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {isPositive ? "+" : ""}
                  {returnPct.toFixed(2)}%
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-neutral-200 dark:bg-white/10" />

              {/* Day Change */}
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Today
                </span>
                <div
                  className={`
                    mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5
                    text-[11px] font-semibold tabular-nums
                    ${
                      isDayPositive
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                    }
                  `}>
                  {isDayPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {isDayPositive ? "+" : ""}₹
                  {Math.abs(dayChange).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricItem
            label="NAV"
            value={`₹${nav.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
          />
          {avgPrice !== undefined && (
            <MetricItem
              label="Avg Price"
              value={`₹${avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
            />
          )}
          {units !== undefined && (
            <MetricItem label="Units" value={units.toFixed(3)} />
          )}
          {xirr !== undefined && xirr !== null && (
            <MetricItem
              label="XIRR"
              value={`${xirr.toFixed(2)}%`}
              highlight={xirr >= 0 ? "positive" : "negative"}
            />
          )}
          {categoryRank && (
            <MetricItem
              label="Cat. Rank"
              value={`#${categoryRank}${categoryTotal ? `/${categoryTotal}` : ""}`}
            />
          )}
        </div>
      </div>

      {/* Action Bar */}
      {(onBuy || onSell || onEdit || onDelete) && (
        <div className="border-t border-neutral-100 dark:border-white/[0.06] bg-neutral-50/50 dark:bg-white/[0.02] px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBuy && (
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuy();
                  }}
                  variant="success"
                  icon={<TrendingUp className="w-3.5 h-3.5" />}>
                  Buy
                </ActionButton>
              )}
              {onSell && (
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onSell();
                  }}
                  variant="danger"
                  icon={<TrendingDown className="w-3.5 h-3.5" />}>
                  Sell
                </ActionButton>
              )}
            </div>

            <div className="flex items-center gap-1">
              {onShare && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare();
                  }}
                  title="Share">
                  <Share2 className="w-4 h-4" />
                </IconButton>
              )}
              {onEdit && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Edit">
                  <Pencil className="w-4 h-4" />
                </IconButton>
              )}
              {onDelete && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title="Delete"
                  variant="danger">
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click indicator */}
      {onClick && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600" />
        </div>
      )}
    </div>
  );
}

// Metric Item Component
function MetricItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <div
      className={`
      rounded-xl px-3 py-2
      ${
        highlight === "positive"
          ? "bg-emerald-50 dark:bg-emerald-500/10"
          : highlight === "negative"
            ? "bg-red-50 dark:bg-red-500/10"
            : "bg-neutral-100 dark:bg-white/[0.04]"
      }
    `}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[13px] font-semibold tabular-nums ${
          highlight === "positive"
            ? "text-emerald-600 dark:text-emerald-400"
            : highlight === "negative"
              ? "text-red-600 dark:text-red-400"
              : "text-neutral-700 dark:text-neutral-200"
        }`}>
        {value}
      </p>
    </div>
  );
}

// Action Button Component
function ActionButton({
  children,
  onClick,
  variant,
  icon,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant: "success" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5
        text-xs font-semibold transition-all duration-200
        ${
          variant === "success"
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
            : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25"
        }
      `}>
      {icon}
      {children}
    </button>
  );
}

// Icon Button Component
function IconButton({
  children,
  onClick,
  title,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        p-2 rounded-full transition-all duration-200
        ${
          variant === "danger"
            ? "text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            : "text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
        }
      `}>
      {children}
    </button>
  );
}
