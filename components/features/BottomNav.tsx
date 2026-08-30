"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home,
  Briefcase,
  ArrowLeftRight,
  FileSpreadsheet,
  Target,
  Settings,
} from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";

const tabs = [
  { id: "/", label: "Home", icon: Home },
  { id: "/holdings", label: "Holdings", icon: Briefcase },
  { id: "/activity", label: "Transactions", icon: ArrowLeftRight },
  { id: "/reports", label: "Reports", icon: FileSpreadsheet },
  { id: "/goals", label: "Goals", icon: Target },
  { id: "/profile", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { light } = useHaptic();
  const [pressedId, setPressedId] = useState<string | null>(null);

  // Prefetch all routes immediately so navigation is instant
  useEffect(() => {
    tabs.forEach((tab) => router.prefetch(tab.id));
  }, [router]);

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-auto"
    >
      {/* Background with glassmorphism & subtle top ambient line */}
      <div className="relative bg-white/90 dark:bg-[#0E121A]/90 backdrop-blur-2xl border-t border-neutral-200/70 dark:border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-colors duration-300 pb-[max(0.5rem,env(safe-area-inset-bottom))]">

        {/* Soft top gradient accent line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/25 to-transparent dark:via-primary-400/30" />

        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {tabs.map((tab) => {
            const isActive =
              tab.id === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.id);
            const isPressed = pressedId === tab.id;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.id}
                // onPointerDown fires INSTANTLY on touch — no 300ms delay
                onPointerDown={() => {
                  setPressedId(tab.id);
                  light(); // haptic fires on press, not release
                }}
                onPointerUp={() => setPressedId(null)}
                onPointerLeave={() => setPressedId(null)}
                // Prevent ghost click delay on iOS Safari
                style={{ WebkitTapHighlightColor: "transparent" }}
                className={`
                  relative flex-1 flex flex-col items-center justify-center py-1
                  touch-manipulation
                  transition-transform duration-[80ms] ease-out
                  ${isPressed ? "scale-90 opacity-70" : "scale-100 opacity-100"}
                `}
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <span className="absolute -top-[1px] h-[3px] w-6 bg-gradient-to-r from-primary-500 to-indigo-500 dark:from-primary-400 dark:to-indigo-400 rounded-full shadow-[0_2px_8px_rgba(99,102,241,0.6)] animate-in fade-in zoom-in-50 duration-150" />
                )}

                {/* Icon Container */}
                <div
                  className={`relative flex items-center justify-center w-11 h-7 rounded-full transition-all duration-150 ${
                    isActive
                      ? "bg-primary-500/10 dark:bg-primary-400/15 text-primary-600 dark:text-primary-400 shadow-sm shadow-primary-500/5 -translate-y-0.5"
                      : "text-neutral-400 dark:text-neutral-400"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    className="transition-transform duration-150"
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] tracking-tight font-medium transition-all duration-150 mt-0.5 ${
                    isActive
                      ? "text-primary-600 dark:text-primary-400 font-semibold opacity-100"
                      : "text-neutral-400 dark:text-neutral-400 opacity-80"
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
