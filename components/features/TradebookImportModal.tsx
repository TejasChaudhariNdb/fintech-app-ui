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
  Plus,
  Trash2,
  Files,
  Gift,
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
  onOpenDematReconcile?: () => void;
}

const SUPPORTED_BROKERS = [
  { id: "ZERODHA", name: "Zerodha", desc: "Console > Reports > Tradebook" },
  { id: "GROWW", name: "Groww", desc: "Profile > Reports > Stocks Order" },
  { id: "ANGELONE", name: "AngelOne", desc: "Reports > Tradebook" },
  { id: "UPSTOX", name: "Upstox", desc: "Account > Reports > Trade History" },
  { id: "CUSTOM", name: "Custom CSV", desc: "Custom Portfolio Spreadsheet" },
];

/**
 * Merges multiple CSV tradebooks in memory, keeping one clean header
 * and combining all data rows. Deduplicates identical lines.
 */
async function mergeCsvFiles(files: File[]): Promise<File> {
  if (files.length === 1) return files[0];

  let headerLine = "";
  const dataLines: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const text = await files[i].text();
    const rawLines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let fileHeaderIdx = -1;
    for (let j = 0; j < Math.min(rawLines.length, 10); j++) {
      const lower = rawLines[j].toLowerCase();
      if (
        lower.includes("symbol") ||
        lower.includes("trade_date") ||
        lower.includes("trade_type") ||
        lower.includes("stock")
      ) {
        fileHeaderIdx = j;
        break;
      }
    }

    if (fileHeaderIdx === -1 && rawLines.length > 0) {
      fileHeaderIdx = 0;
    }

    if (!headerLine && fileHeaderIdx !== -1) {
      headerLine = rawLines[fileHeaderIdx];
    }

    const rows = fileHeaderIdx !== -1 ? rawLines.slice(fileHeaderIdx + 1) : rawLines;
    dataLines.push(...rows);
  }

  // Deduplicate identical data rows across overlapping date ranges
  const uniqueDataLines = Array.from(new Set(dataLines));
  const combinedContent = [headerLine, ...uniqueDataLines].join("\n");
  return new File([combinedContent], `combined_${files.length}_tradebooks.csv`, {
    type: "text/csv",
  });
}

