"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import AppSkeleton from "@/components/ui/AppSkeleton";
import TransactionItem from "@/components/features/TransactionItem";
import Button from "@/components/ui/Button";
import { Search, Calendar, Filter, Download } from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, BUY, SELL, SIP, DIVIDEND
  const { light } = useHaptic();

  const LIMIT = 20;

  const loadTransactions = async (skip: number, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        // Try Cache for first page
        if (skip === 0 && typeof window !== "undefined") {
          const cached = localStorage.getItem(`transactions-0-${LIMIT}`);
          if (cached) {
            try {
              const cachedData = JSON.parse(cached).data;
              setTransactions(cachedData.data || []);
              setLoading(false); // Show immediately
            } catch (e) {
              console.warn("Invalid transaction cache");
            }
          }
        }
      } else {
        setLoadingMore(true);
      }

      const data = await api.getTransactions(skip, LIMIT);

      const newTransactions = data.data || [];

      if (isLoadMore) {
        setTransactions((prev) => [...prev, ...newTransactions]);
      } else {
        setTransactions(newTransactions);
      }

      setHasMore(newTransactions.length === LIMIT);
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadTransactions(0);
  }, []); // Initial load

  const handleLoadMore = () => {
    light();
    const nextPage = page + 1;
    setPage(nextPage);
    loadTransactions(nextPage * LIMIT, true);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.scheme_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.amc || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === "ALL") return matchesSearch;

    const typeUpper = (t.type || "").toUpperCase();
    if (filterType === "BUY")
      return (
        matchesSearch &&
        (typeUpper.includes("PURCHASE") || typeUpper.includes("SIP"))
      );
    if (filterType === "SELL")
      return matchesSearch && typeUpper.includes("REDEMPTION");
    if (filterType === "SIP") return matchesSearch && typeUpper.includes("SIP");
    if (filterType === "TAX")
      return (
        matchesSearch &&
        (typeUpper.includes("TAX") || typeUpper.includes("STAMP"))
      );

    return matchesSearch && typeUpper.includes(filterType);
  });

  // Group by Month
  const groupedTransactions = filteredTransactions.reduce(
    (groups: any, transaction) => {
      const date = new Date(transaction.date);
      const monthYear = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(transaction);
      return groups;
    },
    {}
  );

  if (loading && transactions.length === 0) return <AppSkeleton />;

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header */}
      <div className="bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5 p-4 sticky top-0 z-20 transition-colors flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track your transaction history
          </p>
        </div>
        <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 dark:text-neutral-400">
          <Download size={20} />
        </button>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {["ALL", "BUY", "SELL", "SIP", "TAX"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  light();
                  setFilterType(type);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border ${
                  filterType === type
                    ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20"
                    : "bg-white dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-white/10"
                }`}>
                {type === "ALL" ? "All Activity" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-8">
          {Object.keys(groupedTransactions).length > 0 ? (
            Object.keys(groupedTransactions).map((month) => (
              <div key={month}>
                <h3 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-4 flex items-center gap-2">
                  <Calendar size={14} />
                  {month}
                </h3>
                <div className="space-y-3">
                  {groupedTransactions[month].map((t: any, idx: number) => (
                    <TransactionItem
                      key={`${t.date}-${idx}`}
                      type={t.type}
                      schemeName={t.scheme_name}
                      amc={t.amc}
                      amount={t.amount}
                      date={t.date}
                      units={t.units}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex p-4 rounded-full bg-neutral-100 dark:bg-white/5 mb-4">
                <Filter className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                No transactions found
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-4 pb-8">
              <Button
                onClick={handleLoadMore}
                variant="ghost"
                isLoading={loadingMore}
                className="w-full py-4 text-primary-600 dark:text-primary-400 font-medium hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors flex justify-center items-center">
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
