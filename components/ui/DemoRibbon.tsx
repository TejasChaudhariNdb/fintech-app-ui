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
    <div className="sticky top-0 z-[45] h-10 w-full bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 text-white text-xs font-semibold px-4 flex items-center justify-between shadow-lg backdrop-blur-md border-b border-white/10 select-none">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse hidden sm:inline-block" />
        <span className="tracking-wide text-[11px] sm:text-xs">
          Exploring in <strong className="font-extrabold uppercase bg-black/20 px-2 py-0.5 rounded-md text-[10px]">Demo Mode</strong>. Track your own portfolio!
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Subtle Exit Demo Link */}
        <button
          onClick={handleExit}
          className="text-[11px] font-medium text-white/70 hover:text-white hover:underline transition-all flex items-center gap-1">
          <span>Exit Demo</span>
          <LogOut size={11} className="opacity-70" />
        </button>

        {/* High-Converting Glowing Start Free Button */}
        <button
          onClick={handleStartFree}
          className="bg-white text-primary-600 hover:bg-neutral-50 active:scale-95 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md shadow-black/10 hover:shadow-lg flex items-center gap-1 group">
          <span>Start Free</span>
          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
