"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Heart } from "lucide-react";
import { api } from "@/lib/api";
import InsurancePolicyForm, { InsurancePolicyFormData } from "@/components/features/InsurancePolicyForm";

export default function AddInsurancePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (data: InsurancePolicyFormData) => {
    setIsSubmitting(true);
    try {
      await api.addInsurancePolicy(data as any);
      router.push("/insurance?added=true");
    } catch (err: any) {
      alert(err?.message || "Failed to save insurance policy");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* ── TOP HEADER WITH BACK LINK ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/insurance"
          className="p-2 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Back to Insurance Vault"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Add Policy to Vault
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Securely track family life cover, health insurance, and premium renewal dates
          </p>
        </div>
      </div>

      {/* ── PROTECTION GUIDELINE BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>Financial Protection Benchmark</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded font-semibold">
                IRDAI Standard
              </span>
            </div>
            <div className="text-[11px] text-neutral-500">
              Recommended Term Life cover: 10x-15x of annual income. Recommended Health Cover: minimum ₹10-15 Lakhs family floater.
            </div>
          </div>
        </div>
      </div>

      {/* ── FORM CONTAINER CARD ── */}
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-sm">
        <InsurancePolicyForm
          onSave={handleSave}
          onCancel={() => router.push("/insurance")}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
