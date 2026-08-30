"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "loading" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const CONFIGS: Record<ToastType, { icon: React.ReactNode; bg: string; bar: string }> = {
  success: {
    icon: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
    bg: "bg-white dark:bg-[#151A23] border border-emerald-200/60 dark:border-emerald-500/20",
    bar: "bg-emerald-500",
  },
  error: {
    icon: <AlertCircle size={18} className="text-red-500 flex-shrink-0" />,
    bg: "bg-white dark:bg-[#151A23] border border-red-200/60 dark:border-red-500/20",
    bar: "bg-red-500",
  },
  loading: {
    icon: <Loader2 size={18} className="text-primary-500 animate-spin flex-shrink-0" />,
    bg: "bg-white dark:bg-[#151A23] border border-primary-200/60 dark:border-primary-500/20",
    bar: "bg-primary-500",
  },
  info: {
    icon: <Info size={18} className="text-blue-500 flex-shrink-0" />,
    bg: "bg-white dark:bg-[#151A23] border border-blue-200/60 dark:border-blue-500/20",
    bar: "bg-blue-500",
  },
};

export default function Toast({
  message,
  type = "info",
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  // Haptic feedback
  useEffect(() => {
    if (isVisible && typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "success") navigator.vibrate(50);
      if (type === "error") navigator.vibrate([50, 50, 50]);
    }
  }, [isVisible, type]);

  // Progress bar drain + auto-dismiss
  useEffect(() => {
    if (!isVisible || type === "loading" || duration <= 0) return;

    setProgress(100);
    setExiting(false);

    // Drain progress bar
    const startTime = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    // Dismiss after duration
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 220);
    }, duration);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [isVisible, duration, onClose, type]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 220);
  };

  if (!isVisible) return null;

  const config = CONFIGS[type];

  return (
    <div
      className="fixed bottom-24 md:bottom-8 left-1/2 z-[9998] pointer-events-auto"
      style={{
        transform: exiting
          ? "translate(-50%, 10px) scale(0.96)"
          : "translate(-50%, 0) scale(1)",
        opacity: exiting ? 0 : 1,
        transition: exiting
          ? "transform 220ms cubic-bezier(0.36,0,0.66,-0.56), opacity 200ms ease"
          : "transform 400ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease",
        animation: exiting ? "none" : undefined,
      }}
    >
      <div
        className={`
          ${config.bg}
          shadow-xl shadow-black/10 dark:shadow-black/40
          rounded-2xl overflow-hidden
          min-w-[280px] max-w-[360px]
        `}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {config.icon}
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 flex-1 leading-snug">
            {message}
          </span>
          {type !== "loading" && (
            <button
              onPointerDown={handleClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors touch-manipulation active:scale-90"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Auto-dismiss progress bar */}
        {type !== "loading" && duration > 0 && (
          <div className="h-[2px] w-full bg-neutral-100 dark:bg-white/5">
            <div
              className={`h-full ${config.bar} opacity-60 transition-none`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
