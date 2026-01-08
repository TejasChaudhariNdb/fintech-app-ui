import React from "react";

interface TransactionItemProps {
  date: string;
  type: string;
  amount: number;
  schemeName: string;
  amc: string;
  units?: number;
}

export default function TransactionItem({
  date,
  type,
  amount,
  schemeName,
  amc,
  units,
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
      default:
        return type.replace(/_/g, " ");
    }
  };

  const isPurchase = type.includes("PURCHASE");
  const isTax = type.includes("TAX") || type.includes("STAMP_DUTY");
  const isRedemption = type === "REDEMPTION";

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
    <div className="flex items-center justify-between p-3.5 border border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-white/5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
      {/* Visual Indicator Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${iconColor}`}>
        {isPurchase ? "↓" : isRedemption ? "↑" : "−"}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {isTax ? formatType(type) : schemeName}
          </p>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${statusColor}`}>
            {isTax ? "Tax" : formatType(type)}
          </span>
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
          {units && units > 0 && <span className="ml-1"> • {units} Units</span>}
        </div>
      </div>

      {/* Amount Section */}
      <div className="text-right ml-4">
        <p className={`text-sm font-bold ${amountColor}`}>
          {isPurchase ? "+" : "-"}₹
          {amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
