"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, X, Sparkles, UserPlus } from "lucide-react";
import Button from "./Button";

export default function DemoRestrictionModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShow = () => {
      setIsOpen(true);
    };

    window.addEventListener("show-demo-restriction", handleShow);
    return () => {
      window.removeEventListener("show-demo-restriction", handleShow);
    };
  }, []);

  const handleCreateAccount = () => {
    // Clear credentials
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.removeItem("is_demo_session");
    
    // Close modal and redirect
    setIsOpen(false);
    router.push("/auth?tab=signup");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Glassmorphic Modal Card */}
      <div className="relative bg-white/80 dark:bg-[#151A23]/80 border border-neutral-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl backdrop-blur-2xl z-10 transition-all transform animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          <X size={18} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 shadow-inner">
            <ShieldAlert size={28} className="animate-pulse" />
            <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full p-0.5 shadow-md">
              <Sparkles size={10} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Demo Account Restriction
          </h2>
          
          <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
            You are currently using the shared **public demo account**. Making database changes (creating, editing, or deleting entries) is disabled to preserve a clean environment for everyone.
          </p>

          <div className="w-full h-px bg-neutral-200/50 dark:bg-white/5 my-6" />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              onClick={handleCreateAccount}
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-none shadow-md shadow-emerald-500/20 text-sm"
            >
              <UserPlus size={16} />
              Create My Account
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="secondary"
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-800 text-sm hover:bg-neutral-50 dark:hover:bg-white/5"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
