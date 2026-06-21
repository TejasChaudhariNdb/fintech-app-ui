"use client";

import { useRouter } from "next/navigation";
import { LogOut, ArrowRight, Sparkles } from "lucide-react";
import { useIsDemo } from "@/lib/hooks/useIsDemo";

export default function DemoRibbon() {
  const isDemo = useIsDemo();
  const router = useRouter();

  if (!isDemo) return null;

  const handleExit = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.clear();
    router.push("/login");
  };

  const handleStartFree = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.clear();
    router.push("/register");
  };

  return (
    <div className="sticky top-0 z-[45] h-10 w-full bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 text-white text-xs font-semibold px-3 sm:px-4 flex items-center justify-between shadow-lg backdrop-blur-md border-b border-white/10 select-none">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse hidden sm:inline-block" />
        <span className="tracking-wide text-[10px] sm:text-xs flex items-center gap-1.5">
          <span className="hidden sm:inline text-white/90">Exploring in</span>
          <strong className="font-extrabold uppercase bg-black/25 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] tracking-wider border border-white/5">
            Demo Mode
          </strong>
          <span className="hidden md:inline text-white/80">. Track your own portfolio!</span>
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subtle Exit Demo Link */}
        <button
          onClick={handleExit}
          className="text-[10px] sm:text-[11px] font-semibold text-white/80 hover:text-white hover:underline transition-all flex items-center gap-1 active:scale-95"
        >
          <span className="hidden sm:inline">Exit Demo</span>
          <span className="sm:hidden">Exit</span>
          <LogOut size={11} className="opacity-80" />
        </button>

        {/* High-Converting Glowing Start Free Button */}
        <button
          onClick={handleStartFree}
          className="bg-white text-primary-600 hover:bg-neutral-50 active:scale-95 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-extrabold transition-all shadow-md shadow-black/10 hover:shadow-lg flex items-center gap-0.5 sm:gap-1 group"
        >
          <span>Start Free</span>
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
