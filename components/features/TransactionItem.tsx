import React from "react";
import { Trash2, Pencil } from "lucide-react";

interface TransactionItemProps {
  id?: number;
  date: string;
  type: string;
  amount: number;
  schemeName: string;
  amc: string;
  units?: number;
  category?: "MF" | "STOCK";
  profileName?: string;
  profileRelation?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function TransactionItem({
  id,
  date,
  type,
  amount,
  schemeName,
  amc,
  units,
  category = "MF",
  profileName,
  profileRelation,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const formatType = (type: string) => {
    switch (type) {
      case "PURCHASE_SIP":
        return "SIP";
      case "STAMP_DUTY_TAX":
        return "Stamp Duty";
      case "STT_TAX":
        return "STT Tax";
      case "REDEMPTION":
        return "Redemption";
      case "PURCHASE":
        return "Purchase";
      case "BUY":
        return "Buy";
      case "SELL":
        return "Sell";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getProfileBadgeColor = (relation?: string) => {
    if (!relation) return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    const rel = relation.toUpperCase();
    if (rel === "SELF") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (rel === "MOTHER") return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (rel === "FATHER") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (rel === "SPOUSE") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (rel === "CHILD") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
  };

  const isPurchase = type.includes("PURCHASE") || type === "BUY";
  const isTax = type.includes("TAX") || type.includes("STAMP_DUTY");
  const isRedemption = type === "REDEMPTION" || type === "SELL";

  // Determine the color theme for the item
  let statusColor =
    "bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400"; // Default (Taxes)
  let amountColor = "text-neutral-500 dark:text-neutral-400"; // Default (Taxes)
  let iconColor =
    "bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400";

  if (isPurchase) {
    statusColor =
      "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    amountColor = "text-emerald-600 dark:text-emerald-400";
    iconColor =
      "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  } else if (isRedemption) {
    statusColor =
      "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400";
    amountColor = "text-red-600 dark:text-red-400";
    iconColor = "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400";
  }

  return (
    <div 
      onClick={() => onEdit?.()}
      className={`flex items-center justify-between p-3.5 border border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-white/5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors group relative overflow-hidden ${onEdit ? "cursor-pointer" : ""}`}
    >
      {/* Visual Indicator Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${iconColor}`}>
        {isPurchase ? "↓" : isRedemption ? "↑" : "−"}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {isTax ? formatType(type) : schemeName}
          </p>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${statusColor}`}>
            {isTax ? "Tax" : formatType(type)}
          </span>
          {category === "STOCK" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Stock
            </span>
          )}
          {profileName && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border tracking-tight ${getProfileBadgeColor(profileRelation)}`}>
              {profileName}
            </span>
          )}
        </div>

        {/* Secondary Info: AMC if purchase/sell, or Scheme Name if Tax */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {isTax ? schemeName : amc}
        </p>

        <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 flex items-center">
          <span>
            {new Date(date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
          {units && units > 0 && (
            <span className="ml-1">
              {" "}
              • {units} {category === "STOCK" ? "Shares" : "Units"}
            </span>
          )}
        </div>
      </div>

      {/* Amount Section & Actions */}
      <div className="text-right ml-4 flex items-center gap-3">
        <div className="group-hover:opacity-0 transition-opacity">
          <p className={`text-sm font-bold ${amountColor}`}>
            {isPurchase ? "+" : "-"}₹
            {amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Action Buttons (Visible on Hover) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-100 dark:bg-[#1A1F2B] p-1.5 rounded-lg shadow-sm border border-neutral-200 dark:border-white/10">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="Edit Transaction">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete Transaction">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

