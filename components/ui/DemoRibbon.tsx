"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useIsDemo } from "@/lib/hooks/useIsDemo";

export default function DemoRibbon() {
  const isDemo = useIsDemo();
  const router = useRouter();

  if (!isDemo) return null;

  const handleExit = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    sessionStorage.clear();
    router.push("/login"); // or router.replace("/login")
  };

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[11px] lg:text-xs font-bold px-4 py-1.5 shadow-md sticky top-0 z-[100] tracking-wide uppercase flex items-center justify-between lg:justify-center gap-4">
      <span>Demo Account — View Only Mode</span>
      <button
        onClick={handleExit}
        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-colors border border-white/10">
        <span>Exit Demo</span>
        <LogOut size={10} strokeWidth={3} />
      </button>
    </div>
  );
}
