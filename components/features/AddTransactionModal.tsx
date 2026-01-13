"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { api } from "@/lib/api";
import { Check, Info, TrendingUp, TrendingDown } from "lucide-react";

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
  const [schemes, setSchemes] = useState<any[]>([]);
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
    } catch (err) {
      console.error("Failed to load schemes", err);
    }
  };

  const calculateTotal = () => {
    const units = parseFloat(formData.units) || 0;
    const nav = parseFloat(formData.nav) || 0;
    if (units && nav) {
      setFormData((prev) => ({ ...prev, amount: (units * nav).toFixed(2) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.addManualTransaction({
        scheme_id: parseInt(formData.scheme_id),
        date: formData.date,
        type: formData.type,
        units: parseFloat(formData.units),
        amount: parseFloat(formData.amount),
        nav: parseFloat(formData.nav),
      });
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300 ml-1">
            Select Asset
          </label>
          <select
            value={formData.scheme_id}
            onChange={(e) =>
              setFormData({ ...formData, scheme_id: e.target.value })
            }
            required
            className="w-full px-4 py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none">
            <option value="">Select a scheme/stock</option>
            {schemes.map((s) => (
              <option key={s.scheme_id} value={s.scheme_id}>
                {s.scheme}
              </option>
            ))}
          </select>
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

        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex gap-3 items-start">
          <Info className="flex-shrink-0 w-5 h-5 text-blue-500 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            This transaction will be added manually tagged as "User Entry". It
            will be reconciled automatically when you upload your next official
            CAS statement.
          </p>
        </div>

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
