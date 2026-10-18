"use client";

import React, { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import {
  Shield,
  Heart,
  Car,
  FileText,
  Calendar,
  AlertCircle,
  Building,
  User,
  Sparkles,
  Check,
} from "lucide-react";

export interface InsurancePolicyFormData {
  id?: number;
  policy_type: string;
  insurer_name: string;
  policy_name: string;
  policy_number?: string;
  sum_assured: number;
  annual_premium: number;
  premium_frequency: string;
  policy_start_date: string;
  policy_end_date?: string;
  next_premium_due_date?: string;
  nominee_name?: string;
  status?: string;
  notes?: string;
  profile_id?: number;
}

interface InsurancePolicyFormProps {
  initialData?: InsurancePolicyFormData | null;
  onSave: (data: InsurancePolicyFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const PRESET_INSURERS = [
  "HDFC Life",
  "Star Health",
  "ICICI Prudential",
  "Niva Bupa (Max Bupa)",
  "Tata AIA Life",
  "Care Health (Religare)",
  "Max Life",
  "LIC of India",
  "Bajaj Allianz",
];

const SUM_ASSURED_CHIPS = [
  { label: "₹10 Lakh", val: 1000000 },
  { label: "₹25 Lakh", val: 2500000 },
  { label: "₹50 Lakh", val: 5000000 },
  { label: "₹1 Crore", val: 10000000 },
  { label: "₹1.5 Crore", val: 15000000 },
  { label: "₹2 Crore", val: 20000000 },
];

export default function InsurancePolicyForm({
  initialData,
  onSave,
  onCancel,
  isSubmitting = false,
}: InsurancePolicyFormProps) {
  const { profiles, activeProfileId } = useProfile();

  const [policyType, setPolicyType] = useState<string>(
    initialData?.policy_type || "TERM_LIFE"
  );
  const [insurerName, setInsurerName] = useState<string>(
    initialData?.insurer_name || ""
  );
  const [policyName, setPolicyName] = useState<string>(
    initialData?.policy_name || ""
  );
  const [policyNumber, setPolicyNumber] = useState<string>(
    initialData?.policy_number || ""
  );
  const [sumAssuredStr, setSumAssuredStr] = useState<string>(
    initialData ? String(initialData.sum_assured) : "10000000"
  );
  const [premiumStr, setPremiumStr] = useState<string>(
    initialData ? String(initialData.annual_premium) : ""
  );
  const [frequency, setFrequency] = useState<string>(
    initialData?.premium_frequency || "ANNUAL"
  );
  const [startDate, setStartDate] = useState<string>(
    initialData?.policy_start_date || new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(() => {
    if (initialData?.policy_end_date) return initialData.policy_end_date;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 30);
    return d.toISOString().split("T")[0];
  });
  const [nextDueDate, setNextDueDate] = useState<string>(() => {
    if (initialData?.next_premium_due_date) return initialData.next_premium_due_date;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [nominee, setNominee] = useState<string>(
    initialData?.nominee_name || ""
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

  const sumAssuredNum = parseFloat(sumAssuredStr) || 0;
  const premiumNum = parseFloat(premiumStr) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!insurerName.trim()) {
      setErrorMsg("Please select or enter an insurer name.");
      return;
    }
    if (!policyName.trim()) {
      setErrorMsg("Please enter the policy / plan name.");
      return;
    }
    if (sumAssuredNum <= 0) {
      setErrorMsg("Please enter a valid sum assured / coverage amount.");
      return;
    }
    if (premiumNum <= 0) {
      setErrorMsg("Please enter the annual premium amount.");
      return;
    }
    if (!startDate) {
      setErrorMsg("Please select a policy start date.");
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
        policy_type: policyType,
        insurer_name: insurerName.trim(),
        policy_name: policyName.trim(),
        policy_number: policyNumber.trim() || undefined,
        sum_assured: sumAssuredNum,
        annual_premium: premiumNum,
        premium_frequency: frequency,
        policy_start_date: startDate,
        policy_end_date: endDate || undefined,
        next_premium_due_date: nextDueDate || undefined,
        nominee_name: nominee.trim() || undefined,
        status: initialData?.status || "ACTIVE",
        notes: notes.trim() || undefined,
        profile_id: resolvedProfileId || undefined,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save insurance policy.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── PROFILE SELECTOR (If multi-profile) ── */}
      {profiles.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Insured Family Member
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-all dark:text-white"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.relation})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── POLICY TYPE SELECTOR ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          Protection Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "TERM_LIFE", label: "Term Life Cover", icon: Shield },
            { id: "HEALTH", label: "Health / Medical", icon: Heart },
            { id: "MOTOR", label: "Motor / Vehicle", icon: Car },
            { id: "ULIP_ENDOWMENT", label: "Endowment / ULIP", icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = policyType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPolicyType(item.id);
                  if (item.id === "HEALTH" && sumAssuredStr === "10000000") {
                    setSumAssuredStr("1500000"); // Standard ₹15L health cover
                  } else if (item.id === "TERM_LIFE" && sumAssuredStr === "1500000") {
                    setSumAssuredStr("10000000"); // Standard ₹1 Cr term cover
                  }
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500 text-indigo-950 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                }`}
              >
                <Icon size={18} className="mb-1 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── INSURER & PLAN NAME ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Insurance Company <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="e.g. HDFC Life, Star Health"
              value={insurerName}
              onChange={(e) => setInsurerName(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white outline-none"
            />
          </div>

          {/* Quick Insurer Chips */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {PRESET_INSURERS.slice(0, 5).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setInsurerName(name)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 font-medium transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Plan / Policy Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Click 2 Protect, Optima Secure"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* ── SUM ASSURED & ANNUAL PREMIUM ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Sum Assured (Cover) <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              {sumAssuredNum >= 10000000
                ? `₹${(sumAssuredNum / 10000000).toFixed(2)} Cr Cover`
                : sumAssuredNum >= 100000
                ? `₹${(sumAssuredNum / 100000).toFixed(1)} Lakh Cover`
                : ""}
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="1000"
              inputMode="decimal"
              placeholder="1,00,00,000"
              value={sumAssuredStr}
              onChange={(e) => setSumAssuredStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-neutral-900 dark:text-white outline-none tabular-nums"
            />
          </div>

          {/* Quick Sum Assured Chips */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {SUM_ASSURED_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setSumAssuredStr(String(chip.val))}
                className="px-2 py-0.5 rounded-md text-[10px] bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Annual Premium (₹) <span className="text-red-500">*</span>
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
              placeholder="18,500"
              value={premiumStr}
              onChange={(e) => setPremiumStr(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl pl-8 pr-4 py-3 text-base font-bold text-neutral-900 dark:text-white outline-none tabular-nums"
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold">Frequency:</span>
            {["ANNUAL", "HALF_YEARLY", "MONTHLY"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  frequency === f
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {f.replace("_", "-")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── POLICY DATES & NEXT RENEWAL ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Policy Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Next Premium Due Date
          </label>
          <input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Coverage End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* ── POLICY NUMBER & NOMINEE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Policy Number (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 008129410"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Nominee Name (Optional)
          </label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="e.g. Spouse / Mother"
              value={nominee}
              onChange={(e) => setNominee(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── NOTES ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          Notes / Riders (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Critical illness rider added, auto-debit on HDFC card"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400"
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
          className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{initialData ? "Update Policy" : "Save Insurance Policy"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
