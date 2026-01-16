"use client";

import { usePathname, useRouter } from "next/navigation";

export default function HoldingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isStocks = pathname?.includes("/holdings/stocks");
  const activeTab = isStocks ? "stocks" : "mutual-funds";

  const handleTabChange = (tab: "mutual-funds" | "stocks") => {
    router.push(`/holdings/${tab}`);
  };

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Holdings
        </h1>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 mb-6">
        <div className="bg-neutral-100 dark:bg-white/5 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => handleTabChange("mutual-funds")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === "mutual-funds"
                ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}>
            Mutual Funds
          </button>
          <button
            onClick={() => handleTabChange("stocks")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === "stocks"
                ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}>
            Stocks
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
