"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Briefcase,
  Activity,
  Target,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

import { usePrivacy } from "@/context/PrivacyContext";
import { api } from "@/lib/api";

export default function SideNav() {
  const pathname = usePathname();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [user, setUser] = useState<{
    full_name?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await api.getUserProfile();
        setUser(data);
      } catch (e) {
        console.error("Failed to load user for sidebar", e);
      }
    };
    loadUser();
  }, []);

  const mainTabs = [
    { id: "/", label: "Home", icon: Home },
    { id: "/holdings", label: "Holdings", icon: Briefcase },
    { id: "/activity", label: "Activity", icon: Activity },
    { id: "/goals", label: "Goals", icon: Target },
  ];

  const isSettingsActive = pathname.startsWith("/profile");

  const initials = user?.full_name
    ? user.full_name.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "U";

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <aside className="hidden lg:flex w-60 flex-col bg-white dark:bg-[#0F1219] border-r border-neutral-200 dark:border-white/5 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 mb-2">
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm shadow-primary-500/30">
          <span className="text-white font-bold text-base">A</span>
        </div>
        <span className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
          Arthavi
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {mainTabs.map((tab) => {
          const isActive =
            tab.id === "/" ? pathname === "/" : pathname.startsWith(tab.id);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.id}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group ${
                isActive
                  ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className={
                  isActive ? "text-primary-600 dark:text-primary-400" : ""
                }
              />
              {tab.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-neutral-100 dark:bg-white/5 mx-4 my-3" />

      {/* Settings — separated at bottom of nav */}
      <div className="px-3 pb-3">
        <Link
          href="/profile"
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
            isSettingsActive
              ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
          }`}>
          <Settings
            size={18}
            strokeWidth={isSettingsActive ? 2.5 : 2}
            className={
              isSettingsActive ? "text-primary-600 dark:text-primary-400" : ""
            }
          />
          Settings
          {isSettingsActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
          )}
        </Link>
      </div>

      {/* User Card at bottom */}
      <div className="px-3 pb-4 border-t border-neutral-100 dark:border-white/5 pt-3 mx-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors group">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-snug">
              {displayName}
            </p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
              {user?.email || ""}
            </p>
          </div>
          {/* Privacy toggle */}
          <button
            onClick={togglePrivacyMode}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors shrink-0"
            title={isPrivacyMode ? "Show balances" : "Hide balances"}>
            {isPrivacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
