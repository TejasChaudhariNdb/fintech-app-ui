import React from 'react';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

interface GoalCardProps {
  id: number;
  name: string;
  target: number;
  current: number;
  progress: number;
  onClick?: () => void;
}

export default function GoalCard({ 
  name, 
  target, 
  current, 
  progress,
  onClick 
}: GoalCardProps) {
  return (
    <Card className="p-5" onClick={onClick}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Target: ₹{target.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">
            {progress.toFixed(0)}%
          </p>
        </div>
      </div>

      <ProgressBar progress={progress} className="mb-3 h-3" />

      <div className="flex justify-between text-sm">
        <span className="text-neutral-600">
          Current: ₹{current.toLocaleString('en-IN')}
        </span>
        <span className="text-neutral-600">
          Remaining: ₹{(target - current).toLocaleString('en-IN')}
        </span>
      </div>
    </Card>
  );
}
