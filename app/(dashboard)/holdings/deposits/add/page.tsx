"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import FixedIncomeForm, { FixedIncomeFormData } from "@/components/features/FixedIncomeForm";

export default function AddDepositPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (data: FixedIncomeFormData) => {
    setIsSubmitting(true);
    try {
      await api.addFixedIncomeHolding(data as any);
      router.push("/holdings/deposits?added=true");
    } catch (err: any) {
      alert(err?.message || "Failed to save deposit asset");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* ── TOP HEADER WITH BACK LINK ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/holdings/deposits"
          className="p-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Back to Fixed Income Holdings"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Add Fixed Income / Deposit
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Log Bank FDs, Corporate FDs, Post Office schemes, RBI Bonds, Tax-Free Bonds, PPF, or RDs
          </p>
        </div>
      </div>

      {/* ── TRUST & TAX HIGHLIGHT BANNER ── */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>DICGC Insured &amp; Sovereign Backed</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                Safe
              </span>
            </div>
            <div className="text-[11px] text-neutral-500">
              Indian bank deposits insured up to ₹5 Lakh by RBI DICGC. Quarterly compounding calculated automatically.
            </div>
          </div>
        </div>
      </div>

      {/* ── FORM CONTAINER CARD ── */}
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-sm">
        <FixedIncomeForm
          onSave={handleSave}
          onCancel={() => router.push("/holdings/deposits")}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
