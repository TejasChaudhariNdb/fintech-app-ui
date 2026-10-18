"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PieChart,
  TrendingUp,
  Coins,
  Landmark,
  Shield,
  Building,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TabItem {
  id: "mutual-funds" | "stocks" | "gold" | "deposits" | "insurance" | "real-estate";
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hasLiveBadge?: boolean;
}

const TABS: TabItem[] = [
  { id: "mutual-funds", label: "Mutual Funds", path: "/holdings/mutual-funds", icon: PieChart },
  { id: "stocks", label: "Stocks", path: "/holdings/stocks", icon: TrendingUp },
  { id: "gold", label: "Gold", path: "/holdings/gold", icon: Coins, hasLiveBadge: true },
  { id: "deposits", label: "Fixed Income", path: "/holdings/deposits", icon: Landmark },
  { id: "insurance", label: "Insurance", path: "/holdings/insurance", icon: Shield },
  { id: "real-estate", label: "Real Estate", path: "/holdings/real-estate", icon: Building },
];

type TabId = TabItem["id"];

export default function HoldingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isStocks = pathname?.includes("/holdings/stocks");
  const isGold = pathname?.includes("/holdings/gold");
  const isDeposits = pathname?.includes("/holdings/deposits");
  const isInsurance = pathname?.includes("/holdings/insurance");
  const isRealEstate = pathname?.includes("/holdings/real-estate");

  const activeTab: TabId = isRealEstate
    ? "real-estate"
    : isInsurance
    ? "insurance"
    : isDeposits
    ? "deposits"
    : isGold
    ? "gold"
    : isStocks
    ? "stocks"
    : "mutual-funds";

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  // Auto-scroll active tab into view when route changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
    const timer = setTimeout(checkScroll, 350);
    return () => clearTimeout(timer);
  }, [activeTab, checkScroll]);

  const scrollByAmount = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleTabChange = (tabId: TabId) => {
    router.push(`/holdings/${tabId}`);
  };

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Holdings
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Portfolio assets, bullion, fixed deposits &amp; family protection
          </p>
        </div>

        {/* Mobile Swipe / Scroll Hint */}
        {canScrollRight && (
          <span className="sm:hidden text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-0.5 animate-pulse">
            Scroll <ChevronRight size={12} />
          </span>
        )}
      </div>

      {/* Tab Switcher with Interactive Scroll Arrows and Edge Fades */}
      <div className="sticky top-16 z-20 mb-6 border-b border-neutral-200/70 dark:border-white/5 bg-neutral-50/95 dark:bg-[#0B0E14]/90 backdrop-blur-xl">
        <div className="px-2 sm:px-4 py-2.5 relative flex items-center">
          {/* Left Arrow Button / Gradient Fade */}
          {canScrollLeft && (
            <div className="absolute left-1 z-10 flex items-center h-full pl-1 pr-3 bg-gradient-to-r from-neutral-50 via-neutral-50/95 to-transparent dark:from-[#0B0E14] dark:via-[#0B0E14]/95 dark:to-transparent pointer-events-auto">
              <button
                type="button"
                onClick={() => scrollByAmount(-180)}
                className="p-1.5 rounded-full bg-white dark:bg-[#1A202C] shadow-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Scroll left"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}

          {/* Scrollable Tabs */}
          <div
            ref={scrollContainerRef}
            className="bg-neutral-100/90 dark:bg-white/5 p-1 rounded-2xl flex gap-1 overflow-x-auto no-scrollbar scroll-smooth w-full touch-pan-x"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon
                    size={15}
                    className={
                      isActive
                        ? tab.id === "gold"
                          ? "text-amber-500"
                          : tab.id === "deposits"
                          ? "text-emerald-500"
                          : tab.id === "insurance"
                          ? "text-indigo-500"
                          : "text-primary-600 dark:text-primary-400"
                        : "text-neutral-400 dark:text-neutral-500"
                    }
                  />
                  <span>{tab.label}</span>
                  {tab.hasLiveBadge && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5"
                      title="Live Online Rates"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Arrow Button / Gradient Fade */}
          {canScrollRight && (
            <div className="absolute right-1 z-10 flex items-center h-full pr-1 pl-3 bg-gradient-to-l from-neutral-50 via-neutral-50/95 to-transparent dark:from-[#0B0E14] dark:via-[#0B0E14]/95 dark:to-transparent pointer-events-auto">
              <button
                type="button"
                onClick={() => scrollByAmount(180)}
                className="p-1.5 rounded-full bg-white dark:bg-[#1A202C] shadow-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                title="Scroll right to see more instruments"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
