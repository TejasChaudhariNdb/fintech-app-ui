"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Briefcase, Activity, Target, Settings } from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";

export default function BottomNav() {
  const pathname = usePathname();
  const { light } = useHaptic();

  const tabs = [
    { id: "/", label: "Home", icon: Home },
    { id: "/holdings", label: "Holdings", icon: Briefcase },
    { id: "/activity", label: "Activity", icon: Activity },
    { id: "/goals", label: "Goals", icon: Target },
    { id: "/profile", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#151A23]/90 backdrop-blur-lg border-t border-neutral-200 dark:border-white/5 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.id === "/" ? pathname === "/" : pathname.startsWith(tab.id);

          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.id}
              onClick={() => {
                light();
              }}
              className={`flex flex-col items-center gap-1 px-2 py-2 transition-all duration-300 min-w-[58px] rounded-2xl ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}>
              <span
                className={`transition-all duration-300 rounded-2xl px-3 py-1.5 ${
                  isActive
                    ? "bg-primary-100 dark:bg-primary-500/15 -translate-y-0.5"
                    : "bg-transparent"
                }`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </span>
              <span
                className={`text-[9.5px] font-semibold transition-all ${
                  isActive ? "opacity-100" : "opacity-50"
                }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
