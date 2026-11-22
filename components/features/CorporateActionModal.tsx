"use client";
import DatePicker from "@/components/ui/DatePicker";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Gift,
  Scissors,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Info,
  GitBranch,
  Banknote,
} from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";

interface CorporateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSymbol?: string;
  currentHolding?: {
    quantity: number;
    avg_price: number;
    value?: number;
  };
}

export default function CorporateActionModal({
  isOpen,
  onClose,
  onSuccess,
  initialSymbol = "",
  currentHolding,
}: CorporateActionModalProps) {
  const { profiles, activeProfileId } = useProfile();
  const [mounted, setMounted] = useState(false);

  // Form State
  const [symbol, setSymbol] = useState(initialSymbol);
  const [actionType, setActionType] = useState<"BONUS" | "SPLIT" | "DEMAT_SYNC" | "MERGER" | "DEMERGER" | "DIVIDEND">("BONUS");
  // BUG-091 demerger fields
  const [newSymbol, setNewSymbol] = useState("");
  const [costPercent, setCostPercent] = useState("");
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("0");
  const [ratio, setRatio] = useState("1:2");
  const [notes, setNotes] = useState("");
  const [targetProfileId, setTargetProfileId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSymbol(initialSymbol.toUpperCase().replace(/\.(BO|NS)$/i, ""));
      if (initialSymbol.toUpperCase().includes("NBCC")) {
        setActionDate("2024-10-05");
        setQuantity("2");
        setRatio("1:2");
        setNotes("1:2 Bonus shares credited on 2024-10-05");
      }
      setErrorMessage(null);
    }
  }, [isOpen, initialSymbol]);

  useEffect(() => {
    if (activeProfileId && activeProfileId !== "all") {
      setTargetProfileId(activeProfileId);
    } else if (profiles && profiles.length > 0) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      if (def) setTargetProfileId(String(def.id));
    }
  }, [activeProfileId, profiles, isOpen]);

  if (!isOpen || !mounted) return null;

  const currentQty = currentHolding?.quantity || 0;
  const currentAvg = currentHolding?.avg_price || 0;
  const currentTotalCost = currentQty * currentAvg;

  const addQty = parseFloat(quantity) || 0;
  const isDemerger = actionType === "DEMERGER";
  // BUG-096: cash payout (dividend, REIT / InvIT distribution): the number field is the amount received.
  const isPayout = actionType === "DIVIDEND";
  const addPrice = actionType === "BONUS" || actionType === "SPLIT" || isDemerger ? 0 : (parseFloat(price) || 0);
  const pct = parseFloat(costPercent) || 0;
  // Demerger preview: cost moves, nothing is added (uses today's cost; the server uses the cost on the date).
  const movedCost = currentTotalCost * pct / 100;

  // Projected New Quantity & Avg Price
  const projectedQty = currentQty + addQty;
  const projectedTotalCost = currentTotalCost + (addQty * addPrice);
  const projectedAvg = projectedQty > 0 ? projectedTotalCost / projectedQty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSym = symbol.trim().toUpperCase().replace(/\.(BO|NS)$/i, "");
    if (!cleanSym) {
      setErrorMessage("Please enter a stock symbol.");
      return;
    }
    if (addQty <= 0) {
      setErrorMessage(isPayout ? "Enter the amount you received." : "Quantity must be greater than 0.");
      return;
    }
    if (!actionDate) {
      setErrorMessage("Please select an effective action date.");
      return;
    }
    const cleanNew = newSymbol.trim().toUpperCase().replace(/\.(BO|NS)$/i, "");
    if (isDemerger) {
      if (!cleanNew || cleanNew === cleanSym) {
        setErrorMessage("Enter the new company's symbol (different from the stock you hold).");
        return;
      }
      if (!(pct > 0 && pct < 100)) {
        setErrorMessage("Cost moved must be more than 0% and less than 100%.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isDemerger) {
        await api.recordDemerger(
          {
            symbol: cleanSym,
            new_symbol: cleanNew,
            new_quantity: addQty,
            cost_percent: pct,
            date: actionDate,
            notes: notes.trim() || undefined,
          },
          targetProfileId
        );
        onSuccess();
        onClose();
        return;
      }
      await api.recordCorporateAction(
        isPayout
          ? { symbol: cleanSym, action_type: "DIVIDEND", quantity: 0, price: addQty, date: actionDate, notes: notes.trim() || undefined }
          : {
          symbol: cleanSym,
          action_type: actionType,
          quantity: addQty,
          price: addPrice,
          date: actionDate,
          ratio: ratio.trim() || undefined,
          notes: notes.trim() || `${actionType} adjustment on ${actionDate}`,
        },
        targetProfileId
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record corporate action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#11141c] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Gift size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white">
                Add Corporate Action / Bonus
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Bonus issues, stock splits, demergers &amp; off-market credits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-900 dark:text-red-200 flex items-start gap-2.5 text-xs">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Action Type Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
              Corporate Action Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "BONUS", label: "Bonus Shares", icon: Gift, desc: "₹0 cost basis" },
                { id: "SPLIT", label: "Stock Split", icon: Scissors, desc: "Ratio split" },
                { id: "DEMERGER", label: "Demerger", icon: GitBranch, desc: "New company" },
                { id: "DEMAT_SYNC", label: "Demat Sync", icon: SlidersHorizontal, desc: "Balance fix" },
                { id: "DIVIDEND", label: "Payout", icon: Banknote, desc: "Dividend, REIT, InvIT" },
              ].map((t) => {
                const isSelected = actionType === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActionType(t.id as any);
                      if (t.id === "BONUS" || t.id === "SPLIT" || t.id === "DEMERGER") setPrice("0");
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-500/15 border-cyan-500 text-cyan-950 dark:text-cyan-300 ring-2 ring-cyan-500/25 font-bold"
                        : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    }`}
                  >
                    <Icon size={16} className="mx-auto mb-1 text-cyan-500" />
                    <div className="text-xs">{t.label}</div>
                    <div className="text-[10px] opacity-70">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock Symbol & Ratio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Stock Symbol
              </label>
              <input
                type="text"
                placeholder="e.g. NBCC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white uppercase outline-none focus:border-cyan-500"
                required
              />
            </div>

            {isDemerger ? (
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  New company symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. JIOFIN"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white uppercase outline-none focus:border-cyan-500"
                  required
                />
              </div>
            ) : isPayout ? null : (
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Ratio / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 1:2"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
              />
            </div>
            )}
          </div>

          {/* Date & Additional Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {isPayout ? "Date received" : "Record / Ex-Date"}
              </label>
              <DatePicker
                value={actionDate}
                onChange={(v) => setActionDate(v)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {isDemerger ? "New shares received" : isPayout ? "Amount received (₹)" : "Shares Credited (+Qty)"}
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                placeholder={isPayout ? "e.g. 2100" : "e.g. 2"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* BUG-091: cost share the company announced */}
          {isDemerger && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Cost moved to new company (%)
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                max="99.99"
                placeholder="e.g. 4.68"
                value={costPercent}
                onChange={(e) => setCostPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
                required
              />
              <p className="mt-1 text-[11px] text-neutral-500 leading-snug">
                The company announces this split of cost (search &ldquo;{symbol || "company"} demerger cost of acquisition&rdquo;).
                Your new shares keep your original purchase dates. No money is added.
              </p>
            </div>
          )}

          {/* Acquisition Price (Only if not Bonus/Split/Demerger) */}
          {actionType !== "BONUS" && actionType !== "SPLIT" && !isDemerger && !isPayout && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Cost Basis per Share (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Notes description */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. 1:2 Bonus shares credited on 2024-10-05"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
            />
          </div>

          {/* BUG-091: demerger preview */}
          {isDemerger && currentHolding && pct > 0 && pct < 100 && (
            <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-500/10 border border-cyan-500/25 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-cyan-900 dark:text-cyan-300">
                <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span>How your cost is split</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-black/20 border border-cyan-500/10">
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase">{symbol || "Stock"} keeps</span>
                  <div className="font-bold text-neutral-900 dark:text-white mt-0.5">₹{(currentTotalCost - movedCost).toFixed(2)}</div>
                  <div className="text-[10px] text-neutral-400">{currentQty} shares, same count</div>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-black/20 border border-cyan-500/20">
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-bold uppercase">{newSymbol || "New company"} gets</span>
                  <div className="font-extrabold text-cyan-900 dark:text-cyan-300 mt-0.5">₹{movedCost.toFixed(2)}</div>
                  <div className="text-[10px] text-neutral-400">
                    {addQty > 0 ? `${addQty} shares @ ₹${(movedCost / addQty).toFixed(2)}` : "enter new shares"}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-300/80">
                &bull; Total invested stays ₹{currentTotalCost.toFixed(2)}. Uses your cost as of the demerger date.
              </div>
            </div>
          )}

          {/* Live Impact Preview Card */}
          {!isDemerger && !isPayout && currentHolding && addQty > 0 && (
            <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-500/10 border border-cyan-500/25 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-cyan-900 dark:text-cyan-300">
                <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span>Weighted Average Cost Recalculation</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300 text-[11px]">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-black/20 border border-cyan-500/10">
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Before Action</span>
                  <div className="font-bold text-neutral-900 dark:text-white mt-0.5">
                    {currentQty} shares @ ₹{currentAvg.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-neutral-400">Total Invested: ₹{currentTotalCost.toFixed(2)}</div>
                </div>

                <div className="p-2 rounded-xl bg-white/80 dark:bg-black/20 border border-cyan-500/20 font-semibold">
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-bold uppercase">After {actionType}</span>
                  <div className="font-extrabold text-cyan-900 dark:text-cyan-300 mt-0.5">
                    {projectedQty} shares @ ₹{projectedAvg.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-neutral-400">Total Invested: ₹{projectedTotalCost.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-300/80">
                &bull; Bonus shares are credited at ₹0.00 acquisition cost per Indian Tax Laws (Sec 55(2)(aa)). Total capital remains ₹{currentTotalCost.toFixed(2)}.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-cyan-500/25 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Record Corporate Action</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
