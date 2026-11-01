"use client";

import React, { useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building2,
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
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<{
    importedCount: number;
    skippedCount: number;
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setResultSummary(null);
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

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg("Please select a file to upload.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg(null);
      const res = await api.uploadFixedIncomeBulk(file, profileId);
      setResultSummary({
        importedCount: res.imported_count || 0,
        skippedCount: res.skipped_count || 0,
        errors: res.errors || [],
      });
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to upload file. Please check file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(api.getFixedIncomeTemplateUrl(), "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                Bulk Import Debt Investments
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Upload your Bank FDs, Corporate Deposits, Post Office (SCSS/MIS), RBI Bonds, and PPF in one go via Excel or CSV.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Download Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Download size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-neutral-900 dark:text-white">
                Download Standard Template
              </div>
              <div className="text-[11px] text-neutral-400">
                Pre-formatted with SCSS, MIS, RBI Bonds, NHAI &amp; Corp FDs
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            Download CSV
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
              : file
              ? "border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10"
              : "border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 bg-neutral-50/50 dark:bg-white/2"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Upload size={22} />
            </div>

            {file ? (
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB — Click or drop to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  Drop your Excel (.xlsx) or CSV file here
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  or click to browse from your device
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Supported Categories Badges */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Supported Instruments &amp; Institutions:
          </span>
          <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">Bank FDs</span>
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">Post Office SCSS</span>
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">Post Office MIS</span>
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">RBI Savings Bonds</span>
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">Tax-Free Bonds (NHAI/REC)</span>
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">Corporate FDs (Bajaj/Shriram/MM)</span>
            <span className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-white/10">PPF &amp; EPF</span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Result summary */}
        {resultSummary && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Successfully imported {resultSummary.importedCount} holding{resultSummary.importedCount === 1 ? "" : "s"}!</span>
            </div>
            {resultSummary.skippedCount > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {resultSummary.skippedCount} row{resultSummary.skippedCount === 1 ? "" : "s"} skipped or had formatting warnings.
              </p>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Import Holdings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
