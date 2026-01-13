import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

export type ToastType = "success" | "error" | "loading" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "info",
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      // 📳 Haptic Feedback
      // Note: navigator.vibrate() is supported on Android but explicitly ignored by iOS Safari/Web.
      // There is currently no workaround for Web Haptics on iOS without a native wrapper (Capacitor/Cordova).
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (type === "success") navigator.vibrate(50); // Short tick
        if (type === "error") navigator.vibrate([50, 50, 50]); // Double buzz
      }
    }

    if (isVisible && duration > 0 && type !== "loading") {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose, type]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-emerald-500" />;
      case "error":
        return <AlertCircle size={20} className="text-red-500" />;
      case "loading":
        return <Loader2 size={20} className="text-blue-500 animate-spin" />;
      default:
        return <AlertCircle size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 shadow-lg rounded-full px-6 py-3 flex items-center gap-3 min-w-[300px] justify-center">
        {getIcon()}
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {message}
        </span>
        {type !== "loading" && (
          <button
            onClick={onClose}
            className="ml-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