export default function TradebookImportModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenDematReconcile,
}: TradebookImportModalProps) {
  const { profiles, activeProfileId } = useProfile();
  const [mounted, setMounted] = useState(false);

  // Flow steps: 'UPLOAD' -> 'PREVIEW' -> 'SUCCESS'
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "SUCCESS">("UPLOAD");

  // Mode: 'HOLDINGS' (primary / single truth) vs 'TRADEBOOK' (historical order log)
  const [importMode, setImportMode] = useState<"HOLDINGS" | "TRADEBOOK">("HOLDINGS");
  const [holdingsFile, setHoldingsFile] = useState<File | null>(null);
  const [isImportingHoldings, setIsImportingHoldings] = useState(false);
  const [isDraggingHoldings, setIsDraggingHoldings] = useState(false);
  const [holdingsImportResult, setHoldingsImportResult] = useState<{
    imported_count: number;
    total_invested: number;
    total_current_value: number;
    items: any[];
  } | null>(null);
  const holdingsFileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  // Quick-Add Missing Trade State (Idea 2)
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualType, setManualType] = useState<"BUY" | "SELL">("BUY");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualQty, setManualQty] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  // Commit states
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    added: number;
    affected_symbols: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHoldingsFileSelected = async (f: File) => {
    if (!f) return;
    setHoldingsFile(f);
    setIsImportingHoldings(true);
    setErrorMessage(null);
    try {
      const res = await api.importHoldingsStatement(f, targetProfileId);
      setHoldingsImportResult(res);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to import holdings statement.");
    } finally {
      setIsImportingHoldings(false);
    }
  };

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
        setImportMode("HOLDINGS");
        setHoldingsFile(null);
        setHoldingsImportResult(null);
        setIsImportingHoldings(false);
        setIsDraggingHoldings(false);
        setSelectedFiles([]);
        setSelectedFile(null);
        setPreviewData(null);
        setSelectedTradeIds(new Set());
        setCommitResult(null);
        setErrorMessage(null);
        setSearchFilter("");
        setShowQuickAdd(false);
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Handlers for Multi-File Selection (Idea 1)
  const handleFilesSelected = async (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;
    setErrorMessage(null);

    // Merge with any previously chosen files if in UPLOAD step
    const combinedList = [...selectedFiles, ...newFiles];
    // Deduplicate by filename and size
    const uniqueFilesMap = new Map<string, File>();
    combinedList.forEach((f) => uniqueFilesMap.set(`${f.name}_${f.size}`, f));
    const allFiles = Array.from(uniqueFilesMap.values());

    setSelectedFiles(allFiles);

    setIsPreviewing(true);
    try {
      const merged = await mergeCsvFiles(allFiles);
      setSelectedFile(merged);
      await runPreview(merged);
    } catch (err: any) {
      setErrorMessage(
        "Failed to combine CSV files: " + (err.message || String(err))
      );
      setIsPreviewing(false);
    }
  };

  const handleRemoveFile = async (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(remaining);

    if (remaining.length === 0) {
      setSelectedFile(null);
      setPreviewData(null);
      return;
    }

    setIsPreviewing(true);
    try {
      const merged = await mergeCsvFiles(remaining);
      setSelectedFile(merged);
      await runPreview(merged);
    } catch (err: any) {
      setErrorMessage("Failed to process remaining files: " + (err.message || String(err)));
      setIsPreviewing(false);
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
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

  // Idea 2: Quick-Add In-Modal Trade Handler
  const handleAddManualTrade = () => {
    const sym = manualSymbol.trim().toUpperCase();
    const qty = parseFloat(manualQty);
    const price = parseFloat(manualPrice);

    if (!sym) {
      setErrorMessage("Please enter a stock symbol (e.g. IDEA, BEL).");
      return;
    }
    if (!manualDate) {
      setErrorMessage("Please select a trade date.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage("Quantity must be greater than 0.");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setErrorMessage("Price must be greater than 0.");
      return;
    }

    const newId = `manual_${Date.now()}`;
    const amount = Math.round(qty * price * 100) / 100;
    const newTrade: TradeRecord = {
      temp_id: newId,
      row_num: (previewData?.trades.length || 0) + 1,
      symbol: sym,
      company_name: sym,
      exchange: "NSE",
      transaction_type: manualType,
      quantity: qty,
      price: price,
      amount: amount,
      date: manualDate,
      trade_id: `MANUAL_${Date.now()}`,
      order_id: "MANUAL_FIX",
      is_duplicate: false,
    };

    if (previewData) {
      const updatedTrades = [...previewData.trades, newTrade].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.transaction_type === "BUY" ? -1 : 1;
      });

      const symSet = new Set(previewData.unique_symbols);
      symSet.add(sym);

      setPreviewData({
        ...previewData,
        valid_trades_count: previewData.valid_trades_count + 1,
        new_trades_count: previewData.new_trades_count + 1,
        buy_count: previewData.buy_count + (manualType === "BUY" ? 1 : 0),
        sell_count: previewData.sell_count + (manualType === "SELL" ? 1 : 0),
        total_buy_value:
          previewData.total_buy_value + (manualType === "BUY" ? amount : 0),
        total_sell_value:
          previewData.total_sell_value + (manualType === "SELL" ? amount : 0),
        unique_symbols: Array.from(symSet).sort(),
        trades: updatedTrades,
      });

      setSelectedTradeIds((prev) => new Set(prev).add(newId));
    }

    // Reset quick-add form
    setManualSymbol("");
    setManualQty("");
    setManualPrice("");
    setShowQuickAdd(false);
    setErrorMessage(null);
  };

  // In-Modal Trade Deletion Handler
  const handleDeleteTrade = (tempId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!previewData) return;
    const target = previewData.trades.find((t) => t.temp_id === tempId);
    if (!target) return;

    const nextTrades = previewData.trades.filter((t) => t.temp_id !== tempId);
    const nextSelected = new Set(selectedTradeIds);
    nextSelected.delete(tempId);

    setSelectedTradeIds(nextSelected);
    setPreviewData({
      ...previewData,
      valid_trades_count: Math.max(0, previewData.valid_trades_count - 1),
      new_trades_count: Math.max(
        0,
        previewData.new_trades_count - (target.is_duplicate ? 0 : 1)
      ),
      duplicate_trades_count: Math.max(
        0,
        previewData.duplicate_trades_count - (target.is_duplicate ? 1 : 0)
      ),
      buy_count: Math.max(
        0,
        previewData.buy_count - (target.transaction_type === "BUY" ? 1 : 0)
      ),
      sell_count: Math.max(
        0,
        previewData.sell_count - (target.transaction_type === "SELL" ? 1 : 0)
      ),
      trades: nextTrades,
    });
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
                    ? importMode === "HOLDINGS"
                      ? "Import Stock Portfolio"
                      : "Upload Broker Tradebook"
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
                  ? importMode === "HOLDINGS"
                    ? "Instant 1-click sync from Broker Demat Holdings (Zerodha, Groww, Upstox)"
                    : "Import multi-year tradebooks automatically from Zerodha, Groww, AngelOne & CSV"
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

        {/* ── MODE TABS (Holdings Statement vs Tradebook) ── */}
        {step === "UPLOAD" && (
          <div className="px-5 sm:px-6 pt-3 pb-0 bg-neutral-50/50 dark:bg-white/[0.01] border-b border-neutral-100 dark:border-white/5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setImportMode("HOLDINGS");
                setErrorMessage(null);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                importMode === "HOLDINGS"
                  ? "border-primary-600 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <Sparkles size={16} />
              <span>Holdings Statement</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Recommended
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode("TRADEBOOK");
                setErrorMessage(null);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                importMode === "TRADEBOOK"
                  ? "border-primary-600 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <FileSpreadsheet size={16} />
              <span>Tradebook Orders</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-white/10 text-neutral-500">
                Order Logs
              </span>
            </button>
          </div>
        )}

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
                  Import For Family Member
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

              {/* ════════ TAB A: HOLDINGS STATEMENT (RECOMMENDED) ════════ */}
              {importMode === "HOLDINGS" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Supported Brokers Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        Auto-Supported Broker Statements
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
                      {["Zerodha (Console)", "Groww", "Upstox", "AngelOne", "ICICI Direct"].map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200"
                        >
                          <Sparkles size={11} className="text-primary-500" />
                          {b}
                        </span>
                      ))}
                      <span className="inline-flex items-center px-2 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        .XLSX & .CSV
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-xl text-xs font-semibold bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20">
                        1-Click Instant Sync
                      </span>
                    </div>

                    {showGuide && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300 space-y-2 animate-in fade-in">
                        <p className="font-bold text-neutral-900 dark:text-white">Where to download Demat statement:</p>
                        <ul className="space-y-1.5 list-disc list-inside">
                          <li>
                            <b>Zerodha:</b> Console &rarr; <b>Portfolio</b> &rarr; <b>Holdings</b> &rarr; Click <b>Download (.xlsx or .csv)</b> on top right.
                          </li>
                          <li>
                            <b>Groww:</b> Go to <b>Profile</b> &rarr; <b>Reports</b> &rarr; <b>Stocks Holdings Statement</b>.
                          </li>
                          <li>
                            <b>Upstox:</b> Go to <b>Account</b> &rarr; <b>Reports</b> &rarr; <b>Holdings Statement</b>.
                          </li>
                          <li>
                            <b>Custom Excel/CSV:</b> Columns: <code>Symbol</code> (or Stock/ISIN), <code>Quantity Available</code> (or Qty), <code>Average Price</code> (or Buy Price).
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Why Demat Statement Banner */}
                  <div className="bg-primary-50/50 dark:bg-primary-500/[0.06] border border-primary-200/60 dark:border-primary-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      <span className="font-bold text-neutral-900 dark:text-white">
                        Single Source of Truth:
                      </span>{" "}
                      Your broker Holdings statement automatically factors in multi-year historical buys, bonus shares (e.g. NBCC 1:2), stock splits, and demergers. It provides 100% precision with zero missing-buy errors.
                    </div>
                  </div>

                  {/* Drag & Drop Zone / Results */}
                  {holdingsImportResult ? (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 rounded-3xl bg-emerald-500/[0.08] border border-emerald-500/25 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                                Demat Holdings Synchronized!
                              </h4>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                Loaded {holdingsImportResult.imported_count} active stocks for {targetProfileName}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setHoldingsImportResult(null);
                              setHoldingsFile(null);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
                          >
                            Upload Another
                          </button>
                        </div>

                        {/* 3 Metric Cards */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Active Stocks</span>
                            <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                              {holdingsImportResult.imported_count}
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Total Invested</span>
                            <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                              ₹{Number(holdingsImportResult.total_invested || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Current Value</span>
                            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                              ₹{Number(holdingsImportResult.total_current_value || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Preview items list */}
                        {holdingsImportResult.items && holdingsImportResult.items.length > 0 && (
                          <div className="max-h-48 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#151922] text-xs">
                            <table className="w-full border-collapse">
                              <thead className="bg-neutral-50 dark:bg-white/5 sticky top-0 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                <tr>
                                  <th className="text-left px-3 py-2">Stock</th>
                                  <th className="text-right px-3 py-2">Qty</th>
                                  <th className="text-right px-3 py-2">Avg Buy</th>
                                  <th className="text-right px-3 py-2">Invested</th>
                                  <th className="text-right px-3 py-2">LTP</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                                {holdingsImportResult.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]">
                                    <td className="px-3 py-2 font-mono font-bold text-neutral-900 dark:text-white">
                                      {item.symbol}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-neutral-700 dark:text-neutral-300">
                                      {item.quantity}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                      ₹{Number(item.avg_buy_price || 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-semibold text-neutral-900 dark:text-white">
                                      ₹{Number(item.total_invested || 0).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-neutral-500">
                                      {item.current_price ? `₹${Number(item.current_price).toFixed(2)}` : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingHoldings(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingHoldings(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingHoldings(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleHoldingsFileSelected(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => holdingsFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                        isDraggingHoldings
                          ? "border-primary-500 bg-primary-500/10 scale-[1.01]"
                          : "border-neutral-200 dark:border-white/15 bg-neutral-50/50 dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <input
                        ref={holdingsFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleHoldingsFileSelected(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {isImportingHoldings ? (
                        <div className="py-6 space-y-3">
                          <Loader2 size={38} className="animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                          <div>
                            <p className="font-extrabold text-sm text-neutral-900 dark:text-white">
                              Syncing Demat Portfolio...
                            </p>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              Reading stocks, quantities, average buy costs, and updating live market prices
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 space-y-2.5">
                          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto shadow-xs">
                            <Upload size={24} />
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-neutral-900 dark:text-white">
                              Drop your Demat Holdings Statement here
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                              Supports Zerodha Excel (<b>.xlsx</b>) / <b>.csv</b>, Groww, Upstox holdings
                            </p>
                          </div>
                          <div className="pt-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 text-xs font-bold text-primary-600 dark:text-primary-400 shadow-xs">
                              <FileSpreadsheet size={13} />
                              <span>Browse File (.xlsx / .csv)</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ════════ TAB B: TRADEBOOK ORDERS ════════ */}
              {importMode === "TRADEBOOK" && (
                <div className="space-y-4 animate-in fade-in duration-150">
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
                      <span className="inline-flex items-center px-2 py-1 rounded-xl text-xs font-semibold bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20">
                        Multi-File Drop Supported
                      </span>
                    </div>

                    {/* Expandable How-To Guide */}
                    {showGuide && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300 space-y-2 animate-in fade-in">
                        <p className="font-bold text-neutral-900 dark:text-white">Quick Export Instructions:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>
                            <b>Zerodha (Multi-Year):</b> If Zerodha limits export to 365 days, export multiple yearly CSVs (e.g. 2020-21, 2021-22, 2022-23) and select or drop them together! Arthavi merges them in date order automatically.
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

                  {/* Drag & Drop File Zone (Supports Multiple Files - Idea 1) */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-primary-500 bg-primary-500/10 scale-[1.01]"
                        : "border-neutral-200 dark:border-white/15 bg-neutral-50/50 dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      multiple
                      onChange={(e) => handleFilesSelected(Array.from(e.target.files || []))}
                      className="hidden"
                    />

                    {isPreviewing ? (
                      <div className="py-4 space-y-3">
                        <Loader2 size={36} className="animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                        <div>
                          <p className="font-extrabold text-sm text-neutral-900 dark:text-white">
                            {selectedFiles.length > 1
                              ? `Merging ${selectedFiles.length} Tradebooks & Analyzing...`
                              : "Analyzing Tradebook CSV..."}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Detecting broker format, ordering dates, and checking duplicates
                          </p>
                        </div>
                      </div>
                    ) : selectedFiles.length > 1 ? (
                      <div className="py-2 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto shadow-sm">
                          <Files size={24} />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-neutral-900 dark:text-white">
                            {selectedFiles.length} Yearly Tradebooks Combined
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Merged seamlessly in chronological order. Click or drop to add more.
                          </p>
                        </div>
                        {/* File chips */}
                        <div
                          className="flex flex-wrap gap-1.5 justify-center max-w-lg mx-auto pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {selectedFiles.map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 shadow-xs"
                            >
                              <span className="truncate max-w-[120px]">{f.name}</span>
                              <span className="text-[10px] text-neutral-400">
                                ({(f.size / 1024).toFixed(0)}k)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveFile(i, e)}
                                className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-400 hover:text-rose-500 transition-colors"
                                title="Remove this file"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
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
                            {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click or drop more files to combine
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
                            Drop 1 or multiple Tradebook CSVs here
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Export yearly statements from Zerodha/Groww and drop all at once
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Demat Reconciliation Banner */}
                  {onOpenDematReconcile && (
                    <div className="bg-gradient-to-r from-amber-500/[0.08] to-amber-500/[0.02] border border-amber-500/20 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Gift size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            Have Bonus Shares or Demat Discrepancies?
                          </span>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            Bonus shares (like NBCC 1:2) don&apos;t appear in tradebook orders. Reconcile with your Demat statement.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDematReconcile();
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs shrink-0 active:scale-95"
                      >
                        <span>Reconcile Demat</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

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
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Already Added</span>
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
                    <b>{previewData.duplicate_trades_count} trade{previewData.duplicate_trades_count > 1 ? "s" : ""}</b> were already added in a previous upload and are unchecked to prevent duplicates.
                  </span>
                </div>
              )}

              {/* Filter & Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search stock symbol..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none w-40 sm:w-44"
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
                  {/* Idea 2: Quick-Add Button */}
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/25 border border-primary-500/20 transition-all shrink-0"
                  >
                    <Plus size={14} />
                    <span>Add Missing Trade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAllFiltered(filteredTrades)}
                    className="text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-primary-600 underline"
                  >
                    {filteredTrades.every((t) => selectedTradeIds.has(t.temp_id))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
              </div>

              {/* Idea 2: Quick-Add In-Modal Form */}
              {showQuickAdd && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-primary-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-500" />
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        Add Missing Trade (e.g. older buy, demat transfer, or IPO)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        Stock Symbol
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. IDEA, BEL"
                        value={manualSymbol}
                        onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-mono font-bold uppercase outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        Action
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-white dark:bg-white/5 p-0.5 rounded-xl border border-neutral-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setManualType("BUY")}
                          className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                            manualType === "BUY"
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualType("SELL")}
                          className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                            manualType === "SELL"
                              ? "bg-rose-500 text-white shadow-xs"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        Trade Date
                      </label>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={manualQty}
                        onChange={(e) => setManualQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-mono outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Price"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-mono outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-neutral-500 font-mono">
                      Total:{" "}
                      <b className="text-neutral-900 dark:text-white">
                        ₹
                        {(
                          (parseFloat(manualQty) || 0) * (parseFloat(manualPrice) || 0)
                        ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </b>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickAdd(false)}
                        className="px-3 py-1.5 rounded-xl text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddManualTrade}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all"
                      >
                        Add to Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Trades List Table */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1">
                <span>
                  <b>{selectedCount}</b> of {previewData.trades.length} trades selected
                </span>
                <span className="sm:hidden">← Swipe to view Price & Total →</span>
              </div>
              <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-x-auto overflow-y-auto max-h-64 sm:max-h-72 scrollbar-thin touch-pan-x">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-white/10 text-neutral-500 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2 w-8"></th>
                      <th className="py-2.5 px-2">Stock</th>
                      <th className="py-2.5 px-2">Action</th>
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-right">Price</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 pr-3 pl-1 w-8"></th>
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
                              className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <span>{t.symbol}</span>
                              {t.is_duplicate && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold whitespace-nowrap">
                                  Already Added
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
                          <td className="py-2 px-2 text-right font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                            ₹{Math.round(t.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 pr-3 pl-1 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTrade(t.temp_id, e)}
                              className="p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Delete row from import"
                            >
                              <Trash2 size={13} />
                            </button>
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
            importMode === "HOLDINGS" ? (
              holdingsImportResult ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm shadow-primary-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>Done & View Stock Holdings</span>
                </button>
              ) : (
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
                    disabled={isImportingHoldings}
                    onClick={() => holdingsFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-primary-500/25 transition-all"
                  >
                    {isImportingHoldings ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Importing Holdings...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Select File (.xlsx / .csv)</span>
                      </>
                    )}
                  </button>
                </>
              )
            ) : (
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
            )
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
