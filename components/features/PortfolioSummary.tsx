import React from 'react';
import Card from '../ui/Card';

interface PortfolioSummaryProps {
  invested: number;
  current: number;
  profit: number;
  returnPct: number;
}

export default function PortfolioSummary({ 
  invested, 
  current, 
  profit, 
  returnPct 
}: PortfolioSummaryProps) {
  const isPositive = profit >= 0;

  return (
    <Card className="p-5">
      <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-neutral-600">Invested</span>
          <span className="font-semibold">₹{invested.toLocaleString('en-IN')}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-600">Current Value</span>
          <span className="font-semibold">₹{current.toLocaleString('en-IN')}</span>
        </div>
        
        <div className="h-px bg-neutral-200" />
        
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Gain</span>
          <div className="text-right">
            <p className={`font-bold text-lg ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
              {isPositive ? '+' : ''}₹{profit.toLocaleString('en-IN')}
            </p>
            <p className={`text-sm ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
              {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}