"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white dark:bg-[#151A23] dark:border dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 animate-slide-up transition-colors duration-200 max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white text-2xl w-8 h-8 flex items-center justify-center transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-white/10">
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
