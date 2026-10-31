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
  HelpCircle,
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
  current_balance?: number;
  balance_as_of_date?: string;
  cumulative_deposits?: number;
  planned_annual_deposit?: number;
}

interface FixedIncomeFormProps {
  initialData?: FixedIncomeFormData | null;
  onSave: (data: FixedIncomeFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const PRESETS_BY_TYPE: Record<
  string,
  { label: string; name: string; rate: number; freq?: string; tenureMonths?: number; is80C?: boolean }[]
> = {
  BANK_FD: [
    { label: "SBI (6.8%)", name: "State Bank of India (SBI)", rate: 6.80, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "HDFC (7.25%)", name: "HDFC Bank", rate: 7.25, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "ICICI (7.2%)", name: "ICICI Bank", rate: 7.20, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "Axis (7.25%)", name: "Axis Bank", rate: 7.25, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "PNB (6.8%)", name: "Punjab National Bank (PNB)", rate: 6.80, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "Kotak (7.4%)", name: "Kotak Mahindra Bank", rate: 7.40, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "KVB (7.5%)", name: "Karur Vysya Bank (KVB)", rate: 7.50, freq: "QUARTERLY", tenureMonths: 12 },
  ],
  CORPORATE_FD: [
    { label: "Bajaj Finance (8.1%)", name: "Bajaj Finance", rate: 8.10, freq: "QUARTERLY", tenureMonths: 24 },
    { label: "Shriram (8.5%)", name: "Shriram Finance (SRTF)", rate: 8.50, freq: "QUARTERLY", tenureMonths: 24 },
    { label: "M&M Finance (8.05%)", name: "Mahindra Finance (M & M)", rate: 8.05, freq: "QUARTERLY", tenureMonths: 24 },
    { label: "Tata Capital (7.9%)", name: "Tata Capital", rate: 7.90, freq: "QUARTERLY", tenureMonths: 24 },
    { label: "HDFC Ltd (7.5%)", name: "HDFC Ltd (Legacy)", rate: 7.50, freq: "QUARTERLY", tenureMonths: 24 },
  ],
  POST_OFFICE: [
    { label: "PO-TD: 1-5 Yr (7.5%)", name: "Post Office Time Deposit (PO-TD)", rate: 7.50, freq: "QUARTERLY", tenureMonths: 60, is80C: true },
    { label: "PO-MIS: Monthly (7.4%)", name: "Post Office Monthly Income (PO-MIS)", rate: 7.40, freq: "MONTHLY", tenureMonths: 60 },
    { label: "PO-SCSS: Senior (8.2%)", name: "Senior Citizen Savings (PO-SCSS)", rate: 8.20, freq: "QUARTERLY", tenureMonths: 60, is80C: true },
    { label: "NSC: 5-Yr (7.7%)", name: "National Savings Certificate (NSC)", rate: 7.70, freq: "ANNUALLY", tenureMonths: 60, is80C: true },
    { label: "KVP (7.5%)", name: "Kisan Vikas Patra (KVP)", rate: 7.50, freq: "ANNUALLY", tenureMonths: 115 },
  ],
  RBI_BOND: [
    { label: "RBI FRSB (8.05%)", name: "RBI Floating Rate Savings Bonds (FRSB)", rate: 8.05, freq: "HALF_YEARLY", tenureMonths: 84 },
    { label: "Sovereign G-Sec (7.1%)", name: "RBI Retail Direct Sovereign G-Sec", rate: 7.10, freq: "HALF_YEARLY", tenureMonths: 120 },
  ],
  TAX_FREE_BOND: [
    { label: "HUDCO (8.2%)", name: "HUDCO Tax-Free Bond", rate: 8.20, freq: "ANNUALLY", tenureMonths: 120, is80C: true },
    { label: "NHAI (8.3%)", name: "NHAI Tax-Free Bond", rate: 8.30, freq: "ANNUALLY", tenureMonths: 120, is80C: true },
    { label: "NTPC (8.41%)", name: "NTPC Tax-Free Bond", rate: 8.41, freq: "ANNUALLY", tenureMonths: 120, is80C: true },
    { label: "REC (8.12%)", name: "REC Tax-Free Bond", rate: 8.12, freq: "ANNUALLY", tenureMonths: 120, is80C: true },
    { label: "PFC / IRFC (8.0%)", name: "PFC / IRFC Tax-Free Bond", rate: 8.00, freq: "ANNUALLY", tenureMonths: 120, is80C: true },
  ],
  PPF: [
    { label: "SBI PPF (7.1%)", name: "State Bank of India PPF", rate: 7.10, freq: "ANNUALLY", tenureMonths: 180, is80C: true },
    { label: "Post Office PPF (7.1%)", name: "Post Office PPF", rate: 7.10, freq: "ANNUALLY", tenureMonths: 180, is80C: true },
    { label: "HDFC PPF (7.1%)", name: "HDFC Bank PPF", rate: 7.10, freq: "ANNUALLY", tenureMonths: 180, is80C: true },
    { label: "ICICI PPF (7.1%)", name: "ICICI Bank PPF", rate: 7.10, freq: "ANNUALLY", tenureMonths: 180, is80C: true },
  ],
  RD: [
    { label: "SBI RD (6.8%)", name: "State Bank of India RD", rate: 6.80, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "HDFC RD (7.1%)", name: "HDFC Bank RD", rate: 7.10, freq: "QUARTERLY", tenureMonths: 12 },
    { label: "PO 5-Yr RD (6.7%)", name: "Post Office 5-Year RD", rate: 6.70, freq: "QUARTERLY", tenureMonths: 60 },
  ],
};

const ASSET_TYPES = [
  { id: "BANK_FD", label: "Bank FD" },
  { id: "CORPORATE_FD", label: "Corporate FD" },
  { id: "POST_OFFICE", label: "Post Office" },
  { id: "RBI_BOND", label: "RBI Bonds" },
  { id: "TAX_FREE_BOND", label: "Tax-Free Bonds" },
  { id: "PPF", label: "PPF" },
  { id: "RD", label: "Recurring (RD)" },
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
  { label: "5 Years", months: 60 },
  { label: "7 Years (RBI)", months: 84 },
  { label: "10 Years (Tax-Free)", months: 120 },
];

const PPF_TENURE_PRESETS = [
  { label: "15 Years (Full Term)", months: 180 },
  { label: "5-Yr Extension", months: 60 },
  { label: "10-Yr Extension", months: 120 },
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

  // For standard FD: principal amount. For PPF: fallback or sync with current balance
  const [principalStr, setPrincipalStr] = useState<string>(
    initialData ? String(initialData.principal_amount) : ""
  );

  // PPF Specific fields
  const [currentBalanceStr, setCurrentBalanceStr] = useState<string>(
    initialData?.current_balance
      ? String(initialData.current_balance)
      : initialData?.deposit_type === "PPF" && initialData?.principal_amount
      ? String(initialData.principal_amount)
      : ""
  );
  const [balanceAsOfDate, setBalanceAsOfDate] = useState<string>(
    initialData?.balance_as_of_date || new Date().toISOString().split("T")[0]
  );
  const [cumulativeDepositsStr, setCumulativeDepositsStr] = useState<string>(
    initialData?.cumulative_deposits ? String(initialData.cumulative_deposits) : ""
  );
  const [plannedAnnualDepositStr, setPlannedAnnualDepositStr] = useState<string>(
    initialData?.planned_annual_deposit !== undefined && initialData?.planned_annual_deposit !== null
      ? String(initialData.planned_annual_deposit)
      : "150000"
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
    d.setFullYear(d.getFullYear() + (initialData?.deposit_type === "PPF" ? 15 : 1));
    return d.toISOString().split("T")[0];
  });
  const [isTaxSaving, setIsTaxSaving] = useState<boolean>(
    initialData?.is_tax_saving || (initialData?.deposit_type === "PPF") || false
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    if (initialData?.profile_id) return String(initialData.profile_id);
    if (activeProfileId && activeProfileId !== "all") return activeProfileId;
    return profiles[0]?.id ? String(profiles[0].id) : "";
  });

