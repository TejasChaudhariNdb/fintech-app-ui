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
  Sparkles,
  Lightbulb,
  FileSpreadsheet,
  Shield,
  PieChart,
  TrendingUp,
  Landmark,
  Coins,
  Building,
  ChevronDown,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { usePrivacy } from "@/context/PrivacyContext";
import { useProfile } from "@/context/ProfileContext";
import { api } from "@/lib/api";

export default function SideNav() {
  const pathname = usePathname();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const { activeProfileId } = useProfile();
  const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(true);
  const [user, setUser] = useState<{
    full_name?: string;
    email?: string;
    avatar_url?: string | null;
  } | null>(null);
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);
  // Collapsed = icon-only strip for more screen space; remembered on this device.
  // The dashboard layout renders this only after its client-side auth check, so localStorage is available.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("sidenav_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidenav_collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });

  // Auto-expand holdings sub-menu whenever user is on any /holdings route or /sips
  useEffect(() => {
    if (pathname.startsWith("/holdings") || pathname.startsWith("/sips")) {
      setIsHoldingsExpanded(true);
    }
  }, [pathname]);

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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const checkUnreadUpdates = async () => {
      try {
        const res = await api.getUnreadUpdatesStatus();
        if (res && res.hasUnread !== undefined) {
          setHasUnreadUpdates(res.hasUnread);
        }
      } catch (e) {
        console.error("Failed to check unread updates status", e);
      }
    };
    checkUnreadUpdates();
  }, [pathname]);

  const mainTabs = [
    { id: "/", label: "Home", icon: Home },
    { id: "/holdings", label: "Holdings", icon: Briefcase },
    { id: "/activity", label: "Transactions", icon: Activity },
    { id: "/reports", label: "Reports", icon: FileSpreadsheet },
    { id: "/goals", label: "Goals", icon: Target },
    { id: "/insurance", label: "Insurance", icon: Shield },
    { id: "/suggestions", label: "Suggestions", icon: Lightbulb },
  ];

  const holdingsSubItems = [
    {
      id: "/holdings/mutual-funds",
      label: "Mutual Funds",
      icon: PieChart,
      dotColor: "bg-emerald-400",
    },
    {
      id: "/sips",
      label: "My SIPs",
      icon: CalendarClock,
      dotColor: "bg-teal-400",
    },
    {
      id: "/holdings/stocks",
      label: "Stocks",
      icon: TrendingUp,
      dotColor: "bg-blue-400",
    },
    {
      id: "/holdings/deposits",
      label: "Fixed Income",
      icon: Landmark,
      dotColor: "bg-cyan-400",
    },
    {
      id: "/holdings/gold",
      label: "Gold & Bullion",
      icon: Coins,
      dotColor: "bg-amber-400",
    },
    {
      id: "/holdings/real-estate",
      label: "Real Estate",
      icon: Building,
      dotColor: "bg-rose-400",
    },
  ];

  const isSettingsActive = pathname.startsWith("/profile");

  const initials = user?.full_name
    ? user.full_name.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "U";

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <aside
      id="tour-side-nav"
      className={`hidden lg:flex ${collapsed ? "w-[68px]" : "w-60"} shrink-0 flex-col bg-white dark:bg-[#0F1219] border-r border-neutral-200 dark:border-white/5 h-screen sticky top-0 z-40 transition-[width] duration-200`}
    >
      {/* Collapse / expand arrow on the sidebar's edge */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0F1219] text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 shadow-sm flex items-center justify-center"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 py-5 mb-2 ${collapsed ? "justify-center px-0" : "px-5"}`}>
        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm shadow-primary-500/30">
          <span className="text-white font-bold text-base">A</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            Arthavi
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className={`flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden min-h-0 ${collapsed ? "px-2.5" : "px-3"}`}>
        {mainTabs.map((tab) => {
          if (tab.id === "/holdings") {
            const isHoldingsActive = pathname.startsWith("/holdings");
            const Icon = tab.icon;

            return (
              <div key={tab.id} className="space-y-0.5">
                <div
                  className={`flex items-center justify-between w-full rounded-xl transition-all duration-200 group ${
                    isHoldingsActive
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold"
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white font-medium"
                  }`}>
                  <Link
                    href="/holdings"
                    onClick={() => setIsHoldingsExpanded(true)}
                    title={collapsed ? tab.label : undefined}
                    className={`flex items-center gap-3 flex-1 py-2.5 text-sm min-w-0 ${collapsed ? "justify-center px-0" : "px-3"}`}>
                    <Icon
                      size={18}
                      strokeWidth={isHoldingsActive ? 2.5 : 2}
                      className={
                        isHoldingsActive ? "text-primary-600 dark:text-primary-400" : ""
                      }
                    />
                    {!collapsed && <span className="truncate">{tab.label}</span>}
                  </Link>

                  {!collapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsHoldingsExpanded(!isHoldingsExpanded);
                    }}
                    className="p-1.5 mr-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-white/10 transition-all cursor-pointer"
                    title={isHoldingsExpanded ? "Collapse Holdings" : "Expand Holdings"}>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        isHoldingsExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>
                  )}
                </div>

                {/* Holdings Quick Submenus */}
                {isHoldingsExpanded && (
                  <div className={`my-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 ${collapsed ? "" : "ml-4 pl-3 border-l-2 border-neutral-200/70 dark:border-white/10"}`}>
                    {holdingsSubItems.map((sub) => {
                      const isSubActive =
                        pathname === sub.id || pathname.startsWith(sub.id + "/");
                      const SubIcon = sub.icon;

                      return (
                        <Link
                          key={sub.id}
                          href={sub.id}
                          title={collapsed ? sub.label : undefined}
                          className={`flex items-center gap-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 group ${collapsed ? "justify-center px-0" : "px-2.5"} ${
                            isSubActive
                              ? "bg-primary-500/10 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-bold shadow-2xs"
                              : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white font-medium"
                          }`}>
                          {!collapsed && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${sub.dotColor} shrink-0 transition-transform group-hover:scale-125`}
                          />
                          )}
                          <SubIcon
                            size={14}
                            className={`shrink-0 transition-colors ${
                              isSubActive
                                ? "text-primary-600 dark:text-primary-400"
                                : "text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
                            }`}
                          />
                          {!collapsed && <span className="truncate">{sub.label}</span>}
                          {isSubActive && !collapsed && (
                            <span className="ml-auto w-1 h-1 rounded-full bg-primary-500" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            tab.id === "/" ? pathname === "/" : pathname.startsWith(tab.id);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.id}
              title={collapsed ? tab.label : undefined}
              className={`flex items-center gap-3 w-full py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group ${collapsed ? "justify-center px-0" : "px-3"} ${
                isActive
                  ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className={
                  isActive ? "text-primary-600 dark:text-primary-400" : ""
                }
              />
              {!collapsed && tab.label}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-neutral-100 dark:bg-white/5 mx-4 my-3" />

      {/* Settings & Updates — separated at bottom of nav */}
      <div className={`pb-3 space-y-1 ${collapsed ? "px-2.5" : "px-3"}`}>
        <Link
          href="/profile"
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center gap-3 w-full py-2.5 rounded-xl ${collapsed ? "justify-center px-0" : "px-3"} transition-all duration-200 text-sm font-medium ${
            pathname === "/profile"
              ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
          }`}>
          <Settings
            size={18}
            strokeWidth={pathname === "/profile" ? 2.5 : 2}
            className={
              pathname === "/profile" ? "text-primary-600 dark:text-primary-400" : ""
            }
          />
          {!collapsed && "Settings"}
          {pathname === "/profile" && !collapsed && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
          )}
        </Link>

        <Link
          href="/profile/whats-new"
          title={collapsed ? "What's New" : undefined}
          className={`relative flex items-center gap-3 w-full py-2.5 rounded-xl ${collapsed ? "justify-center px-0" : "px-3"} transition-all duration-200 text-sm font-medium ${
            pathname === "/profile/whats-new"
              ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
          }`}>
          <Sparkles
            size={18}
            strokeWidth={pathname === "/profile/whats-new" ? 2.5 : 2}
            className={
              pathname === "/profile/whats-new" ? "text-primary-600 dark:text-primary-400" : ""
            }
          />
          {!collapsed && <>What&apos;s New</>}
          {hasUnreadUpdates && collapsed && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          )}
          {hasUnreadUpdates && !collapsed && (
            <span className="ml-auto bg-primary-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              NEW
            </span>
          )}
          {pathname === "/profile/whats-new" && !hasUnreadUpdates && !collapsed && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
          )}
        </Link>
      </div>

      {/* User Card at bottom */}
      <div className={`pb-4 border-t border-neutral-100 dark:border-white/5 pt-3 mx-0 ${collapsed ? "px-2" : "px-3"}`}>
        <div className={`flex items-center gap-2.5 py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors group ${collapsed ? "flex-col px-0" : "px-2"}`}>
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm overflow-hidden">
            {user?.avatar_url ? (
              <img
                src={
                  user.avatar_url.startsWith("http") || user.avatar_url.startsWith("data:")
                    ? user.avatar_url
                    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${user.avatar_url}`
                }
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-snug">
              {displayName}
            </p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
              {user?.email || ""}
            </p>
          </div>
          )}
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
