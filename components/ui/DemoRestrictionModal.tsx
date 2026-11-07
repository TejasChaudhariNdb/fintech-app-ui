"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, CheckCircle2, ArrowRight, X } from "lucide-react";
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
        document.documentElement.style.overflow = originalHtmlOverflow === "hidden" ? "" : originalHtmlOverflow;
        document.body.style.overflow = originalOverflow === "hidden" ? "" : originalOverflow;
        document.body.style.position = originalPosition === "fixed" ? "" : originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
  };

  const handleCreateAccount = () => {
    handleClose();
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.removeItem("is_demo_session");
    router.push("/auth?tab=signup");
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none overscroll-none animate-fade-in pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
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
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center">
          {/* Glowing Brand Icon */}
          <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary-600/15 via-indigo-500/15 to-purple-600/15 dark:from-primary-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 border border-primary-500/30 text-primary-600 dark:text-primary-400 shadow-lg shadow-primary-500/10">
            <Sparkles size={28} className="text-primary-600 dark:text-primary-400" />
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-full p-1 shadow-md">
              <Lock size={11} />
            </div>
          </div>

          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Demo Sandbox • Read-Only
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Track Your Own Portfolio
          </h2>

          <p className="mt-2 text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-sm">
            Changes and uploads are disabled in this shared public demo. Create your free personal account to start importing and tracking your real investments.
          </p>

          {/* Value Highlights Checklist */}
          <div className="w-full my-4 p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 space-y-2.5 text-left">
            <div className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={13} />
              </div>
              <span><strong>100% Private & Encrypted</strong> personal workspace</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={13} />
              </div>
              <span><strong>1-Click Auto Sync</strong> from Zerodha, Groww & CAS</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={13} />
              </div>
              <span><strong>Live XIRR & Capital Gains</strong> tax reports for ITR</span>
            </div>
          </div>

          {/* High-Converting Action Area */}
          <div className="w-full space-y-2 pt-1">
            <Button
              onClick={handleCreateAccount}
              variant="primary"
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 hover:from-primary-500 hover:via-indigo-500 hover:to-purple-500 text-white border-none shadow-lg shadow-primary-500/25 text-xs sm:text-sm font-bold rounded-xl cursor-pointer active:scale-[0.99] transition-all"
            >
              <span>Create Free Account</span>
              <ArrowRight size={15} />
            </Button>

            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center font-medium">
              Takes ~30 seconds • No credit card required
            </p>

            <button
              onClick={handleClose}
              className="w-full pt-1.5 pb-0.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              Continue Exploring Demo
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
