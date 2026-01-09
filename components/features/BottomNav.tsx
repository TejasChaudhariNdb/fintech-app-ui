"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, Activity, Target, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: "/", label: "Home", icon: Home },
    { id: "/holdings", label: "Holdings", icon: Briefcase },
    { id: "/activity", label: "Activity", icon: Activity },
    { id: "/goals", label: "Goals", icon: Target },
    { id: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#151A23]/90 backdrop-blur-lg border-t border-neutral-200 dark:border-white/5 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.id)}
              className={`flex flex-col items-center gap-1.5 px-3 py-2 transition-all duration-300 min-w-[64px] rounded-2xl ${
                isActive
                  ? "text-primary-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}>
              <span
                className={`transition-transform duration-300 ${
                  isActive ? "-translate-y-1 scale-110" : ""
                }`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span
                className={`text-[10px] font-medium transition-opacity ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
