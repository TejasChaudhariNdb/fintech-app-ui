"use client";
import DatePicker from "@/components/ui/DatePicker";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";

// BUG-030: home loan for one property. The loan is optional. Figures come from the backend.
export interface PropertyLoanView {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  emi_start_date: string;
  emi: number;
  current_outstanding: number;
  outstanding_from_schedule: boolean;
  interest_paid_to_date: number;
  principal_repaid_to_date: number;
  current_fy: string;
  interest_this_fy: number;
  principal_this_fy: number;
  xirr_unleveraged_pct: number | null;
  xirr_leveraged_pct: number | null;
  financed_rent_after_interest_fy: number | null;
  occupancy_type: string;
  tax: Record<
    "OLD" | "NEW",
    { interest_deduction: number; principal_80c_amount: number; notes: string[] }
  >;
  disclaimer: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  holdingId: number;
  propertyName: string;
  loan: PropertyLoanView | null;
  onChanged: () => void;
}

const inr = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `₹${Math.round(v).toLocaleString("en-IN")}`;

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${v.toFixed(2)}%`;

export default function PropertyLoanModal({
  isOpen,
  onClose,
  holdingId,
  propertyName,
  loan,
  onChanged,
}: Props) {
  const [principal, setPrincipal] = useState(loan ? String(loan.principal) : "");
  const [rate, setRate] = useState(loan ? String(loan.annual_rate) : "");
  const [tenureYears, setTenureYears] = useState(loan ? String(loan.tenure_months / 12) : "");
  const [emiStart, setEmiStart] = useState(loan ? loan.emi_start_date : "");
  const [outstanding, setOutstanding] = useState("");
  const [regime, setRegime] = useState<"OLD" | "NEW">("NEW");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const years = parseFloat(tenureYears);
    if (!(p > 0) || isNaN(r) || r < 0 || !(years > 0) || !emiStart) {
      setError("Enter principal, interest rate, tenure in years and the EMI start date.");
      return;
    }
    const outVal = outstanding.trim() ? parseFloat(outstanding) : null;
    setSaving(true);
    try {
      await api.saveRealEstateLoan(holdingId, {
        principal: p,
        annual_rate: r,
        tenure_months: Math.round(years * 12),
        emi_start_date: emiStart,
        current_outstanding: outVal,
      });
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not save the loan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.deleteRealEstateLoan(holdingId);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not remove the loan.");
    } finally {
      setSaving(false);
    }
  };

  const tax = loan ? loan.tax[regime] : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Home loan · ${propertyName}`}>
      <div className="space-y-5">
        {loan && (
          <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-3 space-y-2 text-xs">
            <div className="flex justify-between"><span>EMI</span><span className="font-semibold">{inr(loan.emi)}</span></div>
            <div className="flex justify-between">
              <span>Outstanding principal{loan.outstanding_from_schedule ? " (from schedule)" : " (entered)"}</span>
              <span className="font-semibold">{inr(loan.current_outstanding)}</span>
            </div>
            <div className="flex justify-between"><span>Interest paid to date</span><span>{inr(loan.interest_paid_to_date)}</span></div>
            <div className="flex justify-between"><span>Principal repaid to date</span><span>{inr(loan.principal_repaid_to_date)}</span></div>
            <div className="flex justify-between">
              <span>This FY ({loan.current_fy}): interest / principal</span>
              <span>{inr(loan.interest_this_fy)} / {inr(loan.principal_this_fy)}</span>
            </div>
            <div className="border-t border-neutral-100 dark:border-white/5 pt-2 flex justify-between">
              <span>Return without loan (XIRR)</span><span className="font-semibold">{pct(loan.xirr_unleveraged_pct)}</span>
            </div>
            <div className="flex justify-between">
              <span>Return with loan (XIRR)</span><span className="font-semibold">{pct(loan.xirr_leveraged_pct)}</span>
            </div>
            {loan.occupancy_type === "LET_OUT" && (
              <div className="flex justify-between">
                <span>Rent less this FY&apos;s interest (annual, approx.)</span>
                <span>{inr(loan.financed_rent_after_interest_fy)}</span>
              </div>
            )}

            <div className="border-t border-neutral-100 dark:border-white/5 pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Tax treatment (separate from returns)</span>
                <select
                  value={regime}
                  onChange={(e) => setRegime(e.target.value as "OLD" | "NEW")}
                  className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1 text-xs"
                >
                  <option value="NEW">New regime</option>
                  <option value="OLD">Old regime</option>
                </select>
              </div>
              {tax && (
                <>
                  <div className="flex justify-between"><span>Interest deduction this FY</span><span>{inr(tax.interest_deduction)}</span></div>
                  <div className="flex justify-between"><span>Sec 80C principal (old regime only)</span><span>{inr(tax.principal_80c_amount)}</span></div>
                  <ul className="list-disc pl-4 mt-1 text-[11px] text-neutral-500 space-y-0.5">
                    {tax.notes.map((n) => (<li key={n}>{n}</li>))}
                  </ul>
                </>
              )}
            </div>
            <p className="text-[10px] text-neutral-400">{loan.disclaimer}</p>
          </div>
        )}

        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Loan amount (Rs) *</label>
              <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Interest rate (% a year) *</label>
              <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tenure (years) *</label>
              <input type="number" value={tenureYears} onChange={(e) => setTenureYears(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">First EMI date *</label>
              <DatePicker value={emiStart} onChange={(v) => setEmiStart(v)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Outstanding principal today (optional, from your bank statement)</label>
            <input type="number" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            <p className="text-[10px] text-neutral-400 mt-1">Leave empty to use the schedule. Enter it if the bank has prepayments.</p>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-between pt-2">
            {loan ? (
              <button type="button" onClick={remove} disabled={saving} className="text-xs text-rose-600 hover:underline">Remove loan</button>
            ) : <span />}
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving..." : loan ? "Update loan" : "Save loan"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
