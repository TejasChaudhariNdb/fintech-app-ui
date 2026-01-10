"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, Activity, Target, User } from "lucide-react";

export default function SideNav() {
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
    <aside className="hidden lg:flex w-64 flex-col bg-surface border-r border-neutral-200 dark:border-white/5 h-screen sticky top-0 p-4">
      <div className="flex items-center gap-3 px-4 py-4 mb-6">
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-xl">A</span>
        </div>
        <span className="text-xl font-bold text-neutral-900 dark:text-white">
          Arthavi
        </span>
      </div>

      <nav className="space-y-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.id)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive
                  ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-white"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <Icon
                size={20}
                className={
                  isActive ? "text-primary-600 dark:text-primary-400" : ""
                }
              />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 py-4 border-t border-neutral-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            TE
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Tejas
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Pro Member
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
