import React from 'react';

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
  units 
}: TransactionItemProps) {
  
  const formatType = (type: string) => {
    switch (type) {
      case 'PURCHASE_SIP': return 'SIP';
      case 'STAMP_DUTY_TAX': return 'Stamp Duty';
      case 'STT_TAX': return 'STT Tax';
      case 'REDEMPTION': return 'Redemption';
      case 'PURCHASE': return 'Purchase';
      default: return type.replace(/_/g, ' ');
    }
  };

  const isPurchase = type.includes('PURCHASE');
  const isTax = type.includes('TAX') || type.includes('STAMP_DUTY');
  const isRedemption = type === 'REDEMPTION';

  // Determine the color theme for the item
  let statusColor = "text-gray-600 bg-gray-100"; // Default (Taxes)
  let amountColor = "text-gray-700"; // Default (Taxes)
  let iconColor = "bg-gray-50 text-gray-400";

  if (isPurchase) {
    statusColor = "bg-green-50 text-green-700";
    amountColor = "text-green-600";
    iconColor = "bg-green-50 text-green-600";
  } else if (isRedemption) {
    statusColor = "bg-red-50 text-red-700";
    amountColor = "text-red-600";
    iconColor = "bg-red-50 text-red-600";
  }

  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-50 bg-white">
      {/* Visual Indicator Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${iconColor}`}>
        {isPurchase ? '↓' : isRedemption ? '↑' : '−'}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-gray-900 truncate">
            {isTax ? formatType(type) : schemeName}
          </p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${statusColor}`}>
            {isTax ? 'Tax' : formatType(type)}
          </span>
        </div>
        
        {/* Secondary Info: AMC if purchase/sell, or Scheme Name if Tax */}
        <p className="text-xs text-gray-500 truncate">
          {isTax ? schemeName : amc}
        </p>

        <div className="text-[11px] text-gray-400 mt-1 flex items-center">
          <span>{new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          {units && units > 0 && <span className="ml-1"> • {units} Units</span>}
        </div>
      </div>

      {/* Amount Section */}
      <div className="text-right ml-4">
        <p className={`text-sm font-bold ${amountColor}`}>
          {isPurchase ? '+' : '-'}₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}