import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className = "",
  type = "text",
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={inputType}
          className={`w-full ${leftIcon ? "pl-10" : "px-4"} ${
            rightIcon || isPassword ? "pr-10" : "px-4"
          } py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all duration-200 ${
            error ? "border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
        {(rightIcon || isPassword) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400 ml-1">
          {error}
        </p>
      )}
    </div>
  );
}
