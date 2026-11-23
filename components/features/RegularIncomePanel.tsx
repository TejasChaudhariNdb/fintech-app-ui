"use client";

// BUG-095: pension / salary / annuity entries. Their payments appear in the interest schedule like deposit payouts.
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Wallet } from "lucide-react";
import { api, RegularIncome, RegularIncomePayload } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import DatePicker from "@/components/ui/DatePicker";
import PrivacyMask from "@/components/ui/PrivacyMask";

const TYPES: { id: RegularIncomePayload["income_type"]; label: string }[] = [
  { id: "PENSION", label: "Pension" },
  { id: "SALARY", label: "Salary" },
  { id: "ANNUITY", label: "Annuity" },
  { id: "OTHER", label: "Other" },
];
const FREQS: { id: RegularIncomePayload["frequency"]; label: string }[] = [
  { id: "MONTHLY", label: "Monthly" },
  { id: "QUARTERLY", label: "Quarterly" },
  { id: "HALF_YEARLY", label: "Half-yearly" },
  { id: "ANNUALLY", label: "Yearly" },
];

const inputCls =
  "w-full bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white outline-none focus:border-emerald-500";

const emptyForm = () => ({
  name: "",
  income_type: "PENSION" as RegularIncomePayload["income_type"],
  amount: "",
  frequency: "MONTHLY" as RegularIncomePayload["frequency"],
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  is_taxable: true,
  bank_account: "",
});

export default function RegularIncomePanel({ onChanged }: { onChanged: () => void }) {
  const { activeProfileId } = useProfile();
  const [items, setItems] = useState<RegularIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setItems(await api.getRegularIncome());
    } catch (err) {
      console.error("Failed to load regular income:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeProfileId]);

  const openForm = (inc?: RegularIncome) => {
    setError("");
    setEditingId(inc?.id ?? null);
    setForm(
      inc
        ? {
            name: inc.name,
            income_type: inc.income_type,
            amount: String(inc.amount),
            frequency: inc.frequency,
            start_date: inc.start_date,
            end_date: inc.end_date || "",
            is_taxable: inc.is_taxable,
            bank_account: inc.bank_account || "",
          }
        : emptyForm()
    );
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || !(amount > 0)) {
      setError("Enter a name and an amount above 0.");
      return;
    }
    if (form.end_date && form.end_date < form.start_date) {
      setError("End date is before the first payment date.");
      return;
    }
    const existing = items.find((i) => i.id === editingId);
    const profileId = existing?.profile_id ?? (activeProfileId && activeProfileId !== "all" ? Number(activeProfileId) : null);
    try {
      setSaving(true);
      setError("");
      await api.saveRegularIncome(
        {
          name: form.name.trim(),
          income_type: form.income_type,
          amount,
          frequency: form.frequency,
          start_date: form.start_date,
          end_date: form.end_date || null,
          is_taxable: form.is_taxable,
          bank_account: form.bank_account.trim() || null,
          profile_id: profileId,
        },
        editingId ?? undefined
      );
      setFormOpen(false);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inc: RegularIncome) => {
    if (!window.confirm(`Delete "${inc.name}" and its received / TDS records?`)) return;
    try {
      await api.deleteRegularIncome(inc.id);
      await load();
      onChanged();
    } catch (err) {
      console.error("Failed to delete regular income:", err);
    }
  };

  const freqLabel = (f: string) => FREQS.find((x) => x.id === f)?.label || f;

  return (
    <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Pension, salary &amp; other regular income</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Shown in the schedule below. Not counted in net worth. SGB interest is added from your SGBs under Gold.
            </p>
          </div>
        </div>
        {!formOpen && (
          <button
            onClick={() => openForm()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        )}
      </div>

      {loading ? (
        <Loader2 size={16} className="animate-spin text-neutral-400" />
      ) : (
        items.length > 0 && (
          <ul className="divide-y divide-neutral-100 dark:divide-white/5">
            {items.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{inc.name}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {TYPES.find((t) => t.id === inc.income_type)?.label} · {freqLabel(inc.frequency)} · {inc.owner}
                    {inc.end_date ? ` · until ${inc.end_date}` : ""}
                    {inc.is_taxable ? "" : " · Tax-free"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums mr-1">
                    <PrivacyMask>₹{Math.round(inc.amount).toLocaleString("en-IN")}</PrivacyMask>
                  </span>
                  <button onClick={() => openForm(inc)} aria-label={`Edit ${inc.name}`} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(inc)} aria-label={`Delete ${inc.name}`} className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {formOpen && (
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-white/5">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 space-y-1 sm:col-span-2">
            <span>Name</span>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SBI pension, Infosys salary" />
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 space-y-1">
            <span>Type</span>
            <select className={inputCls} value={form.income_type} onChange={(e) => setForm({ ...form, income_type: e.target.value as RegularIncomePayload["income_type"] })}>
              {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 space-y-1">
            <span>Paid</span>
            <select className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as RegularIncomePayload["frequency"] })}>
              {FREQS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 space-y-1">
            <span>Amount per payment (₹)</span>
            <input className={inputCls} type="number" inputMode="decimal" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 space-y-1">
            <span>Bank account (optional)</span>
            <input className={inputCls} value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} placeholder="e.g. SBI 1234" />
          </label>
          <div className="space-y-1">
            <DatePicker label="First payment date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
          </div>
          <div className="space-y-1">
            <DatePicker label="Last payment date (blank = ongoing)" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 sm:col-span-2">
            <input type="checkbox" checked={form.is_taxable} onChange={(e) => setForm({ ...form, is_taxable: e.target.checked })} className="w-4 h-4 rounded text-emerald-600" />
            <span>Taxable</span>
          </label>
          {error && <p className="text-xs text-rose-600 sm:col-span-2" role="alert">{error}</p>}
          <div className="flex gap-2 justify-end sm:col-span-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">
              {saving && <Loader2 size={12} className="animate-spin" />}
              <span>{editingId ? "Save" : "Add income"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
