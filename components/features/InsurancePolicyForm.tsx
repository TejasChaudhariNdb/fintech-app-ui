"use client";
import DatePicker from "@/components/ui/DatePicker";

import React, { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import {
  Shield,
  Heart,
  Car,
  FileText,
  ChevronDown,
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
  /** BUG-106 ULIP: last premium date for limited-pay plans; null clears it */
  premium_paid_until?: string | null;
  /** BUG-106 ULIP: total premiums actually paid, when it differs from the schedule; null clears it */
  premiums_paid_override?: number | null;
}

interface InsurancePolicyFormProps {
  initialData?: InsurancePolicyFormData | null;
  onSave: (data: InsurancePolicyFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const PRESET_INSURERS = [
  "LIC of India",
  "HDFC Life",
  "Star Health",
  "ICICI Prudential",
  "Niva Bupa (Max Bupa)",
  "Tata AIA Life",
  "Care Health (Religare)",
  "Max Life",
  "Bajaj Allianz",
];

const LABEL = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";
const INPUT =
  "w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400";

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
  const [paidUntil, setPaidUntil] = useState<string>(initialData?.premium_paid_until || "");
  const [paidOverrideStr, setPaidOverrideStr] = useState<string>(
    initialData?.premiums_paid_override ? String(initialData.premiums_paid_override) : ""
  );
  const isUlip = policyType === "ULIP_ENDOWMENT";
  // BUG-114: limited-pay life plans (term or endowment) stop premiums before cover ends
  const hasPaidUntil = isUlip || policyType === "TERM_LIFE";
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
    if (hasPaidUntil && paidUntil && (paidUntil < startDate || (endDate && paidUntil > endDate))) {
      setErrorMsg("Last premium date must be between the start date and the cover end date.");
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
        premium_paid_until: hasPaidUntil && paidUntil ? paidUntil : null,
        premiums_paid_override: isUlip && parseFloat(paidOverrideStr) > 0 ? parseFloat(paidOverrideStr) : null,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save insurance policy.");
    }
  };

  const hasMoreDetails = !!(initialData?.policy_number || initialData?.nominee_name || initialData?.notes || initialData?.premiums_paid_override);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── PROFILE SELECTOR (If multi-profile) ── */}
      {profiles.length > 1 && (
        <div>
          <label className={LABEL}>For</label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className={INPUT}
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
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: "TERM_LIFE", label: "Term life", icon: Shield },
          { id: "HEALTH", label: "Health", icon: Heart },
          { id: "MOTOR", label: "Motor", icon: Car },
          { id: "ULIP_ENDOWMENT", label: "ULIP / Endowment", icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = policyType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setPolicyType(item.id);
                if (item.id === "HEALTH" && sumAssuredStr === "10000000") {
                  setSumAssuredStr("1500000"); // Standard ₹15L health cover
                } else if (item.id === "TERM_LIFE" && sumAssuredStr === "1500000") {
                  setSumAssuredStr("10000000"); // Standard ₹1 Cr term cover
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl border text-center transition-colors ${
                isSelected
                  ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                  : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
              }`}
            >
              <Icon size={16} />
              <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── INSURER & PLAN NAME ── */}
      <div>
        <label className={LABEL}>Insurance company</label>
        <input
          type="text"
          placeholder="e.g. LIC, HDFC Life"
          value={insurerName}
          onChange={(e) => setInsurerName(e.target.value)}
          className={INPUT}
        />
        <div className="flex gap-1.5 mt-1.5 overflow-x-auto no-scrollbar">
          {PRESET_INSURERS.slice(0, 4).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setInsurerName(name)}
              className="shrink-0 text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL}>Plan name</label>
        <input
          type="text"
          placeholder="e.g. Jeevan Anand, Optima Secure"
          value={policyName}
          onChange={(e) => setPolicyName(e.target.value)}
          className={INPUT}
        />
      </div>

      {/* ── COVER, PREMIUM & FREQUENCY ── */}
      <div>
        <label className={LABEL}>
          Cover (sum assured)
          {sumAssuredNum >= 100000 && (
            <span className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
              {sumAssuredNum >= 10000000
                ? `₹${(sumAssuredNum / 10000000).toFixed(2)} Cr`
                : `₹${(sumAssuredNum / 100000).toFixed(1)} L`}
            </span>
          )}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
          <input
            type="number"
            step="any"
            min="1000"
            inputMode="decimal"
            placeholder="1,00,00,000"
            value={sumAssuredStr}
            onChange={(e) => setSumAssuredStr(e.target.value)}
            className={`${INPUT} pl-7 tabular-nums`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>{frequency === "SINGLE" ? "Single premium" : "Premium per year"}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
            <input
              type="number"
              step="any"
              min="100"
              inputMode="decimal"
              placeholder="18,500"
              value={premiumStr}
              onChange={(e) => setPremiumStr(e.target.value)}
              className={`${INPUT} pl-7 tabular-nums`}
            />
          </div>
        </div>
        <div>
          <label className={LABEL}>Paid</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={INPUT}>
            <option value="ANNUAL">Yearly</option>
            <option value="HALF_YEARLY">Half-yearly</option>
            <option value="MONTHLY">Monthly</option>
            {/* Many ULIPs are bought with one single premium */}
            {(isUlip || frequency === "SINGLE") && <option value="SINGLE">Single (one time)</option>}
          </select>
        </div>
      </div>

      {/* ── DATES ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Start date</label>
          <DatePicker value={startDate} onChange={(v) => setStartDate(v)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Cover ends</label>
          <DatePicker value={endDate} clearable onChange={(v) => setEndDate(v)} className={INPUT} />
        </div>
        {frequency !== "SINGLE" && (
          <div>
            <label className={LABEL}>Next premium due</label>
            <DatePicker value={nextDueDate} clearable onChange={(v) => setNextDueDate(v)} className={INPUT} />
          </div>
        )}
        {/* Paid-up plans: last premium date (ULIP also uses it for fund gain / XIRR) */}
        {hasPaidUntil && frequency !== "SINGLE" && (
          <div>
            <label className={LABEL}>Last premium date</label>
            <DatePicker value={paidUntil} clearable onChange={(v) => setPaidUntil(v)} className={INPUT} />
            <p className="text-[10px] text-neutral-400 mt-1">For limited-pay plans. A past date marks it paid up.</p>
          </div>
        )}
      </div>

      {/* ── OPTIONAL DETAILS ── */}
      <details open={hasMoreDetails} className="group rounded-xl border border-neutral-200 dark:border-white/10">
        <summary className="flex items-center justify-between cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          More details (optional)
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Policy number</label>
              <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Nominee</label>
              <input type="text" value={nominee} onChange={(e) => setNominee(e.target.value)} className={INPUT} />
            </div>
          </div>
          {isUlip && frequency !== "SINGLE" && (
            <div>
              <label className={LABEL}>Total premiums paid</label>
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="Leave empty to work it out"
                value={paidOverrideStr}
                onChange={(e) => setPaidOverrideStr(e.target.value)}
                className={`${INPUT} tabular-nums`}
              />
              <p className="text-[10px] text-neutral-400 mt-1">Only if premiums changed or you made top-ups</p>
            </div>
          )}
          <div>
            <label className={LABEL}>Notes / riders</label>
            <input
              type="text"
              placeholder="e.g. Critical illness rider"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </details>

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
            <span>{initialData ? "Update Policy" : "Save Policy"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
