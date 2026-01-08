"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import TransactionItem from "@/components/features/TransactionItem";
import { Loader2, FileText } from "lucide-react";

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions(0, 50);
      setTransactions(data.data || []);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );

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
                key={i}
                date={tx.date}
                type={tx.type}
                amount={tx.amount}
                units={tx.units}
                schemeName={tx.scheme_name}
                amc={tx.amc}
              />
            ))}
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
