import React from 'react';
import Card from '../ui/Card';

interface SchemeCardProps {
  schemeId: number;
  scheme: string;
  amc: string;
  current: number;
  returnPct: number;
  onClick?: () => void;
}

export default function SchemeCard({ 
  scheme, 
  amc, 
  current, 
  returnPct,
  onClick 
}: SchemeCardProps) {
  const isPositive = returnPct >= 0;

  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-3">
          <h4 className="font-medium mb-1 line-clamp-2">{scheme}</h4>
          <p className="text-sm text-neutral-600">{amc}</p>
        </div>
        
        <div className="text-right">
          <p className="font-semibold">₹{current.toLocaleString('en-IN')}</p>
          <p className={`text-sm font-medium ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
          </p>
        </div>
      </div>
    </Card>
  );
}