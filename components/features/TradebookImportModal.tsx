"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Info,
  Download,
  Building2,
  HelpCircle,
  X,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { api } from "@/lib/api";

interface TradeRecord {
  temp_id: string;
  row_num: number;
  symbol: string;
  company_name: string;
  exchange: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  amount: number;
  date: string;
  trade_id?: string | null;
  order_id?: string | null;
  is_duplicate: boolean;
}

interface PreviewResponse {
  status: string;
  broker_detected: string;
  filename: string;
  total_rows: number;
  valid_trades_count: number;
  duplicate_trades_count: number;
  new_trades_count: number;
  buy_count: number;
  sell_count: number;
  total_buy_value: number;
  total_sell_value: number;
  unique_symbols: string[];
  trades: TradeRecord[];
  errors: { row?: number; symbol?: string; reason: string }[];
}

interface TradebookImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUPPORTED_BROKERS = [
  { id: "ZERODHA", name: "Zerodha", desc: "Console > Reports > Tradebook" },
  { id: "GROWW", name: "Groww", desc: "Profile > Reports > Stocks Order" },
  { id: "ANGELONE", name: "AngelOne", desc: "Reports > Tradebook" },
  { id: "UPSTOX", name: "Upstox", desc: "Account > Reports > Trade History" },
  { id: "CUSTOM", name: "Custom CSV", desc: "Custom Portfolio Spreadsheet" },
];

