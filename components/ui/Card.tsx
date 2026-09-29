import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "glass" | "outlined";
  id?: string;
}

export default function Card({
  children,
  className = "",
  onClick,
  variant = "default",
  id,
}: CardProps) {
  const baseClasses = "rounded-2xl transition-all duration-200";

  const variants = {
    default: "bg-surface border border-white/5 shadow-xl",
    glass: "glass-card",
    outlined: "bg-transparent border border-white/10",
  };

  return (
    <div
      id={id}
      className={`${baseClasses} ${variants[variant]} ${className} ${
        onClick
          ? "cursor-pointer hover:border-primary-500/30 hover:shadow-2xl hover:-translate-y-1"
          : ""
      }`}
      onClick={onClick}>
      {children}
    </div>
  );
}
