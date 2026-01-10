"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import TransactionItem from "@/components/features/TransactionItem";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { ArrowLeft, AlertCircle, Share2 } from "lucide-react";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { useHaptic } from "@/lib/hooks/useHaptic";
import Button from "@/components/ui/Button";
import ShareStockModal from "@/components/features/ShareStockModal";

export default function SchemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const { light } = useHaptic();

  useEffect(() => {
    loadScheme();
  }, [id]);

  const loadScheme = async () => {
    try {
      // 1. Try Cache
      const cacheKey = `scheme-${id}`;
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setScheme(JSON.parse(cached).data);
          setLoading(false);
        }
      }

      const data = await api.getSchemeDetail(Number(id));
      setScheme(data);
    } catch (err) {
      console.error("Error loading scheme:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    light();
    router.back();
  };

  const handleShare = () => {
    light();
    setShowShareModal(true);
  };

  if (loading && !scheme) return <AppSkeleton />;

  if (!scheme && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-12 h-12 text-neutral-400 mb-4" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          Scheme Not Found
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
          The scheme you are looking for does not exist or has been removed.
        </p>
        <Button onClick={handleBack} variant="secondary">
          Go Back
        </Button>
      </div>
    );
  }

  const isPositive = scheme.profit >= 0;

  const shareData = {
    symbol: scheme.scheme,
    value: scheme.current,
    pnl_pct: scheme.return_pct,
    amc: scheme.amc,
  };

  return (
    <div className="pb-20 min-h-screen bg-neutral-50 dark:bg-[#0B0E14] animate-fade-in text-neutral-900 dark:text-white transition-colors">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate pr-2">
                {scheme.scheme}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {scheme.amc}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-2xl mx-auto">
        {/* Unified Hero Card */}
        <div className="bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden transition-all relative group">
          {/* Share Button Inside Card */}
          <button
            onClick={handleShare}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors z-10"
            title="Share Snapshot">
            <Share2 size={18} />
          </button>

          {/* Top Section: Current Value & P/L */}
          <div className="p-6 border-b border-dashed border-neutral-200 dark:border-white/10">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Current Value
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                <PrivacyMask>
                  ₹{scheme.current.toLocaleString("en-IN")}
                </PrivacyMask>
              </h2>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2 ${
                  isPositive
                    ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                }`}>
                <span>
                  {isPositive ? "+" : ""}₹
                  {Math.abs(scheme.profit).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="opacity-40">|</span>
                <span>{scheme.return_pct.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Grid Stats */}
          <div className="grid grid-cols-3 p-4 bg-neutral-50/50 dark:bg-white/5 divide-x divide-neutral-200 dark:divide-white/5">
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                Invested
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>
                  ₹{scheme.invested.toLocaleString("en-IN")}
                </PrivacyMask>
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                NAV
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                ₹{scheme.nav.toFixed(2)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {new Date(scheme.nav_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                Units
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {scheme.units.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div>
          <h3 className="text-lg font-bold mb-4 px-1 flex items-center gap-2">
            history
            <span className="text-xs font-normal text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              {scheme.transactions?.length || 0} Transactions
            </span>
          </h3>

          <div className="space-y-3">
            {scheme.transactions && scheme.transactions.length > 0 ? (
              scheme.transactions.map((tx: any, i: number) => (
                <TransactionItem
                  key={i}
                  date={tx.date}
                  type={tx.type}
                  amount={tx.amount}
                  units={tx.units}
                  schemeName={scheme.scheme}
                  amc={scheme.amc}
                />
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-white/5 rounded-2xl">
                <p className="text-neutral-500 dark:text-neutral-400">
                  No transaction history found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareStockModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        stock={shareData}
      />
    </div>
  );
}
