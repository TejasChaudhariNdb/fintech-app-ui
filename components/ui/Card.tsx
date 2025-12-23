import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-neutral-100 ${className} ${
        onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}