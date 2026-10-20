"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  Gift,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";

interface ReconcileItem {
  symbol: string;
  isin?: string | null;
  tradebook_quantity: number;
  demat_quantity: number;
  difference_quantity: number;
  tradebook_avg_price: number;
  demat_avg_price: number;
  status: "MATCHED" | "BONUS_OR_OFFMARKET" | "MERGER_OR_NEW" | "EXTINGUISHED_OR_MERGED" | "UNTRACKED_SELL" | string;
  suggested_action?: string | null;
  suggested_action_type?: string;
  suggested_price?: number;
}

interface ReconcileResponse {
  status: string;
  total_stocks_analyzed: number;
  matched_count: number;
  discrepancy_count: number;
  items: ReconcileItem[];
}

interface DematReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DematReconcileModal({
  isOpen,
  onClose,
  onSuccess,
}: DematReconcileModalProps) {
  const { profiles, activeProfileId } = useProfile();
  const [mounted, setMounted] = useState(false);

  // Steps: 'UPLOAD' | 'REVIEW' | 'SUCCESS'
  const [step, setStep] = useState<"UPLOAD" | "REVIEW" | "SUCCESS">("UPLOAD");
  const [targetProfileId, setTargetProfileId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Analysis Result
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selection & Sync
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [syncDate, setSyncDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [syncNotes, setSyncNotes] = useState("Demat holdings reconciliation sync");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);

  // UI state
  const [showMatched, setShowMatched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeProfileId && activeProfileId !== "all") {
      setTargetProfileId(activeProfileId);
    } else if (profiles && profiles.length > 0) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      if (def) setTargetProfileId(String(def.id));
    }
  }, [activeProfileId, profiles, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("UPLOAD");
        setFile(null);
        setReconcileResult(null);
        setErrorMessage(null);
        setSelectedSymbols(new Set());
        setShowMatched(false);
        setIsSyncing(false);
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      await analyzeStatement(selected);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      await analyzeStatement(selected);
    }
  };

  const analyzeStatement = async (f: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res: ReconcileResponse = await api.reconcileDematStatement(
        f,
        targetProfileId || undefined
      );
      setReconcileResult(res);

      // Pre-select all discrepancies (both additions and removals/extinctions)
      const toSelect = new Set<string>();
      res.items.forEach((item) => {
        if (item.difference_quantity !== 0) {
          toSelect.add(item.symbol);
        }
      });
      setSelectedSymbols(toSelect);
      setStep("REVIEW");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze Demat statement. Please ensure it's a valid Zerodha holdings file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelectSymbol = (symbol: string) => {
    const next = new Set(selectedSymbols);
    if (next.has(symbol)) {
      next.delete(symbol);
    } else {
      next.add(symbol);
    }
    setSelectedSymbols(next);
  };

  const handleSync = async () => {
    if (!reconcileResult || selectedSymbols.size === 0) return;

    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const itemsToSync = reconcileResult.items
        .filter((item) => selectedSymbols.has(item.symbol))
        .map((item) => {
          const isExtinguish = item.difference_quantity < 0;
          return {
            symbol: item.symbol,
            action_type: isExtinguish
              ? "MERGER_EXTINGUISH"
              : (item.suggested_action_type || (item.tradebook_quantity === 0 ? "MERGER" : "BONUS")),
            quantity: Math.abs(item.difference_quantity),
            price: item.suggested_price !== undefined ? item.suggested_price : (isExtinguish ? item.tradebook_avg_price : 0.0),
            date: syncDate,
            ratio: null,
            notes: isExtinguish
              ? `Extinguished via Demat sync (${item.symbol})`
              : (syncNotes || "Auto-reconciled from Demat holdings statement"),
          };
        });

      await api.syncDematReconcile(itemsToSync, syncNotes, targetProfileId || undefined);
      setSyncedCount(itemsToSync.length);
      setStep("SUCCESS");
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to synchronize holdings. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const discrepancies = reconcileResult?.items.filter((i) => i.difference_quantity !== 0) || [];
  const matched = reconcileResult?.items.filter((i) => i.difference_quantity === 0) || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-sm">
              <Gift size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                Demat Reconciliation
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Bonus & Demat Sync
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Automatically detect bonus shares & off-market corporate actions from Zerodha Demat holdings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Profile Selector */}
          {profiles && profiles.length > 1 && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Target Profile
              </label>
              <select
                value={targetProfileId}
                onChange={(e) => setTargetProfileId(e.target.value)}
                disabled={step !== "UPLOAD"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-amber-500">
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.relation})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-white/15 hover:border-amber-500/60 dark:hover:border-amber-500/60 rounded-3xl p-8 text-center cursor-pointer transition-all bg-neutral-50/50 dark:bg-white/[0.02] hover:bg-amber-50/30 dark:hover:bg-amber-500/[0.03] group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-500/20">
                  {isAnalyzing ? (
                    <Loader2 size={26} className="animate-spin text-amber-500" />
                  ) : (
                    <Upload size={26} />
                  )}
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isAnalyzing ? "Comparing Tradebook vs Demat..." : "Drop your Zerodha holdings.csv here"}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  Export from: <span className="font-semibold text-neutral-700 dark:text-neutral-300">Zerodha Console &gt; Portfolio &gt; Holdings &gt; Download CSV</span>
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/10 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                  <FileSpreadsheet size={13} /> Supports Zerodha, Groww, & Upstox Holdings
                </div>
              </div>

              {/* Explanatory Callout */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-200 dark:border-amber-500/20 text-xs space-y-1.5 text-amber-800 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5">
                  <Info size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  Why does Tradebook differ from Demat Holdings?
                </p>
                <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/80">
                  Tradebook CSVs only contain secondary market exchange orders. Off-market corporate actions like <strong>Bonus shares</strong> (e.g., NBCC 1:2 bonus), <strong>stock splits</strong>, and <strong>mergers</strong> never execute through exchange orders and are only visible in your Demat statement.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW DIFF */}
          {step === "REVIEW" && reconcileResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-center">
                  <p className="text-[10px] font-bold uppercase text-neutral-400">Total Analyzed</p>
                  <p className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                    {reconcileResult.total_stocks_analyzed}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Exact Match</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {reconcileResult.matched_count}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Bonus/Diff Found</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {reconcileResult.discrepancy_count}
                  </p>
                </div>
              </div>

              {/* Discrepancy List */}
              {discrepancies.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Discrepancies Requiring Action ({discrepancies.length})
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Select items to sync
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {discrepancies.map((item) => {
                      const isSelected = selectedSymbols.has(item.symbol);
                      const isExtinguish = item.difference_quantity < 0;
                      const isMergerNew = item.tradebook_quantity === 0 && item.demat_quantity > 0;
                      return (
                        <div
                          key={item.symbol}
                          onClick={() => toggleSelectSymbol(item.symbol)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? isExtinguish
                                ? "bg-red-500/[0.08] border-red-500/40 shadow-sm"
                                : "bg-amber-500/[0.08] border-amber-500/40 shadow-sm"
                              : "bg-neutral-50 dark:bg-white/[0.02] border-neutral-200 dark:border-white/5 opacity-70"
                          }`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div
                              className={`rounded border-neutral-300 ${isExtinguish ? "text-red-500 focus:ring-red-500" : "text-amber-500 focus:ring-amber-500"}`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-neutral-900 dark:text-white">
                                  {item.symbol}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                                  isExtinguish
                                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                                    : isMergerNew
                                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                }`}>
                                  {isExtinguish
                                    ? "Extinguish / Merged"
                                    : isMergerNew
                                    ? "Merger Acquired"
                                    : `+${item.difference_quantity} Bonus`}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {isExtinguish ? (
                                  <>Tradebook: <strong className="text-red-600 dark:text-red-400">{item.tradebook_quantity}</strong> shs &rarr; Demat: <strong className="text-neutral-700 dark:text-neutral-300">0</strong> (Extinguish ghost holding)</>
                                ) : (
                                  <>Tradebook: <strong className="text-neutral-700 dark:text-neutral-300">{item.tradebook_quantity}</strong> shs &rarr; Demat: <strong className="text-amber-600 dark:text-amber-400">{item.demat_quantity}</strong> shs @ ₹{item.demat_avg_price}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-bold block ${isExtinguish ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {item.difference_quantity > 0 ? `+${item.difference_quantity}` : `${item.difference_quantity}`} Shares
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              {isExtinguish ? "Remove Holding" : isMergerNew ? `@ ₹${item.demat_avg_price} Cost` : "Credit @ ₹0 Cost"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Perfect Match!
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
                    All {reconcileResult.matched_count} stocks in your Demat account exactly match your tradebook transaction history. No bonus or split adjustments are needed.
                  </p>
                </div>
              )}

              {/* Sync Settings */}
              {discrepancies.length > 0 && selectedSymbols.size > 0 && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                        Credit Date
                      </label>
                      <input
                        type="date"
                        value={syncDate}
                        onChange={(e) => setSyncDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                        Ledger Note
                      </label>
                      <input
                        type="text"
                        value={syncNotes}
                        onChange={(e) => setSyncNotes(e.target.value)}
                        placeholder="e.g. Demat sync / Bonus credit"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Tax-neutral bonus accounting: Adds shares at ₹0 cost, preserves total invested capital, and recalculates weighted average cost.
                  </p>
                </div>
              )}

              {/* Accordion: Matched Stocks */}
              {matched.length > 0 && (
                <div className="border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMatched(!showMatched)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-50/50 dark:bg-white/[0.01] hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      View {matched.length} Matched Stocks (100% verified)
                    </span>
                    {showMatched ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showMatched && (
                    <div className="p-3 max-h-40 overflow-y-auto space-y-1 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-white/5 text-xs text-neutral-500">
                      {matched.map((m) => (
                        <div key={m.symbol} className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-white/[0.02] last:border-none">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{m.symbol}</span>
                          <span>{m.demat_quantity} shares @ ₹{m.demat_avg_price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "SUCCESS" && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                Reconciliation Complete!
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
                Successfully synchronized {syncedCount} stock{syncedCount === 1 ? "" : "s"} with your Demat balance. Average purchase prices and portfolio capital gains have been recalculated.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
          {step === "UPLOAD" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                Cancel
              </button>
              <div className="text-[11px] text-neutral-400">
                Upload Zerodha holdings.csv to proceed
              </div>
            </>
          )}

          {step === "REVIEW" && (
            <>
              <button
                type="button"
                onClick={() => setStep("UPLOAD")}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                Back to Upload
              </button>
              {discrepancies.length > 0 && selectedSymbols.size > 0 ? (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all">
                  {isSyncing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Synchronizing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Sync {selectedSymbols.size} Stock{selectedSymbols.size === 1 ? "" : "s"} to Demat
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs">
                  Done
                </button>
              )}
            </>
          )}

          {step === "SUCCESS" && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors">
                Close & View Holdings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
