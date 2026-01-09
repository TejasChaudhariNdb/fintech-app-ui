"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import TransactionItem from "@/components/features/TransactionItem";
import { Loader2, FileText } from "lucide-react";
import AppSkeleton from "@/components/ui/AppSkeleton";

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  const loadTransactions = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = initial ? 0 : offset;
      const data = await api.getTransactions(currentOffset, LIMIT);
      const newTransactions = data.data || [];

      if (initial) {
        setTransactions(newTransactions);
        setLoading(false);
      } else {
        setTransactions((prev) => [...prev, ...newTransactions]);
        setLoadingMore(false);
      }

      setOffset(currentOffset + LIMIT);
      setHasMore(newTransactions.length === LIMIT);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadTransactions(true);
  }, []);

  if (loading) return <AppSkeleton />;

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      <div className="bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5 p-4 sticky top-0 z-20 transition-colors">
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Recent transactions
        </p>
      </div>

      <div className="px-4 pt-6">
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx, i) => (
              <TransactionItem
                key={`${tx.scheme_name}-${tx.date}-${i}`}
                date={tx.date}
                type={tx.type}
                amount={tx.amount}
                units={tx.units}
                schemeName={tx.scheme_name}
                amc={tx.amc}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => loadTransactions(false)}
                disabled={loadingMore}
                className="w-full py-4 text-primary-600 dark:text-primary-400 font-medium hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors flex justify-center items-center">
                {loadingMore ? (
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Load More"
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-10 text-center border-dashed border-2 border-white/10">
            <div className="flex justify-center mb-4">
              <FileText className="h-12 w-12 text-neutral-500" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              No transactions yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Upload your CAS to analyze your last 5 years of activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
