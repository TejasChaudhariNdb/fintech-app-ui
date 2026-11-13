"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Coins } from "lucide-react";
import { api } from "@/lib/api";
import GoldForm, { GoldHoldingFormData } from "@/components/features/GoldForm";
import GoldRateSource from "@/components/features/GoldRateSource";

export default function AddGoldPage() {
  const router = useRouter();
  const [rates, setRates] = useState<any>(null);
  const [loadingRates, setLoadingRates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

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
    async function loadCategories() {
      try {
        const res = await api.getGoldHoldings();
        setExistingCategories((res?.categories || []).map((c: { category: string }) => c.category));
      } catch {
        // Suggestions only; the form works without them.
      }
    }
    loadRates();
    loadCategories();
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
            Log your chains, rings, coins, SGBs or digital gold, valued at today&apos;s rate
          </p>
        </div>
      </div>

      {/* ── TODAY'S RATE WITH SOURCE ── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Coins size={18} />
          </div>
          <div className="text-xs text-neutral-900 dark:text-white tabular-nums">
            {loadingRates ? (
              <span className="text-neutral-500">Fetching today&apos;s rate...</span>
            ) : rates ? (
              <>
                <span className="font-bold">24K ₹{Math.round(rates.rate_24k_per_gram).toLocaleString("en-IN")}/g</span>
                <span className="text-neutral-500">
                  {" "}· 22K ₹{Math.round(rates.rate_22k_per_gram).toLocaleString("en-IN")} · 18K ₹
                  {Math.round(rates.rate_18k_per_gram).toLocaleString("en-IN")}
                </span>
              </>
            ) : (
              <span className="text-neutral-500">Gold rate unavailable</span>
            )}
          </div>
        </div>
        {!loadingRates && <GoldRateSource rates={rates} compact />}
      </div>

      {/* ── FORM CONTAINER CARD ── */}
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-sm">
        <GoldForm
          rates={rates}
          existingCategories={existingCategories}
          onSave={handleSave}
          onCancel={() => router.push("/holdings/gold")}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
