"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import GoldWeightInput from "@/components/features/GoldWeightInput";

export interface GoldPurchaseEdit {
  id: number;
  purchase_date: string;
  weight_grams: number;
  price_per_gram: number;
  notes?: string | null;
}

export type GoldPurchaseSave = {
  purchase_date: string;
  weight_grams: number;
  price_per_gram: number;
  notes: string;
};

const inputClass =
  "w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white outline-none transition-all placeholder:text-neutral-400";
const labelClass = "block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider";

function PurchaseForm({
  purchase,
  onSave,
  onCancel,
}: {
  purchase: GoldPurchaseEdit;
  onSave: (data: GoldPurchaseSave) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(purchase.purchase_date);
  const [weight, setWeight] = useState(String(purchase.weight_grams));
  const [price, setPrice] = useState(String(purchase.price_per_gram));
  const [notes, setNotes] = useState(purchase.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightNum = parseFloat(weight) || 0;
  const priceNum = parseFloat(price) || 0;
  const amount = weightNum * priceNum;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!date) return setError("Please choose the purchase date.");
    if (weightNum <= 0) return setError("Please enter a weight greater than 0.");
    if (priceNum <= 0) return setError("Please enter the price per gram.");
    setSaving(true);
    try {
      await onSave({ purchase_date: date, weight_grams: weightNum, price_per_gram: priceNum, notes: notes.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this purchase. Please try again.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 pb-6">
      <div>
        <label className={labelClass}>Purchase Date</label>
        <DatePicker value={date} onChange={setDate} className={inputClass} />
      </div>

      <GoldWeightInput grams={weight} onChange={setWeight} showChips={false} />

      <div>
        <label className={labelClass}>Buy Price / Gram</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">₹</span>
          <input
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${inputClass} pl-8 tabular-nums font-bold`}
          />
        </div>
        {amount > 0 && (
          <p className="text-[11px] text-neutral-500 mt-1.5 tabular-nums">
            Invested ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>Notes (Optional)</label>
        <input
          type="text"
          maxLength={120}
          placeholder="e.g. Gold Locker - GPay"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="pt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-sm shadow-md shadow-amber-500/25 transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Update Purchase"}
        </button>
      </div>
    </form>
  );
}

/** Edit one purchase (top-up) of a digital gold holding. */
export default function GoldPurchaseModal({
  purchase,
  onClose,
  onSave,
}: {
  purchase: GoldPurchaseEdit | null;
  onClose: () => void;
  onSave: (data: GoldPurchaseSave) => Promise<void>;
}) {
  return (
    <Modal isOpen={Boolean(purchase)} onClose={onClose} title="Edit Purchase">
      {purchase && (
        <PurchaseForm
          key={purchase.id}
          purchase={purchase}
          onCancel={onClose}
          onSave={async (data) => {
            await onSave(data);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
