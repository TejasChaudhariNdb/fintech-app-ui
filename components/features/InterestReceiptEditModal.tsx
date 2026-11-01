"use client";

import React, { useState } from "react";
import { X, Check, Loader2, Calendar, Building2, IndianRupee } from "lucide-react";

export interface InterestReceiptItemData {
  receipt_id?: number | null;
  holding_id: number;
  due_date: string;
  reference: string;
  instrument_name: string;
  institution: string;
  owner: string;
  tax_status: string;
  expected_amount: number;
  is_received: boolean;
  actual_amount?: number | null;
  tds_deducted: number;
  date_received?: string | null;
  bank_account?: string | null;
  notes?: string | null;
}

interface InterestReceiptEditModalProps {
  isOpen: boolean;
  item: InterestReceiptItemData | null;
  onClose: () => void;
  onSave: (payload: {
    holding_id: number;
    due_date: string;
    is_received: boolean;
    actual_amount: number;
    tds_deducted: number;
    date_received?: string;
    bank_account?: string;
    notes?: string;
  }) => Promise<void>;
}

export default function InterestReceiptEditModal({
  isOpen,
  item,
  onClose,
  onSave,
}: InterestReceiptEditModalProps) {
  if (!isOpen || !item) return null;

  const [isReceived, setIsReceived] = useState<boolean>(item.is_received);
  const [actualAmount, setActualAmount] = useState<string>(
    item.actual_amount !== null && item.actual_amount !== undefined
      ? String(item.actual_amount)
      : String(item.expected_amount)
  );
  const [tdsDeducted, setTdsDeducted] = useState<string>(String(item.tds_deducted || 0));
  const [dateReceived, setDateReceived] = useState<string>(
    item.date_received || new Date().toISOString().split("T")[0]
  );
  const [bankAccount, setBankAccount] = useState<string>(item.bank_account || "");
  const [notes, setNotes] = useState<string>(item.notes || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave({
        holding_id: item.holding_id,
        due_date: item.due_date,
        is_received: isReceived,
        actual_amount: parseFloat(actualAmount) || item.expected_amount,
        tds_deducted: parseFloat(tdsDeducted) || 0,
        date_received: isReceived ? dateReceived : undefined,
        bank_account: bankAccount.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save receipt:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white tracking-tight">
              Interest Receipt Details
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {item.instrument_name} • {item.reference}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10">
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                Interest Received?
              </span>
              <span className="text-[11px] text-neutral-400">
                Mark as credited to your bank account
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isReceived}
                onChange={(e) => setIsReceived(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Amounts Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Actual Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3 py-2 text-sm font-bold text-neutral-900 dark:text-white outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Expected: ₹{item.expected_amount.toLocaleString("en-IN")}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                TDS Deducted (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={tdsDeducted}
                onChange={(e) => setTdsDeducted(e.target.value)}
                className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3 py-2 text-sm font-bold text-neutral-900 dark:text-white outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Tax withheld by bank
              </span>
            </div>
          </div>

          {/* Date & Bank Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Date Received
              </label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3 py-2 text-xs font-medium text-neutral-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Bank Account
              </label>
              <input
                type="text"
                placeholder="e.g. POSB, HDFC 4012"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3 py-2 text-xs font-medium text-neutral-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Credited with reference UTR-10291"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-emerald-500 rounded-2xl px-3 py-2 text-xs font-medium text-neutral-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
