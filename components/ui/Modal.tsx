import React from "react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-[#151A23] dark:border dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 animate-slide-up transition-colors duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white text-2xl w-8 h-8 flex items-center justify-center transition-colors">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
