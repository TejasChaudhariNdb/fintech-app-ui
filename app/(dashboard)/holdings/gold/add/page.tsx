"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Coins, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import GoldForm, { GoldHoldingFormData } from "@/components/features/GoldForm";

export default function AddGoldPage() {
  const router = useRouter();
  const [rates, setRates] = useState<any>(null);
  const [loadingRates, setLoadingRates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadRates() {
      try {
        const res = await api.getGoldRates();
        setRates(res);
      } catch (e) {
        console.error("Failed to load gold rates:", e);
      } finally {
        setLoadingRates(false);
      }
    }
    loadRates();
  }, []);

  const handleSave = async (data: GoldHoldingFormData) => {
    setIsSubmitting(true);
    try {
      await api.addGoldHolding(data as any);
      router.push("/holdings/gold?added=true");
    } catch (err: any) {
      alert(err?.message || "Failed to save gold asset");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* ── TOP HEADER WITH BACK LINK ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/holdings/gold"
          className="p-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Back to Gold Holdings"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Add Gold Holding
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Log your jewelry, coins, bars, or SGBs with real-time value tracking
          </p>
        </div>
      </div>

      {/* ── LIVE RATES HIGHLIGHT BANNER ── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Coins size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>Today&apos;s Live Gold Benchmark</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                Live
              </span>
            </div>
            <div className="text-[11px] text-neutral-500">
              {loadingRates ? (
                "Fetching latest rates..."
              ) : (
                <>
                  24K: ₹{Math.round(rates?.rate_24k_per_gram || 13500).toLocaleString("en-IN")}/g · 22K: ₹
                  {Math.round(rates?.rate_22k_per_gram || 12375).toLocaleString("en-IN")}/g
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FORM CONTAINER CARD ── */}
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-sm">
        <GoldForm
          rates={rates}
          onSave={handleSave}
          onCancel={() => router.push("/holdings/gold")}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