  useEffect(() => {
    if (initialData?.profile_id) {
      setSelectedProfileId(String(initialData.profile_id));
    } else if (activeProfileId && activeProfileId !== "all") {
      setSelectedProfileId(activeProfileId);
    } else if (profiles && profiles.length > 0 && !selectedProfileId) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      if (def) setSelectedProfileId(String(def.id));
    }
  }, [activeProfileId, profiles, initialData]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPPF = depositType === "PPF" || depositType === "EPF";

  // Auto-calculation of Maturity Value
  const principalNum = isPPF
    ? parseFloat(currentBalanceStr) || parseFloat(principalStr) || 0
    : parseFloat(principalStr) || 0;
  const rateNum = parseFloat(rateStr) || 0;
  const cumulativeDepositsNum = parseFloat(cumulativeDepositsStr) || 0;
  const plannedAnnualDepositNum = parseFloat(plannedAnnualDepositStr) || 0;

  const calculateMaturity = () => {
    if (principalNum <= 0 || rateNum <= 0 || !startDate || !maturityDate) {
      return { maturityVal: principalNum, interestVal: 0, totalYears: 0 };
    }

    const start = new Date(startDate);
    const end = new Date(maturityDate);
    const now = new Date();
    const r = rateNum / 100;

    if (isPPF) {
      // Forward projection from current balance as of balance date to maturity date
      const balDate = balanceAsOfDate ? new Date(balanceAsOfDate) : now;
      let effectiveCurrentVal = principalNum;

      if (now > balDate) {
        const daysSince = Math.max(0, (now.getTime() - balDate.getTime()) / (1000 * 3600 * 24));
        const yrsSince = daysSince / 365.25;
        effectiveCurrentVal = principalNum * (1 + r * yrsSince);
      }

      const daysToMat = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const remYears = daysToMat / 365.25;
      const fullYears = Math.floor(remYears);
      const remFrac = remYears - fullYears;

      const fvBalance = effectiveCurrentVal * Math.pow(1 + r, fullYears) * (1 + r * remFrac);

      let fvDeposits = 0;
      if (plannedAnnualDepositNum > 0 && fullYears >= 1) {
        for (let y = 1; y <= fullYears; y++) {
          const yrsLeft = remYears - y + 1;
          fvDeposits += plannedAnnualDepositNum * Math.pow(1 + r, yrsLeft);
        }
      }

      const maturityVal = fvBalance + fvDeposits;
      const investedBaseline = cumulativeDepositsNum > 0 ? cumulativeDepositsNum : principalNum;
      const interestVal = Math.max(0, maturityVal - investedBaseline);
      const totalYears = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24)) / 365.25;

