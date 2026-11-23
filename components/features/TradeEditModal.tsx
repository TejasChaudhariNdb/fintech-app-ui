"use client";

// Edit a sold lot's dates, rates or quantity from the Tax page (moved out of reports/page.tsx unchanged).
// It changes the underlying buy / sell transaction, so the whole report is recalculated after saving.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2 } from "lucide-react";
import { api, CapitalGainRecord } from "@/lib/api";
import DatePicker from "@/components/ui/DatePicker";

export default function TradeEditModal({
  record: editingRecord,
  onClose,
  onSaved,
}: {
  record: CapitalGainRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editBoughtDate, setEditBoughtDate] = useState<string>(editingRecord.bought_date || "");
  const [editSoldDate, setEditSoldDate] = useState<string>(editingRecord.sold_date || "");
  const [editBoughtRate, setEditBoughtRate] = useState<string>(editingRecord.bought_rate ? String(editingRecord.bought_rate) : "");
  const [editSoldRate, setEditSoldRate] = useState<string>(editingRecord.sold_rate ? String(editingRecord.sold_rate) : "");
  const [editQuantity, setEditQuantity] = useState<string>(editingRecord.bought_qty ? String(editingRecord.bought_qty) : "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Scroll lock for iOS / mobile while the sheet is open
  useEffect(() => {
    const scrollY = window.scrollY;
    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      html: document.documentElement.style.overflow,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = original.html;
      document.body.style.overflow = original.overflow;
      document.body.style.position = original.position;
      document.body.style.top = original.top;
      document.body.style.width = original.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleSaveTradeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      await api.updateTradeDetails({
        asset_type: editingRecord.asset_type,
        buy_tx_id: editingRecord.buy_tx_id,
        sell_tx_id: editingRecord.sell_tx_id,
        bought_date: editBoughtDate || null,
        sold_date: editSoldDate || null,
        bought_rate: editBoughtRate ? parseFloat(editBoughtRate) : null,
        sold_rate: editSoldRate ? parseFloat(editSoldRate) : null,
        quantity: editQuantity ? parseFloat(editQuantity) : null,
      });
      setEditSuccessMsg("Trade details updated successfully!");
      setTimeout(onSaved, 1000);
    } catch (err) {
      alert("Failed to update trade: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSavingEdit(false);
    }
  };

  return createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm touch-none overscroll-none animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) e.preventDefault();
            }}
          >
            <div
              className="bg-white dark:bg-[#13161f] border-t sm:border border-neutral-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden touch-pan-y overscroll-contain animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile grab handle */}
              <div className="sm:hidden pt-2.5 pb-0 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20" />
              </div>

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 px-6 py-3.5 shrink-0 bg-white dark:bg-[#13161f]">
                <div className="min-w-0 pr-2">
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white truncate">
                    Edit Trade Details
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {editingRecord.scrip} ({editingRecord.asset_type})
                  </p>
                </div>
                <button
                  onClick={() => onClose()}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 touch-pan-y overscroll-contain">
                {editSuccessMsg ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={36} />
                    <p className="text-sm font-bold">{editSuccessMsg}</p>
                  </div>
                ) : (
                  <form id="edit-trade-form" onSubmit={handleSaveTradeEdit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Buy Date */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Buy Date
                        </label>
                        <DatePicker
                          value={editBoughtDate}
                          clearable
                          onChange={(v) => setEditBoughtDate(v)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                        />
                      </div>

                      {/* Sale Date */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Sale Date
                        </label>
                        <DatePicker
                          value={editSoldDate}
                          clearable
                          onChange={(v) => setEditSoldDate(v)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                        />
                      </div>

                      {/* Buy Rate */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Buy Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 150.00"
                          value={editBoughtRate}
                          onChange={(e) => setEditBoughtRate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                        />
                      </div>

                      {/* Sale Rate */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Sale Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 200.00"
                          value={editSoldRate}
                          onChange={(e) => setEditSoldRate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Quantity / Units
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 50"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-900 dark:text-white font-medium outline-none focus:border-primary-500"
                      />
                    </div>
                  </form>
                )}
              </div>

              {/* Sticky Footer */}
              {!editSuccessMsg && (
                <div className="px-6 py-3.5 border-t border-neutral-100 dark:border-white/5 bg-neutral-50/80 dark:bg-[#13161f]/95 backdrop-blur-sm flex items-center justify-end gap-2 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5">
                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-trade-form"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
                  >
                    {savingEdit ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    ) : null}
                    Save Trade Details
                  </button>
                </div>
              )}
            </div>
          </div>,
    document.body
  );
}
