"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  User,
} from "lucide-react";

interface DebtBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profileId?: string;
}

export default function DebtBulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  profileId,
}: DebtBulkUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState<"UPLOAD" | "SUCCESS">("UPLOAD");
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    importedCount: number;
    skippedCount: number;
    errors?: string[];
  } | null>(null);

  const { profiles, activeProfileId } = useProfile();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    profileId || activeProfileId || "all"
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selectedProfileId when profileId prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProfileId(profileId || activeProfileId || "all");
      setFile(null);
      setErrorMsg(null);
      setResultSummary(null);
      setStep("UPLOAD");
      setShowErrorDetails(false);
    }
  }, [isOpen, profileId, activeProfileId]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUploading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  if (!mounted || !isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.toLowerCase();
      if (ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        setFile(selected);
        setErrorMsg(null);
        setResultSummary(null);
      } else {
        setErrorMsg("Please upload a valid Excel (.xlsx, .xls) or CSV file.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.toLowerCase();
      if (ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        setFile(droppedFile);
        setErrorMsg(null);
        setResultSummary(null);
      } else {
        setErrorMsg("Please upload a valid Excel (.xlsx, .xls) or CSV file.");
      }
    }
  };

  const handleRemoveFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFile(null);
    setErrorMsg(null);
    setResultSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg("Please select a file to upload.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);
      const res = await api.uploadFixedIncomeBulk(file, selectedProfileId);
      const importedCount = res.imported_count || 0;
      const skippedCount = res.skipped_count || 0;
      const errors = res.errors || [];

      if (importedCount === 0 && skippedCount > 0) {
        setErrorMsg(
          res.message || "No holdings could be imported. Please verify that column names match the template."
        );
        setResultSummary({
          importedCount: 0,
          skippedCount,
          errors,
        });
        return;
      }

      setResultSummary({
        importedCount,
        skippedCount,
        errors,
      });
      setStep("SUCCESS");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to upload file. Please check file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(api.getFixedIncomeTemplateUrl(), "_blank");
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const handleResetForAnotherFile = () => {
    setFile(null);
    setErrorMsg(null);
    setResultSummary(null);
    setShowErrorDetails(false);
    setStep("UPLOAD");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none overscroll-none pointer-events-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      {/* Dark backdrop blur */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />

      {/* Modal Dialog Card */}
      <div
        className="relative bg-white dark:bg-[#151A23] border-t sm:border border-neutral-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden transition-all transform animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile top pull-handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20" />
        </div>

        {/* ── HEADER ── */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-xs">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white">
                  {step === "SUCCESS" ? "Import Summary" : "Bulk Import Debt Investments"}
                </h3>
                {step === "UPLOAD" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    FD, SCSS & Bonds
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {step === "SUCCESS"
                  ? "Your holdings have been imported and compounding schedules prepared."
                  : "Upload Bank FDs, SCSS, Post Office MIS, RBI Bonds, or PPF via Excel/CSV."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close modal"
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* ════════ STEP 1: UPLOAD & CONFIGURE ════════ */}
          {step === "UPLOAD" && (
            <>
              {/* Profile Selector (if user has multiple profiles) */}
              {profiles && profiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Import For Profile
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      Can also be specified per row via &quot;Owner&quot; column
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProfileId("all")}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        selectedProfileId === "all"
                          ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/25"
                          : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="truncate flex items-center gap-1.5">
                        <User size={13} className="text-emerald-500" />
                        <span>Default Profile</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-normal mt-0.5">
                        Auto-assigned primary
                      </div>
                    </button>

                    {profiles
                      .filter((p) => !p.is_archived)
                      .map((p) => {
                        const isSelected = String(p.id) === selectedProfileId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProfileId(String(p.id))}
                            className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/25"
                                : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-white/20"
                            }`}
                          >
                            <div className="truncate">{p.name}</div>
                            <div className="text-[10px] text-neutral-400 font-normal mt-0.5">
                              {p.relation || (p.is_default ? "Primary" : "Member")}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Template Download Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Download size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      Need the standard spreadsheet format?
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Pre-formatted columns with Bank FD, SCSS, MIS, RBI Bonds &amp; Tax-Free examples
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* ── DRAG & DROP / SELECTED FILE AREA ── */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!file ? (
                  /* Dropzone State */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]"
                        : "border-neutral-200 dark:border-white/10 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 bg-neutral-50/50 dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                        <Upload size={26} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">
                          Drop your Excel (.xlsx, .xls) or CSV file here
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          or click to browse your computer
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200/60 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                          .XLSX
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200/60 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                          .XLS
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200/60 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                          .CSV
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Selected File Card State */
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <FileSpreadsheet size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase shrink-0">
                              {file.name.split(".").pop() || "FILE"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Ready to import
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/15 transition-all cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          disabled={isUploading}
                          aria-label="Remove selected file"
                          className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Supported Categories Badges */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Supported Instruments &amp; Institutions:
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    Bank FDs (HDFC, SBI, ICICI)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    Post Office SCSS
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    Post Office MIS
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    RBI Floating Rate Bonds
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    Tax-Free Bonds (NHAI/REC)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    Corporate FDs (Bajaj/Shriram)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5">
                    PPF &amp; EPF
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMsg}</div>
                </div>
              )}
            </>
          )}

          {/* ════════ STEP 2: SUCCESS / SUMMARY ════════ */}
          {step === "SUCCESS" && resultSummary && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white">
                  Holdings Imported Successfully!
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Your fixed income investments and maturity dates are now synced into your portfolio.
                </p>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-500/20 text-center">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {resultSummary.importedCount}
                  </span>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
                    Holdings Created
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border text-center ${
                    resultSummary.skippedCount > 0
                      ? "bg-amber-50 dark:bg-amber-950/25 border-amber-500/20"
                      : "bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/10"
                  }`}
                >
                  <span
                    className={`text-2xl font-black ${
                      resultSummary.skippedCount > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {resultSummary.skippedCount}
                  </span>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
                    Skipped / Warnings
                  </p>
                </div>
              </div>

              {/* Warning/Error accordion if rows were skipped */}
              {resultSummary.errors && resultSummary.errors.length > 0 && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all cursor-pointer"
                  >
                    <span>View {resultSummary.errors.length} Row Warning(s)</span>
                    {showErrorDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showErrorDetails && (
                    <div className="px-4 pb-3 pt-1 border-t border-amber-200/60 dark:border-amber-500/20 space-y-1.5 max-h-40 overflow-y-auto">
                      {resultSummary.errors.map((err, i) => (
                        <div key={i} className="text-[11px] text-amber-800 dark:text-amber-300 font-mono">
                          • {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-white/[0.02] shrink-0">
          {step === "UPLOAD" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Importing Holdings...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    <span>Import Holdings</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetForAnotherFile}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Import Another File</span>
              </button>

              <button
                type="button"
                onClick={handleDone}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Check size={15} />
                <span>Done &amp; View Holdings</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
