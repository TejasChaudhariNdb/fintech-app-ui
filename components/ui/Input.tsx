import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  leftIcon,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1.5 text-neutral-300 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {leftIcon}
          </div>
        )}
        <input
          className={`w-full ${
            leftIcon ? "pl-10" : "px-4"
          } py-3 bg-surface-highlight border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all duration-200 ${
            error ? "border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-400 ml-1">{error}</p>}
    </div>
  );
}