      return { maturityVal, interestVal, totalYears };
    }

    // Standard FD calculation
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
      const ratePerPeriod = rateNum / (100 * n);
      maturityVal = principalNum * Math.pow(1 + ratePerPeriod, n * years);
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

  const handleSelectPreset = (preset: {
    name: string;
    rate: number;
    freq?: string;
    tenureMonths?: number;
    is80C?: boolean;
  }) => {
    setInstitution(preset.name);
    setRateStr(String(preset.rate));
    if (preset.freq) setFrequency(preset.freq);
    if (preset.is80C !== undefined) setIsTaxSaving(preset.is80C);
    if (preset.tenureMonths && startDate) {
      const st = new Date(startDate);
      st.setMonth(st.getMonth() + preset.tenureMonths);
      setMaturityDate(st.toISOString().split("T")[0]);
    }
  };

  const handleTypeChange = (typeId: string) => {
    setDepositType(typeId);
    const presets = PRESETS_BY_TYPE[typeId] || [];
    if (presets.length > 0) {
      const first = presets[0];
      setInstitution(first.name);
      setRateStr(String(first.rate));
      if (first.freq) setFrequency(first.freq);
      if (first.is80C !== undefined) setIsTaxSaving(first.is80C);
      if (first.tenureMonths && startDate) {
        const st = new Date(startDate);
        st.setMonth(st.getMonth() + first.tenureMonths);
        setMaturityDate(st.toISOString().split("T")[0]);
      }
    }
    if (typeId === "PPF") {
      setRateStr("7.10");
      setFrequency("ANNUALLY");
      setIsTaxSaving(true);
      if (startDate) {
        const st = new Date(startDate);
        st.setFullYear(st.getFullYear() + 15);
        setMaturityDate(st.toISOString().split("T")[0]);
      }
    } else if (typeId === "TAX_FREE_BOND") {
      setFrequency("ANNUALLY");
      setIsTaxSaving(true);
    } else if (typeId === "RBI_BOND") {
      setFrequency("HALF_YEARLY");
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
      setErrorMsg(
        isPPF
          ? "Please enter your current PPF account balance."
          : "Please enter a valid principal deposit amount."
      );
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

    const resolvedProfileId = selectedProfileId
      ? parseInt(selectedProfileId)
      : activeProfileId !== "all"
      ? parseInt(activeProfileId)
      : profiles.find((p) => p.is_default)?.id || profiles[0]?.id;

    try {
      await onSave({
        id: initialData?.id,
        deposit_type: depositType,
        institution_name: institution.trim(),
        account_number_or_fdr: fdrNumber.trim() || undefined,
        principal_amount: principalNum,
        interest_rate_pct: rateNum,
        compounding_frequency: isPPF ? "ANNUALLY" : frequency,
        start_date: startDate,
        maturity_date: maturityDate,
        maturity_amount: Math.round(maturityVal * 100) / 100,
        is_tax_saving: isPPF ? true : isTaxSaving,
        notes: notes.trim() || undefined,
        profile_id: resolvedProfileId || undefined,
        current_balance: isPPF ? principalNum : undefined,
        balance_as_of_date: isPPF ? balanceAsOfDate : undefined,
        cumulative_deposits: isPPF && cumulativeDepositsNum > 0 ? cumulativeDepositsNum : undefined,
        planned_annual_deposit: isPPF ? plannedAnnualDepositNum : undefined,
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
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {ASSET_TYPES.map((item) => {
            const isSelected = depositType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTypeChange(item.id)}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer select-none ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/25 font-bold"
                    : "bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 hover:border-neutral-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CATEGORY HIGHLIGHT BANNER ── */}
      {depositType === "TAX_FREE_BOND" && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>100% Tax-Free Coupon:</strong> Annual interest received from PSU Tax-Free Bonds (HUDCO, NHAI, NTPC, etc.) is completely exempt from income tax under Section 10(15)(iv)(h).
          </span>
        </div>
      )}
      {depositType === "POST_OFFICE" && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Building2 size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Post Office Small Savings Schemes:</strong> Backed directly by the Government of India. Supports PO-TD (Time Deposit), PO-MIS (Monthly Income), PO-SCSS (Senior Citizens), and NSC/KVP.
          </span>
        </div>
      )}
      {depositType === "RBI_BOND" && (
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>Sovereign RBI Bonds:</strong> RBI Floating Rate Savings Bonds (FRSB) pay semi-annual interest (pegged to NSC rate + 0.35%) with sovereign safety.
          </span>
        </div>
      )}

      {/* ── INSTITUTION / BANK NAME ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            {depositType === "POST_OFFICE"
              ? "Post Office Scheme / Branch"
              : depositType === "RBI_BOND"
              ? "Bond Name / Issuing Bank"
              : depositType === "TAX_FREE_BOND"
              ? "Tax-Free PSU Issuer (e.g. HUDCO, NHAI)"
              : isPPF
              ? "Bank / Post Office Branch"
              : "Bank / Institution"}{" "}
            <span className="text-red-500">*</span>
          </label>
        </div>

        <div className="relative">
          <Building2
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder={
              depositType === "POST_OFFICE"
                ? "e.g. Post Office (PO-MIS), Post Office (PO-TD)"
                : depositType === "RBI_BOND"
                ? "e.g. RBI Floating Rate Savings Bond, Sovereign G-Sec"
                : depositType === "TAX_FREE_BOND"
                ? "e.g. HUDCO, NHAI, NTPC Tax-Free Bond"
                : depositType === "CORPORATE_FD"
                ? "e.g. Bajaj Finance, Shriram Finance, Mahindra Finance"
                : isPPF
                ? "e.g. SBI PPF, Post Office PPF, HDFC Bank PPF"
                : "e.g. HDFC Bank, State Bank of India, Axis Bank"
            }
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white outline-none transition-all placeholder:text-neutral-400"
          />
        </div>

        {PRESETS_BY_TYPE[depositType] && PRESETS_BY_TYPE[depositType].length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold mr-0.5">
              Presets:
            </span>
            {PRESETS_BY_TYPE[depositType].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  institution === preset.name
                    ? "bg-emerald-600 text-white shadow-2xs font-semibold ring-1 ring-emerald-500"
                    : "bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {preset.label || preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── PPF SPECIALIZED FORM SECTION ── */}
      {isPPF ? (
        <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              PPF Balance &amp; Contributions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                Current Account Balance (₹) <span className="text-red-500">*</span>
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
                  placeholder="e.g. 23,21,699"
                  value={currentBalanceStr || principalStr}
                  onChange={(e) => {
                    setCurrentBalanceStr(e.target.value);
                    setPrincipalStr(e.target.value);
                  }}
                  className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-8 pr-4 py-2.5 text-base font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Latest closing balance from your PPF passbook / netbanking.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                Balance As-Of Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={balanceAsOfDate}
                onChange={(e) => setBalanceAsOfDate(e.target.value)}
                className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Date of this balance (defaults to today or end of FY).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                Total Lifetime Deposits (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 15,00,000"
                  value={cumulativeDepositsStr}
                  onChange={(e) => setCumulativeDepositsStr(e.target.value)}
                  className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Cumulative contributions made over the years (tracks total interest).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                Planned Annual Contribution (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="1,50,000"
                  value={plannedAnnualDepositStr}
                  onChange={(e) => setPlannedAnnualDepositStr(e.target.value)}
                  className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Estimated yearly deposit until maturity (max ₹1.5L/year).
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── STANDARD PRINCIPAL AMOUNT (For Bank FD / Corporate FD / RD) ── */
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
      )}

      {/* ── INTEREST RATE & COMPOUNDING ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
              placeholder={isPPF ? "7.10" : "7.25"}
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-4 py-2.5 text-base font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              %
            </span>
          </div>

          {!isPPF ? (
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
          ) : (
            <p className="text-[11px] text-neutral-500 mt-1">
              Current Govt PPF interest rate is 7.10% compounded annually.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Compounding Frequency
          </label>
          <select
            value={isPPF ? "ANNUALLY" : frequency}
            disabled={isPPF}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white outline-none disabled:opacity-60"
          >
            <option value="QUARTERLY">Quarterly (Standard FD)</option>
            <option value="MONTHLY">Monthly (e.g. PO-MIS)</option>
            <option value="HALF_YEARLY">Half-Yearly (RBI Bonds)</option>
            <option value="ANNUALLY">Annually (PPF / Tax-Free)</option>
            <option value="SIMPLE">Simple Interest</option>
          </select>
        </div>
      </div>

      {/* ── FDR / ACCOUNT NUMBER ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          {isPPF ? "PPF Account Number (Optional)" : "FDR / Account # (Optional)"}
        </label>
        <input
          type="text"
          placeholder={isPPF ? "e.g. 31943053212" : "e.g. FDR-837192"}
          value={fdrNumber}
          onChange={(e) => setFdrNumber(e.target.value)}
          className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
        />
      </div>

      {/* ── DATES & TENURE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            {isPPF ? "Account Opening Date" : "Deposit Start Date"} <span className="text-red-500">*</span>
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
            {isPPF ? "Maturity / Extension Date" : "Maturity Date"} <span className="text-red-500">*</span>
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
          {(isPPF ? PPF_TENURE_PRESETS : TENURE_PRESETS).map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => handleApplyTenure(t.months, (t as any).is80C)}
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
          checked={isPPF || depositType === "TAX_FREE_BOND" ? true : isTaxSaving}
          disabled={isPPF || depositType === "TAX_FREE_BOND"}
          onChange={(e) => setIsTaxSaving(e.target.checked)}
          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
        />
        <label
          htmlFor="tax_saving_checkbox"
          className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer font-medium flex items-center gap-1.5"
        >
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>
            {isPPF
              ? "Tax Free / 80C (PPF is fully exempt under Section 80C & EEE)"
              : depositType === "TAX_FREE_BOND"
              ? "100% Tax-Free Coupon (Exempt under Section 10(15)(iv)(h))"
              : "Tax Saving Deposit (5-Year Lock-in under Section 80C)"}
          </span>
        </label>
      </div>

      {/* ── REAL-TIME COMPOUND MATURITY PREVIEW CARD ── */}
      {principalNum > 0 && rateNum > 0 && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Sparkles size={13} />
              {isPPF ? "Projected PPF Growth & Maturity Corpus" : "Estimated Maturity Breakdown"}
            </span>
            <span>
              {totalYears > 0 ? `${totalYears.toFixed(1)} Years Total Tenure` : ""}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/15">
            <div>
              <div className="text-[11px] text-neutral-500">{isPPF ? "Current Balance" : "Principal"}</div>
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                ₹{Math.round(principalNum).toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-500">Projected Interest</div>
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
          placeholder="e.g. 15-year maturity in 2027, extendable for 5 years"
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
            <span>{initialData ? (isPPF ? "Update PPF Account" : "Update Deposit") : (isPPF ? "Save PPF Account" : "Save Deposit Holding")}</span>
          )}
        </button>
      </div>
    </form>
  );
}
