"use client";

import { useRouter } from "next/navigation";
import { LogOut, ArrowRight, Sparkles } from "lucide-react";
import { useIsDemo, isDemoUser } from "@/lib/hooks/useIsDemo";

export default function DemoRibbon() {
  const isDemo = useIsDemo();
  const router = useRouter();

  if (!isDemo && !isDemoUser()) return null;

  const handleExit = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.clear();
    router.push("/login");
  };

  const handleCreateAccount = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.removeItem("is_demo_session");
    router.push("/auth?tab=signup");
  };

  return (
    <div className="sticky top-0 z-[45] h-10 w-full bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-700 text-white text-xs px-3 sm:px-4 flex items-center justify-between shadow-xs backdrop-blur-md border-b border-white/10 select-none">
      {/* Left: Demo Indicator & Context */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse hidden sm:inline-block shrink-0" />
        <span className="text-xs text-white/90 flex items-center gap-1.5 tracking-wide">
          <span className="hidden sm:inline font-normal">Exploring in</span>
          <strong className="font-extrabold uppercase bg-black/25 px-1.5 py-0.5 rounded-md text-[10px] tracking-wider border border-white/10 text-white">
            Demo Mode
          </strong>
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={handleExit}
          className="px-2.5 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="Exit Demo"
        >
          <LogOut size={13} className="opacity-80" />
          <span className="whitespace-nowrap">Exit Demo</span>
        </button>

        {/* Create Free Account CTA */}
        <button
          onClick={handleCreateAccount}
          className="bg-white hover:bg-white/95 active:scale-95 text-neutral-900 font-semibold px-3 py-1 rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 group cursor-pointer"
        >
          <Sparkles size={12} className="text-primary-600 shrink-0" />
          <span className="whitespace-nowrap">Create Free Account</span>
        </button>
      </div>
    </div>
  );
}
