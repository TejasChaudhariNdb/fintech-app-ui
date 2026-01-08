import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  isLoading?: boolean;
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "relative inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0E14] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white shadow-lg shadow-primary-500/30 focus:ring-primary-500",
    secondary:
      "bg-surface-highlight hover:bg-neutral-700 text-white border border-white/5",
    danger:
      "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/30 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white",
    outline:
      "bg-transparent border border-primary-500 text-primary-400 hover:bg-primary-500/10",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}>
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
