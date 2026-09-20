"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ShieldAlert, X, Sparkles, UserPlus } from "lucide-react";
import Button from "./Button";

export default function DemoRestrictionModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleShow = () => {
      setIsOpen(true);
    };

    window.addEventListener("show-demo-restriction", handleShow);
    return () => {
      window.removeEventListener("show-demo-restriction", handleShow);
    };
  }, []);

  // Lock body scroll with fixed positioning for iOS Safari / Mobile
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleCreateAccount = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.removeItem("is_demo_session");
    setIsOpen(false);
    router.push("/auth?tab=signup");
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none overscroll-none animate-fade-in pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      {/* Dark backdrop blur */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />

      {/* Glassmorphic Modal Card */}
      <div
        className="relative bg-white dark:bg-[#151A23] border-t sm:border border-neutral-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl z-10 transition-all transform animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 touch-pan-y overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile top handle bar */}
        <div className="sm:hidden -mt-2 mb-4 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20" />
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 shadow-inner">
            <ShieldAlert size={28} className="animate-pulse" />
            <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full p-0.5 shadow-md">
              <Sparkles size={10} />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Demo Account Restriction
          </h2>

          <p className="mt-2 text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
            You are currently using the shared <span className="font-semibold text-neutral-900 dark:text-neutral-200">public demo account</span>. Making database changes (creating, editing, or deleting entries) is disabled to preserve a clean environment for everyone.
          </p>

          <div className="w-full h-px bg-neutral-200/60 dark:bg-white/5 my-5" />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <Button
              onClick={handleCreateAccount}
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-none shadow-md shadow-emerald-500/20 text-xs sm:text-sm font-bold rounded-xl cursor-pointer"
            >
              <UserPlus size={15} />
              Create My Account
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="secondary"
              className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl cursor-pointer"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