export default function TradebookImportModal({
  isOpen,
  onClose,
  onSuccess,
}: TradebookImportModalProps) {
  const { profiles, activeProfileId } = useProfile();
  const [mounted, setMounted] = useState(false);

  // Flow steps: 'UPLOAD' -> 'PREVIEW' -> 'SUCCESS'
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "SUCCESS">("UPLOAD");

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetProfileId, setTargetProfileId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Preview & Processing states
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  // Commit states
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    added: number;
    affected_symbols: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize target profile
  useEffect(() => {
    if (activeProfileId && activeProfileId !== "all") {
      setTargetProfileId(activeProfileId);
    } else if (profiles && profiles.length > 0) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      if (def) setTargetProfileId(String(def.id));
    }
  }, [activeProfileId, profiles, isOpen]);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("UPLOAD");
        setSelectedFile(null);
        setPreviewData(null);
        setSelectedTradeIds(new Set());
        setCommitResult(null);
        setErrorMessage(null);
        setSearchFilter("");
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Handlers
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setErrorMessage(null);
    setSelectedFile(file);
    // Auto-trigger preview when file is selected
    runPreview(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const runPreview = async (fileToPreview?: File) => {
    const file = fileToPreview || selectedFile;
    if (!file) {
      setErrorMessage("Please select a CSV or Excel file to upload.");
      return;
    }
    if (!targetProfileId) {
      setErrorMessage("Please select a target family profile.");
      return;
    }

    setIsPreviewing(true);
    setErrorMessage(null);

    try {
      const res: PreviewResponse = await api.previewTradebook(file, targetProfileId);
      setPreviewData(res);

      // Pre-select all NON-DUPLICATE trades
      const nonDupes = new Set<string>();
      res.trades.forEach((t) => {
        if (!t.is_duplicate) {
          nonDupes.add(t.temp_id);
        }
      });
      setSelectedTradeIds(nonDupes);
      setStep("PREVIEW");
    } catch (err: any) {
      const msg = err.data?.message || err.message || "Failed to parse tradebook file.";
      setErrorMessage(msg);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleToggleTrade = (tempId: string) => {
    const next = new Set(selectedTradeIds);
    if (next.has(tempId)) {
      next.delete(tempId);
    } else {
      next.add(tempId);
    }
    setSelectedTradeIds(next);
  };

  const handleSelectAllFiltered = (tradesToToggle: TradeRecord[]) => {
    const next = new Set(selectedTradeIds);
    const allSelected = tradesToToggle.every((t) => next.has(t.temp_id));
    if (allSelected) {
      tradesToToggle.forEach((t) => next.delete(t.temp_id));
    } else {
      tradesToToggle.forEach((t) => next.add(t.temp_id));
    }
    setSelectedTradeIds(next);
  };

  const handleCommit = async () => {
    if (!previewData) return;
    const tradesToCommit = previewData.trades.filter((t) =>
      selectedTradeIds.has(t.temp_id)
    );

    if (tradesToCommit.length === 0) {
      setErrorMessage("Please select at least 1 trade to import.");
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const payloadTrades = tradesToCommit.map((t) => ({
        symbol: t.symbol,
        transaction_type: t.transaction_type,
        quantity: t.quantity,
        price: t.price,
        date: t.date,
        trade_id: t.trade_id,
        order_id: t.order_id,
        exchange: t.exchange,
        company_name: t.company_name,
      }));

      const res = await api.commitTradebook(
        payloadTrades,
        previewData.broker_detected || "BROKER_IMPORT",
        targetProfileId
      );

      setCommitResult({
        added: res.added || tradesToCommit.length,
        affected_symbols: res.affected_symbols || previewData.unique_symbols,
      });
      setStep("SUCCESS");
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to commit trades to portfolio.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Filtered trades for preview list
  const filteredTrades =
    previewData?.trades.filter((t) => {
      const matchSearch =
        !searchFilter ||
        t.symbol.toLowerCase().includes(searchFilter.toLowerCase()) ||
        t.company_name.toLowerCase().includes(searchFilter.toLowerCase());

      const matchType =
        typeFilter === "ALL" ? true : t.transaction_type === typeFilter;

      return matchSearch && matchType;
    }) || [];

  const selectedCount = selectedTradeIds.size;
  const targetProfileName =
    profiles.find((p) => String(p.id) === targetProfileId)?.name || "Selected Profile";

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#11141c] border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white">
                  {step === "UPLOAD"
                    ? "Upload Broker Tradebook"
                    : step === "PREVIEW"
                    ? "Verify & Import Trades"
                    : "Import Complete"}
                </h3>
                {step === "PREVIEW" && previewData && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {previewData.broker_detected}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {step === "UPLOAD"
                  ? "Import trade history automatically from Zerodha, Groww, AngelOne & CSV"
                  : step === "PREVIEW"
                  ? `Review detected trades for ${targetProfileName}`
                  : "Holdings and weighted averages updated"}
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

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-900 dark:text-red-200 flex items-start gap-2.5 text-xs">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* ════════ STEP 1: UPLOAD ════════ */}
          {step === "UPLOAD" && (
            <div className="space-y-5">
              {/* Profile Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Import Trades For Family Member
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {profiles.map((p) => {
                    const isSelected = String(p.id) === targetProfileId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTargetProfileId(String(p.id))}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-500/15 border-primary-500 text-primary-950 dark:text-primary-300 ring-2 ring-primary-500/25"
                            : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                        }`}
                      >
                        <div className="truncate">{p.name}</div>
                        <div className="text-[10px] text-neutral-400 font-normal">
                          {p.relation || "Profile"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supported Brokers Badges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Auto-Supported Brokers & Formats
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle size={13} />
                    How to export
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_BROKERS.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200"
                    >
                      <Sparkles size={11} className="text-primary-500" />
                      {b.name}
                    </span>
                  ))}
                  <span className="inline-flex items-center px-2 py-1 rounded-xl text-xs font-semibold bg-neutral-50 dark:bg-white/[0.02] text-neutral-400 border border-dashed border-neutral-200 dark:border-white/10">
                    .CSV
                  </span>
                </div>

                {/* Expandable How-To Guide */}
                {showGuide && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300 space-y-2 animate-in fade-in">
                    <p className="font-bold text-neutral-900 dark:text-white">Quick Export Instructions:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>
                        <b>Zerodha:</b> Log in to Console &rarr; Reports &rarr; Tradebook &rarr; Choose dates &rarr; Download CSV.
                      </li>
                      <li>
                        <b>Groww:</b> Go to Profile &rarr; Reports &rarr; Stock Orders &rarr; Download statement CSV.
                      </li>
                      <li>
                        <b>AngelOne:</b> Go to Reports &rarr; Tradebook &rarr; Download CSV.
                      </li>
                      <li>
                        <b>Custom Sheet:</b> Columns: <code>Stock/Symbol</code>, <code>Trade Date</code>, <code>Type (BUY/SELL)</code>, <code>Quantity</code>, <code>Price</code>.
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-primary-500 bg-primary-500/10 scale-[1.01]"
                    : "border-neutral-200 dark:border-white/15 bg-neutral-50/50 dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {isPreviewing ? (
                  <div className="py-4 space-y-3">
                    <Loader2 size={36} className="animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                    <div>
                      <p className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Analyzing Tradebook CSV...
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Detecting broker format, resolving symbols, and checking duplicates
                      </p>
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="py-2 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white truncate max-w-sm mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click or drop another to replace
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">
                        Click to select your Tradebook statement (.csv)
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        or drag and drop your CSV file here
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Template Download */}
              <div className="bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                    <Download size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Need a reference template?
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Pre-formatted CSV columns with sample BUY & SELL rows
                    </p>
                  </div>
                </div>

                <a
                  href="/assets/arthavi_sample_tradebook.csv"
                  download="arthavi_sample_tradebook.csv"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/15 transition-all shadow-xs shrink-0"
                >
                  <Download size={13} />
                  <span>Download Sample CSV</span>
                </a>
              </div>
            </div>
          )}

          {/* ════════ STEP 2: PREVIEW & VERIFY ════════ */}
          {step === "PREVIEW" && previewData && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-neutral-50 dark:bg-white/5 p-3 rounded-2xl border border-neutral-200 dark:border-white/10">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Total Rows</span>
                  <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                    {previewData.valid_trades_count}
                  </div>
                </div>

                <div className="bg-emerald-50/60 dark:bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">New Trades</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {previewData.new_trades_count}
                  </div>
                </div>

                <div className="bg-amber-50/60 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Already Added (Duplicate)</span>
                  <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5">
                    {previewData.duplicate_trades_count}
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-white/5 p-3 rounded-2xl border border-neutral-200 dark:border-white/10">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Target Profile</span>
                  <div className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white truncate mt-1">
                    {targetProfileName}
                  </div>
                </div>
              </div>

              {/* Informational Banner for Duplicate Trades */}
              {previewData.duplicate_trades_count > 0 && (
                <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <Info size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <b>{previewData.duplicate_trades_count} trade{previewData.duplicate_trades_count > 1 ? "s" : ""}</b> were already added to your portfolio in a previous upload and are unchecked by default to prevent duplicate counting.
                  </span>
                </div>
              )}

              {/* Filter & Selection Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search stock symbol..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none w-44"
                  />

                  <div className="flex rounded-xl bg-neutral-100 dark:bg-white/5 p-0.5 border border-neutral-200 dark:border-white/10 text-[11px] font-semibold">
                    {(["ALL", "BUY", "SELL"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          typeFilter === t
                            ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-xs font-bold"
                            : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                  <span className="text-neutral-500 font-medium">
                    <b>{selectedCount}</b> of {previewData.trades.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllFiltered(filteredTrades)}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {filteredTrades.every((t) => selectedTradeIds.has(t.temp_id))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
              </div>

              {/* Trades List Table */}
              <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden max-h-64 sm:max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10 text-neutral-500 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2 w-8"></th>
                      <th className="py-2.5 px-2">Stock</th>
                      <th className="py-2.5 px-2">Action</th>
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-right">Price</th>
                      <th className="py-2.5 pr-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                    {filteredTrades.map((t) => {
                      const isSelected = selectedTradeIds.has(t.temp_id);
                      return (
                        <tr
                          key={t.temp_id}
                          onClick={() => handleToggleTrade(t.temp_id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary-50/40 dark:bg-primary-500/[0.06] hover:bg-primary-50/70"
                              : "hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] opacity-60"
                          }`}
                        >
                          <td className="py-2 pl-3 pr-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleTrade(t.temp_id)}
                              className="rounded text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <span>{t.symbol}</span>
                              {t.is_duplicate && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold whitespace-nowrap">
                                  Already Added (Duplicate)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate max-w-[130px] sm:max-w-[180px]">
                              {t.company_name}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                t.transaction_type === "BUY"
                                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              {t.transaction_type}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                            {t.date}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                            {t.quantity}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            ₹{t.price.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                            ₹{Math.round(t.amount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Errors banner if any */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">
                    {previewData.errors.length} rows could not be parsed:
                  </span>
                  <div className="text-[11px] mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                    {previewData.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>
                        Row {err.row}: {err.symbol} &bull; {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════ STEP 3: SUCCESS ════════ */}
          {step === "SUCCESS" && commitResult && (
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-neutral-900 dark:text-white">
                  Trades Imported Successfully!
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  Imported <b>{commitResult.added} trades</b> across{" "}
                  <b>{commitResult.affected_symbols.length} stocks</b> into {targetProfileName}.
                  Holdings and weighted averages have been recalculated.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto pt-2">
                {commitResult.affected_symbols.slice(0, 8).map((sym) => (
                  <span
                    key={sym}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200 font-mono"
                  >
                    {sym}
                  </span>
                ))}
                {commitResult.affected_symbols.length > 8 && (
                  <span className="px-2 py-1 rounded-xl text-xs text-neutral-400">
                    +{commitResult.affected_symbols.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          {step === "UPLOAD" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFile || isPreviewing}
                onClick={() => runPreview()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-primary-500/25 transition-all"
              >
                {isPreviewing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Next: Verify Trades</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          )}

          {step === "PREVIEW" && (
            <>
              <button
                type="button"
                onClick={() => setStep("UPLOAD")}
                disabled={isCommitting}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Upload Different File</span>
              </button>

              <button
                type="button"
                disabled={selectedCount === 0 || isCommitting}
                onClick={handleCommit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-emerald-500/25 transition-all"
              >
                {isCommitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Importing & Recalculating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Import {selectedCount} Trades</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === "SUCCESS" && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Done & View Stock Holdings
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
