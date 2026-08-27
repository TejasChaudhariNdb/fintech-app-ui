"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Briefcase,
  Activity,
  FileSpreadsheet,
  Target,
  Settings,
} from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";

export default function BottomNav() {
  const pathname = usePathname();
  const { light } = useHaptic();

  const tabs = [
    { id: "/", label: "Home", icon: Home },
    { id: "/holdings", label: "Holdings", icon: Briefcase },
    { id: "/activity", label: "Activity", icon: Activity },
    { id: "/reports", label: "Reports", icon: FileSpreadsheet },
    { id: "/goals", label: "Goals", icon: Target },
    { id: "/profile", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-auto"
    >
      {/* Background container with ultra-slick glassmorphism & subtle top ambient line */}
      <div className="relative bg-white/90 dark:bg-[#0E121A]/90 backdrop-blur-2xl border-t border-neutral-200/70 dark:border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-colors duration-300 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        
        {/* Soft top gradient accent line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/25 to-transparent dark:via-primary-400/30" />

        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {tabs.map((tab) => {
            const isActive =
              tab.id === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.id);

            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.id}
                onClick={() => light()}
                className={`relative flex-1 flex flex-col items-center justify-center py-1 group touch-manipulation transition-all duration-200 active:scale-95`}
              >
                {/* Active Indicator Top Pill Glow */}
                {isActive && (
                  <span className="absolute -top-[1px] h-[3px] w-6 bg-gradient-to-r from-primary-500 to-indigo-500 dark:from-primary-400 dark:to-indigo-400 rounded-full shadow-[0_2px_8px_rgba(99,102,241,0.6)] animate-in fade-in zoom-in-50 duration-200" />
                )}

                {/* Icon Container with subtle active pill */}
                <div
                  className={`relative flex items-center justify-center w-11 h-7 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-primary-500/10 dark:bg-primary-400/15 text-primary-600 dark:text-primary-400 shadow-sm shadow-primary-500/5 -translate-y-0.5"
                      : "text-neutral-400 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 group-hover:bg-neutral-100/60 dark:group-hover:bg-white/5"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    className={`transition-transform duration-200 ${
                      isActive ? "scale-105" : "group-active:scale-90"
                    }`}
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] tracking-tight font-medium transition-all duration-200 mt-0.5 ${
                    isActive
                      ? "text-primary-600 dark:text-primary-400 font-semibold opacity-100 scale-100"
                      : "text-neutral-400 dark:text-neutral-400 font-medium opacity-80 group-hover:opacity-100"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
