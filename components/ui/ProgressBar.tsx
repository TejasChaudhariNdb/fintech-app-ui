import React from "react";

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export default function ProgressBar({
  progress,
  className = "",
}: ProgressBarProps) {
  return (
    <div
      className={`w-full bg-surface-highlight rounded-full overflow-hidden ${className}`}>
      <div
        className="bg-gradient-to-r from-primary-500 to-accent-400 h-full rounded-full transition-all duration-500 ease-out shadow-lg shadow-primary-500/20"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
}
