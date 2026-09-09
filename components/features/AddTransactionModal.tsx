"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { api } from "@/lib/api";
import { Check, TrendingUp, TrendingDown, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSchemeId?: number | null;
  initialTransactionType?: "PURCHASE" | "REDEMPTION";
  initialTab?: "MANUAL" | "IMPORT";
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialSchemeId = null,
  initialTransactionType = "PURCHASE",
  initialTab = "MANUAL",
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"MANUAL" | "IMPORT">(initialTab);

  // Profile Context
  const { profiles, activeProfileId } = useProfile();
  const [targetProfileId, setTargetProfileId] = useState<string>("");

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Manual Form State
  const [schemes, setSchemes] = useState<any[]>([]);
  const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedNewScheme, setSelectedNewScheme] = useState<any>(null);

  const defaultFormData = () => ({
    scheme_id: "",
    type: "PURCHASE" as "PURCHASE" | "REDEMPTION",
    date: new Date().toISOString().split("T")[0],
    units: "",
    amount: "",
    nav: "",
  });

  const [formData, setFormData] = useState({
    scheme_id: "",
    type: "PURCHASE", // PURCHASE, REDEMPTION
    date: new Date().toISOString().split("T")[0],
    units: "",
    amount: "",
    nav: "",
  });

  // Reset and load on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "MANUAL");
      setCsvFile(null);
      setImportError(null);
      setImportSuccess(null);

      if (activeProfileId && activeProfileId !== "all") {
        setTargetProfileId(activeProfileId);
      } else if (profiles.length > 0) {
        const def = profiles.find((p) => p.is_default) || profiles[0];
        setTargetProfileId(String(def.id));
      }

      const nextType = initialTransactionType || "PURCHASE";
      setMode("EXISTING");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedNewScheme(null);
      setFormData({
        ...defaultFormData(),
        scheme_id: initialSchemeId ? String(initialSchemeId) : "",
        type: nextType,
      });
      loadSchemes();
    } else {
      setMode("EXISTING");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedNewScheme(null);
      setFormData(defaultFormData());
    }
  }, [isOpen, initialSchemeId, initialTransactionType, initialTab, activeProfileId, profiles]);

  const loadSchemes = async () => {
    try {
      const data = await api.getSchemes();
      setSchemes(data);
      if (data.length === 0) {
        setMode("NEW");
      }
    } catch (err) {
      console.error("Failed to load schemes", err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await api.searchMutualFunds(query);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const calculateTotal = () => {
    const units = parseFloat(formData.units) || 0;
    const nav = parseFloat(formData.nav) || 0;
    if (units && nav) {
      setFormData((prev) => ({ ...prev, amount: (units * nav).toFixed(2) }));
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        date: formData.date,
        type: formData.type,
        units: parseFloat(formData.units),
        amount: parseFloat(formData.amount),
        nav: parseFloat(formData.nav),
      };

      if (mode === "EXISTING") {
        payload.scheme_id = parseInt(formData.scheme_id);
      } else {
        if (!selectedNewScheme) {
          alert("Please select a scheme from search results");
          setLoading(false);
          return;
        }
        payload.amfi_code = String(selectedNewScheme.schemeCode);
        payload.scheme_name = selectedNewScheme.schemeName;
      }

      await api.addManualTransaction(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.message !== "This action is disabled in demo mode.") {
        alert("Failed to add transaction");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      setImportError("Please select a CSV file to upload.");
      return;
    }
    if (!targetProfileId) {
      setImportError("Please select a target profile.");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const res = await api.importMFTransactionsCSV(csvFile, targetProfileId);
      const msg = `Successfully imported ${res.imported_count} transaction${res.imported_count === 1 ? "" : "s"} across ${res.schemes_affected} scheme${res.schemes_affected === 1 ? "" : "s"}!${res.skipped_count ? ` (${res.skipped_count} duplicate${res.skipped_count === 1 ? "" : "s"} skipped)` : ""}`;
      setImportSuccess(msg);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || "Failed to import CSV. Please verify column headers.");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === "MANUAL" ? "Mutual Fund Transaction" : "Import MF Transactions CSV"}>
      
      {/* Tab Switcher */}
      <div className="flex border-b border-neutral-200 dark:border-white/10 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("MANUAL")}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "MANUAL"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}>
          Enter Manually
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("IMPORT")}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "IMPORT"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}>
          Import CSV File
        </button>
      </div>

      {activeTab === "IMPORT" ? (
        <form onSubmit={handleCsvImport} className="space-y-4">
          {/* Target Profile Selector */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Target Profile
              </label>
              <select
                value={targetProfileId}
                onChange={(e) => setTargetProfileId(e.target.value)}
                required
                className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-primary-500 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all dark:text-white">
                <option value="" disabled>Select Profile</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.relation})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Instructions Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="font-semibold mb-0.5">Upload Instructions:</p>
              <p className="text-xs opacity-90">
                Upload mutual fund transaction CSV from <b>Zerodha Coin</b>, <b>Groww</b>, <b>CAMS</b>, or your own spreadsheet.
              </p>
            </div>
            <a
              href="/assets/mf_transaction_template.csv"
              download="mf_transaction_template.csv"
              className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-white/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors shrink-0 text-emerald-800 dark:text-emerald-100 shadow-sm">
              <Download size={14} />
              Sample CSV
            </a>
          </div>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-neutral-300 dark:border-white/20 rounded-xl p-8 flex flex-col items-center justify-center bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setCsvFile(e.target.files?.[0] || null);
                setImportError(null);
                setImportSuccess(null);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {csvFile ? (
              <div className="text-center">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-medium text-neutral-900 dark:text-white">
                  {csvFile.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {(csvFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <p className="font-medium text-neutral-900 dark:text-white">
                  Click to upload CSV
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  or drag and drop your mutual fund CSV file here
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Success Message */}
          {importSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={16} className="shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* Column Guide Helper */}
          <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-white/[0.02] p-3 rounded-lg border border-neutral-100 dark:border-white/5 space-y-1">
            <p className="font-medium text-neutral-700 dark:text-neutral-300">Supported Columns:</p>
            <p className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              Date, Scheme Name, Type (BUY / SIP / REDEMPTION), Units, NAV, Amount, Folio Number (optional), ISIN (optional)
            </p>
          </div>

          <Button
            type="submit"
            className="w-full py-4 text-base"
            variant="primary"
            isLoading={importing}
            disabled={!csvFile || importing}>
            <Upload className="w-5 h-5 mr-2" />
            {importing ? "Importing Transactions..." : "Import Mutual Fund Transactions"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "PURCHASE" })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formData.type === "PURCHASE"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <TrendingUp className="w-4 h-4" />
              Buy / SIP
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "REDEMPTION" })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formData.type === "REDEMPTION"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              <TrendingDown className="w-4 h-4" />
              Redeem / Sell
            </button>
          </div>

          {/* Scheme Selection Mode */}
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-neutral-200 dark:border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setMode("EXISTING")}
                className={`text-sm font-medium transition-colors ${
                  mode === "EXISTING"
                    ? "text-primary-500 border-b-2 border-primary-500 -mb-2.5 pb-2"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}>
                Existing Scheme ({schemes.length})
              </button>
              <button
                type="button"
                onClick={() => setMode("NEW")}
                className={`text-sm font-medium transition-colors ${
                  mode === "NEW"
                    ? "text-primary-500 border-b-2 border-primary-500 -mb-2.5 pb-2"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}>
                New Scheme (Search AMFI)
              </button>
            </div>

            {mode === "EXISTING" ? (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Scheme
                </label>
                <select
                  value={formData.scheme_id}
                  onChange={(e) =>
                    setFormData({ ...formData, scheme_id: e.target.value })
                  }
                  required
                  className="w-full bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 text-sm outline-none transition-all dark:text-white">
                  <option value="" disabled>
                    Select a scheme from your portfolio
                  </option>
                  {schemes.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      className="dark:bg-neutral-900">
                      {s.scheme_name} ({s.folio_number})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="relative">
                <Input
                  label="Search Mutual Fund Scheme"
                  placeholder="e.g. Parag Parikh Flexi Cap"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="dark:bg-white/5"
                />

                {selectedNewScheme && (
                  <div className="mt-2 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {selectedNewScheme.schemeName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Code: {selectedNewScheme.schemeCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNewScheme(null)}
                      className="text-xs text-red-500 hover:underline">
                      Change
                    </button>
                  </div>
                )}

                {searchResults.length > 0 && !selectedNewScheme && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.schemeCode}
                        type="button"
                        onClick={() => {
                          setSelectedNewScheme(r);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 border-b border-neutral-100 dark:border-white/5 last:border-0 text-sm text-neutral-700 dark:text-neutral-200">
                        {r.schemeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            type="date"
            label="Date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="dark:bg-white/5"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Units / Qty"
              step="0.0001"
              value={formData.units}
              onChange={(e) => {
                setFormData({ ...formData, units: e.target.value });
              }}
              onBlur={calculateTotal}
              placeholder="0.00"
              required
              className="dark:bg-white/5"
            />
            <Input
              type="number"
              label="Transaction NAV / Price"
              step="0.01"
              value={formData.nav}
              onChange={(e) => {
                setFormData({ ...formData, nav: e.target.value });
              }}
              onBlur={calculateTotal}
              placeholder="₹0.00"
              required
              className="dark:bg-white/5"
            />
          </div>

          <Input
            type="number"
            label="Total Amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="font-bold text-lg dark:bg-white/5"
            placeholder="₹0.00"
          />

          <Button
            type="submit"
            isLoading={loading}
            className="w-full py-4 text-base"
            variant="primary">
            <Check className="w-5 h-5 mr-2" />
            Add Mutual Fund Transaction
          </Button>
        </form>
      )}
    </Modal>
  );
}
