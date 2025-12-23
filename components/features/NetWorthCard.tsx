import React from 'react';
import Card from '../ui/Card';

interface NetWorthCardProps {
  netWorth: number;
  mfValue: number;
  stockValue: number;
}

export default function NetWorthCard({ netWorth, mfValue, stockValue }: NetWorthCardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white border-0">
      <p className="text-sm opacity-90 mb-1">Total Net Worth</p>
      <h1 className="text-4xl font-bold mb-6">
        ₹{netWorth.toLocaleString('en-IN')}
      </h1>
      
      <div className="flex gap-3">
        <div className="flex-1 bg-white/10 rounded-xl p-4">
          <p className="text-xs opacity-80 mb-1">Mutual Funds</p>
          <p className="text-lg font-semibold">₹{mfValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl p-4">
          <p className="text-xs opacity-80 mb-1">Stocks</p>
          <p className="text-lg font-semibold">₹{stockValue.toLocaleString('en-IN')}</p>
        </div>
      </div>
    </Card>
  );
}
