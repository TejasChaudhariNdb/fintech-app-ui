"use client";

import React, { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import {
  Building2,
  Calendar,
  Sparkles,
  TrendingUp,
  Percent,
  Check,
  ShieldCheck,
  Clock,
} from "lucide-react";

export interface FixedIncomeFormData {
  id?: number;
  deposit_type: string;
  institution_name: string;
  account_number_or_fdr?: string;
  principal_amount: number;
  interest_rate_pct: number;
  compounding_frequency: string;
  start_date: string;
  maturity_date?: string;
  maturity_amount?: number;
  is_tax_saving?: boolean;
  notes?: string;
  profile_id?: number;
}

interface FixedIncomeFormProps {
  initialData?: FixedIncomeFormData | null;
  onSave: (data: FixedIncomeFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const PRESET_INSTITUTIONS = [
  { name: "HDFC Bank", rate: 7.25 },
  { name: "State Bank of India (SBI)", rate: 6.80 },
  { name: "ICICI Bank", rate: 7.20 },
  { name: "Post Office TD/PPF", rate: 7.50 },
  { name: "Bajaj Finance", rate: 8.10 },
  { name: "Axis Bank", rate: 7.25 },
  { name: "Kotak Mahindra Bank", rate: 7.40 },
];

const PRINCIPAL_CHIPS = [
  { label: "₹25K", val: 25000 },
  { label: "₹50K", val: 50000 },
  { label: "₹1 Lakh", val: 100000 },
  { label: "₹2.5 Lakh", val: 250000 },
  { label: "₹5 Lakh", val: 500000 },
  { label: "₹10 Lakh", val: 1000000 },
];

const TENURE_PRESETS = [
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
  { label: "2 Years", months: 24 },
  { label: "3 Years", months: 36 },
  { label: "5 Years (80C)", months: 60, is80C: true },
];

export default function FixedIncomeForm({
  initialData,
  onSave,
  onCancel,
  isSubmitting = false,
}: FixedIncomeFormProps) {
  const { profiles, activeProfileId } = useProfile();

  const [depositType, setDepositType] = useState<string>(
    initialData?.deposit_type || "BANK_FD"
  );
  const [institution, setInstitution] = useState<string>(
    initialData?.institution_name || ""
  );
  const [fdrNumber, setFdrNumber] = useState<string>(
    initialData?.account_number_or_fdr || ""
  );
  const [principalStr, setPrincipalStr] = useState<string>(
    initialData ? String(initialData.principal_amount) : ""
  );
  const [rateStr, setRateStr] = useState<string>(
    initialData ? String(initialData.interest_rate_pct) : "7.25"
  );
  const [frequency, setFrequency] = useState<string>(
    initialData?.compounding_frequency || "QUARTERLY"
  );
  const [startDate, setStartDate] = useState<string>(
    initialData?.start_date || new Date().toISOString().split("T")[0]
  );
  const [maturityDate, setMaturityDate] = useState<string>(() => {
    if (initialData?.maturity_date) return initialData.maturity_date;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [isTaxSaving, setIsTaxSaving] = useState<boolean>(
    initialData?.is_tax_saving || false
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    initialData?.profile_id
      ? String(initialData.profile_id)
      : activeProfileId !== "all"
      ? activeProfileId
      : profiles[0]?.id
      ? String(profiles[0].id)
      : ""
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-calculation of Maturity Value
  const principalNum = parseFloat(principalStr) || 0;
  const rateNum = parseFloat(rateStr) || 0;

  const calculateMaturity = () => {
    if (principalNum <= 0 || rateNum <= 0 || !startDate || !maturityDate) {
      return { maturityVal: principalNum, interestVal: 0, totalYears: 0 };
    }
    const start = new Date(startDate);
    const end = new Date(maturityDate);
    const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    const years = days / 365.25;

    let maturityVal = principalNum;
    if (frequency === "SIMPLE") {
      const interest = (principalNum * rateNum * years) / 100;
      maturityVal = principalNum + interest;
    } else {
      const freqMap: Record<string, number> = {
        MONTHLY: 12,
        QUARTERLY: 4,
        HALF_YEARLY: 2,
        ANNUALLY: 1,
      };
      const n = freqMap[frequency] || 4;
      const r = rateNum / (100 * n);
      maturityVal = principalNum * Math.pow(1 + r, n * years);
    }

    const interestVal = Math.max(0, maturityVal - principalNum);
    return { maturityVal, interestVal, totalYears: years };
  };

  const { maturityVal, interestVal, totalYears } = calculateMaturity();

  const handleApplyTenure = (months: number, is80c?: boolean) => {
    if (!startDate) return;
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + months);
    setMaturityDate(start.toISOString().split("T")[0]);
    if (is80c) setIsTaxSaving(true);
  };

  const handleSelectInstitution = (name: string, defaultRate: number) => {
    setInstitution(name);
    if (!rateStr || rateStr === "7.25") {
      setRateStr(String(defaultRate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!institution.trim()) {
      setErrorMsg("Please enter or select a bank or institution name.");
      return;
    }
    if (principalNum <= 0) {
      setErrorMsg("Please enter a valid principal deposit amount.");
      return;
    }
    if (rateNum <= 0) {
      setErrorMsg("Please enter an annual interest rate %.");
      return;
    }
    if (!startDate || !maturityDate) {
      setErrorMsg("Please select both a start date and a maturity date.");
      return;
    }
    if (new Date(maturityDate) <= new Date(startDate)) {
      setErrorMsg("Maturity date must be after the start date.");
      return;
    }

    try {
      await onSave({
        id: initialData?.id,
        deposit_type: depositType,
        institution_name: institution.trim(),
        account_number_or_fdr: fdrNumber.trim() || undefined,
        principal_amount: principalNum,
        interest_rate_pct: rateNum,
        compounding_frequency: frequency,
        start_date: startDate,
        maturity_date: maturityDate,
        maturity_amount: Math.round(maturityVal * 100) / 100,
        is_tax_saving: isTaxSaving,
        notes: notes.trim() || undefined,
        profile_id: selectedProfileId ? parseInt(selectedProfileId) : undefined,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save fixed income asset.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── PROFILE SELECTOR (If multi-profile) ── */}
      {profiles.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Deposit Holder (Profile)
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-all dark:text-white"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.relation})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── DEPOSIT TYPE SELECTOR ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          Asset Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "BANK_FD", label: "Bank FD" },
            { id: "CORPORATE_FD", label: "Corporate FD" },
            { id: "RD", label: "Recurring (RD)" },
            { id: "PPF", label: "PPF / Post Office" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setDepositType(item.id);
                if (item.id === "PPF") {
                  setRateStr("7.10");
                  setFrequency("ANNUALLY");
                  setInstitution("Post Office / SBI PPF");
                }
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                depositType === item.id
                  ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── INSTITUTION / BANK NAME ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Bank / Institution <span className="text-red-500">*</span>
          </label>
        </div>

        <div className="relative">
          <Building2
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder="e.g. HDFC Bank, SBI, Post Office, Bajaj Finance"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white outline-none transition-all placeholder:text-neutral-400"
          />
        </div>

        {/* Quick Bank Chips */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {PRESET_INSTITUTIONS.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => handleSelectInstitution(bank.name, bank.rate)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 font-medium transition-colors"
            >
              {bank.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRINCIPAL AMOUNT & RATE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Principal Amount (₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="100"
              inputMode="decimal"
              placeholder="1,00,000"
              value={principalStr}
              onChange={(e) => setPrincipalStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums"
            />
          </div>

          {/* Quick Principal Chips */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {PRINCIPAL_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setPrincipalStr(String(chip.val))}
                className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Interest Rate (% p.a.) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="25"
              inputMode="decimal"
              placeholder="7.25"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-4 py-3 text-base font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              %
            </span>
          </div>

          {/* Common Rate Chips */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {["6.80", "7.10 (PPF)", "7.25", "7.50", "8.10"].map((r) => {
              const val = r.split(" ")[0];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRateStr(val)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
                >
                  {r}%
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── COMPOUNDING FREQUENCY & TAX SAVING ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Compounding Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white outline-none"
          >
            <option value="QUARTERLY">Quarterly (Bank FD Standard)</option>
            <option value="MONTHLY">Monthly Payout / Compounding</option>
            <option value="HALF_YEARLY">Half-Yearly Compounding</option>
            <option value="ANNUALLY">Annually (PPF / Govt Bonds)</option>
            <option value="SIMPLE">Simple Interest (At Maturity)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            FDR / Account # (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. FDR-837192"
            value={fdrNumber}
            onChange={(e) => setFdrNumber(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* ── DATES & TENURE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Deposit Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Maturity Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* Quick Tenure Chips */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-neutral-400 uppercase font-semibold mr-1">
            Quick Tenure:
          </span>
          {TENURE_PRESETS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => handleApplyTenure(t.months, t.is80C)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 80C TAX SAVING TOGGLE ── */}
      <div className="flex items-center gap-2.5 pt-1">
        <input
          type="checkbox"
          id="tax_saving_checkbox"
          checked={isTaxSaving}
          onChange={(e) => setIsTaxSaving(e.target.checked)}
          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
        />
        <label
          htmlFor="tax_saving_checkbox"
          className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer font-medium flex items-center gap-1.5"
        >
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>Tax Saving Deposit (5-Year Lock-in under Section 80C)</span>
        </label>
      </div>

      {/* ── REAL-TIME COMPOUND MATURITY PREVIEW CARD ── */}
      {principalNum > 0 && rateNum > 0 && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Sparkles size={13} />
              Estimated Maturity Breakdown
            </span>
            <span>
              {totalYears > 0 ? `${totalYears.toFixed(1)} Years Tenure` : ""}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/15">
            <div>
              <div className="text-[11px] text-neutral-500">Principal</div>
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                ₹{Math.round(principalNum).toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-500">Total Interest</div>
              <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +₹{Math.round(interestVal).toLocaleString("en-IN")}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-neutral-500">Maturity Corpus</div>
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                ₹{Math.round(maturityVal).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          Notes (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Auto-renewal turned on, linked to savings account"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400"
        />
      </div>

      {/* ── ERROR MESSAGE ── */}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div className="pt-2 flex items-center gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{initialData ? "Update Deposit" : "Save Deposit Holding"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
