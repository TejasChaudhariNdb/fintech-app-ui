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
  const isPurchase = type === 'purchase';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
        isPurchase ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
      }`}>
        {isPurchase ? '↓' : '↑'}
      </div>
      
      <div className="flex-1">
        <p className="font-medium line-clamp-1">{schemeName}</p>
        <p className="text-sm text-neutral-600">{amc}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
          {units && ` • ${units} units`}
        </p>
      </div>
      
      <div className="text-right">
        <p className={`font-semibold ${isPurchase ? 'text-success-600' : 'text-danger-600'}`}>
          {isPurchase ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
}
