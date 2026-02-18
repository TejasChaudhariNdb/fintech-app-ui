"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { api } from "@/lib/api";
import { Check, TrendingUp, TrendingDown } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false);

  // Manual Form State
  const [schemes, setSchemes] = useState<any[]>([]);
  const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedNewScheme, setSelectedNewScheme] = useState<any>(null);

  const [formData, setFormData] = useState({
    scheme_id: "",
    type: "PURCHASE", // PURCHASE, REDEMPTION
    date: new Date().toISOString().split("T")[0],
    units: "",
    amount: "",
    nav: "",
  });

  // Load schemes for dropdown
  useEffect(() => {
    if (isOpen) {
      loadSchemes();
    }
  }, [isOpen]);

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
    } catch (err) {
      alert("Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <form onSubmit={handleManualSubmit} className="space-y-4">
        {/* Transaction Type Toggle */}
        <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "PURCHASE" })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              formData.type === "PURCHASE"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}>
            <TrendingUp size={16} />
            Buy
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "REDEMPTION" })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              formData.type === "REDEMPTION"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}>
            <TrendingDown size={16} />
            Sell
          </button>
        </div>

        {/* Scheme Selection */}
        <div>
          <div className="flex justify-between items-center mb-1.5 ml-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Select Asset
            </label>
            <button
              type="button"
              onClick={() => setMode(mode === "EXISTING" ? "NEW" : "EXISTING")}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              {mode === "EXISTING"
                ? "Search New Scheme"
                : "Select from My Assets"}
            </button>
          </div>

          {mode === "EXISTING" ? (
            <select
              value={formData.scheme_id}
              onChange={(e) =>
                setFormData({ ...formData, scheme_id: e.target.value })
              }
              required={mode === "EXISTING"}
              className="w-full px-4 py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none">
              <option value="">Select a scheme/stock</option>
              {schemes.map((s) => (
                <option key={s.scheme_id} value={s.scheme_id}>
                  {s.scheme}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <Input
                label=""
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search mutual fund name..."
                className="dark:bg-[#151A23]"
              />

              {selectedNewScheme && (
                <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300 line-clamp-1">
                    {selectedNewScheme.schemeName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNewScheme(null);
                      setSearchQuery("");
                    }}
                    className="text-xs text-primary-600 underline ml-2 shrink-0">
                    Change
                  </button>
                </div>
              )}

              {!selectedNewScheme && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl max-h-[200px] overflow-y-auto">
                  {searchResults.map((r: any) => (
                    <button
                      key={r.schemeCode}
                      type="button"
                      onClick={() => {
                        setSelectedNewScheme(r);
                        setSearchQuery("");
                        setSearchResults([]);
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
            label="NAV / Price"
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
          Save Transaction
        </Button>
      </form>
    </Modal>
  );
}
