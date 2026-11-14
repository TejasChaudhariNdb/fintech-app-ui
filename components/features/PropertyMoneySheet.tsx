"use client";

// Real estate feedback (2026-11-13, round 2): one simple sheet per task instead of the tabbed
// cash-flow modal. RENT = add rent (every month or one payment), EXPENSE = add a cost (once,
// monthly or yearly), HISTORY = everything logged, with delete. EMIs come from the loan schedule.
// 2026-11-14: own heads (sub-category) under each type like gold categories, a note on every entry,
// electricity / gas / brokerage types, and a "counts for capital gains" flag on improvements.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Building,
  Car,
  Copy,
  CreditCard,
  Flame,
  Handshake,
  Landmark,
  ListTree,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Shield,
  Sparkles,
  Trash2,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

export type MoneySheetMode = "RENT" | "EXPENSE" | "HISTORY";

/** An existing entry to open the form with: `edit` saves over it, otherwise it is a duplicate to add. */
export interface MoneySheetStart {
  edit: boolean;
  tx: {
    id: number;
    transaction_type: string;
    category: "INFLOW" | "OUTFLOW";
    amount: number;
    transaction_date: string;
    description?: string | null;
    sub_category?: string | null;
    adds_to_tax_cost?: boolean;
  };
}

export interface MoneySheetProperty {
  id: number;
  property_name: string;
  purchase_date: string;
  monthly_rental_income?: number;
  is_rented?: boolean;
  has_loan?: boolean;
}

type Icon = React.ComponentType<{ size?: number; className?: string }>;

const INCOME_KINDS: { id: string; label: string; icon: Icon }[] = [
  { id: "RENT_INCOME", label: "Rent", icon: Key },
  { id: "SHORT_STAY_AIRBNB", label: "Airbnb / short stay", icon: Sparkles },
  { id: "PARKING_AMENITY_INCOME", label: "Parking", icon: Car },
  { id: "DEPOSIT_DEDUCTION_RECOVERY", label: "Deposit kept", icon: Landmark },
  { id: "OTHER_INCOME", label: "Miscellaneous", icon: MoreHorizontal },
];

const EXPENSE_KINDS: { id: string; label: string; icon: Icon; usual: Repeat }[] = [
  { id: "MAINTENANCE", label: "Society maintenance", icon: Building, usual: "MONTHLY" },
  { id: "PROPERTY_TAX", label: "Property tax", icon: Receipt, usual: "YEARLY" },
  { id: "ELECTRICITY_BILL", label: "Electricity", icon: Zap, usual: "MONTHLY" },
  { id: "GAS_BILL", label: "Piped gas", icon: Flame, usual: "MONTHLY" },
  { id: "REPAIRS_RENOVATION", label: "Repairs / renovation", icon: Wrench, usual: "ONCE" },
  { id: "INSURANCE", label: "Insurance", icon: Shield, usual: "YEARLY" },
  { id: "BROKERAGE_COMMISSION", label: "Brokerage", icon: Handshake, usual: "ONCE" },
  { id: "UTILITIES_BILLS", label: "Water / Wi-Fi bills", icon: Wifi, usual: "MONTHLY" },
  { id: "OTHER_EXPENSE", label: "Miscellaneous", icon: MoreHorizontal, usual: "ONCE" },
];

// Ready-made heads per type; the owner can type their own (kept for next time, like gold categories).
const SUGGESTED_SUBS: Record<string, string[]> = {
  OTHER_EXPENSE: ["Staff salary", "Cleaning", "Supplies", "Laundry", "Wi-Fi", "Legal fees", "Pest control"],
  OTHER_INCOME: ["Late fee", "Interest on deposit", "Event booking", "Hoarding / signage"],
  SHORT_STAY_AIRBNB: ["Airbnb", "Booking.com", "MakeMyTrip", "Direct booking"],
  REPAIRS_RENOVATION: ["Painting", "Plumbing", "Electrical", "Bathroom", "Kitchen", "Waterproofing"],
  ELECTRICITY_BILL: ["Fixed / meter charge", "Usage"],
  GAS_BILL: ["Minimum charge", "Usage"],
  UTILITIES_BILLS: ["Water", "Wi-Fi", "DTH"],
  BROKERAGE_COMMISSION: ["On purchase", "Tenant search", "On sale"],
};

// Lump-sum loan prepayment: offered only when the property has a loan on record.
const PREPAYMENT_KIND = { id: "LOAN_REPAYMENT", label: "Loan prepayment", icon: CreditCard, usual: "ONCE" as Repeat };

// Entries the owner may count as cost of improvement / purchase cost for capital gains (backend TAX_COST_TYPES).
const TAX_COST_KINDS = new Set(["REPAIRS_RENOVATION", "BROKERAGE_COMMISSION", "OTHER_EXPENSE"]);

const KIND_HINTS: Record<string, string> = {
  ELECTRICITY_BILL:
    "Flat empty? You still pay the fixed / meter charge: add it every month. If a tenant pays the bill, don't add it.",
  GAS_BILL:
    "Flat empty? The gas company still bills a minimum charge: add it every month. If a tenant pays the bill, don't add it.",
  OTHER_EXPENSE: "Pick or type what it was for, so each head shows up separately in the cash flow.",
  OTHER_INCOME: "Pick or type what it was for, so each head shows up separately in the cash flow.",
  LOAN_REPAYMENT:
    "A lump sum paid to the bank on top of EMIs. It counts in your return once you enter today's loan outstanding (from the bank statement) under EMI / Loan.",
};

const NOTE_PLACEHOLDER: Record<string, string> = {
  REPAIRS_RENOVATION: "e.g. Painting, bathroom refurbish",
  BROKERAGE_COMMISSION: "e.g. Paid to broker when buying",
  OTHER_EXPENSE: "e.g. Cook's salary for March",
};

const LABELS: Record<string, string> = {
  ...Object.fromEntries(INCOME_KINDS.map((k) => [k.id, k.label])),
  ...Object.fromEntries(EXPENSE_KINDS.map((k) => [k.id, k.label])),
  HOME_LOAN_EMI: "Loan EMI",
  LOAN_REPAYMENT: "Loan prepayment",
  HOME_LOAN_INTEREST: "Pre-EMI interest",
  BROKERAGE_COMMISSION: "Brokerage",
  FURNISHING_APPLIANCES: "Furnishing",
  DEPOSIT_DEDUCTION_RECOVERY: "Deposit kept",
  PROPERTY_SALE_PROCEEDS: "Sale proceeds",
};

type Repeat = "ONCE" | "MONTHLY" | "YEARLY";

interface Tx {
  id: number;
  transaction_type: string;
  type_label: string;
  category: "INFLOW" | "OUTFLOW";
  amount: number;
  transaction_date: string;
  description?: string | null;
  sub_category?: string | null;
  adds_to_tax_cost?: boolean;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = y * 12 + (m - 1) + months;
  const ny = Math.floor(t / 12);
  const nm = (t % 12) + 1;
  const last = new Date(ny, nm, 0).getDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

const monthLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/** Same date rule as the backend recurring generator: day clamped to 28, every N months. */
function countRepeats(from: string, till: string, everyMonths: number): number {
  if (!from || !till || from > till) return 0;
  const [fy, fm, fd] = from.split("-").map(Number);
  const day = Math.max(1, Math.min(28, fd));
  let n = 0;
  let y = fy;
  let m = fm;
  for (let i = 0; i < 400; i++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso > till) break;
    if (iso >= from) n++;
    const t = y * 12 + (m - 1) + everyMonths;
    y = Math.floor(t / 12);
    m = (t % 12) + 1;
    if (n >= 360) break;
  }
  return n;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex p-1 rounded-xl bg-neutral-100 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            value === o.id ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm";

/** Chips for common heads plus a free-text box (typed heads are saved and offered next time). */
function SubPicker({ value, onChange, options, listId }: { value: string; onChange: (v: string) => void; options: string[]; listId: string }) {
  return (
    <div className="space-y-1.5">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.slice(0, 10).map((o) => {
            const on = value.trim().toLowerCase() === o.toLowerCase();
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(on ? "" : o)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  on ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={40}
        list={listId}
        placeholder="Or type your own, e.g. Gardener"
        className={inputCls}
        aria-label="Head"
      />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </div>
  );
}

function TaxCostToggle({ checked, onChange, kind }: { checked: boolean; onChange: (v: boolean) => void; kind: string }) {
  return (
    <label className="flex items-start gap-2 rounded-xl border border-neutral-200 dark:border-white/10 px-3 py-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-indigo-600" />
      <span className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-snug">
        <b className="text-neutral-900 dark:text-white">Count in capital gains cost</b>
        <br />
        {kind === "BROKERAGE_COMMISSION"
          ? "Tick for brokerage paid when buying. Brokerage for finding a tenant does not count."
          : "Tick for improvements that add to the property (renovation, extension, new kitchen, keep the bills). Routine repairs and painting do not count."}{" "}
        Ticked costs are indexed from the year you paid them.
      </span>
    </label>
  );
}

export default function PropertyMoneySheet({
  isOpen,
  mode: initialMode,
  property,
  onClose,
  onSaved,
  onOpenLoan,
  start = null,
}: {
  isOpen: boolean;
  mode: MoneySheetMode;
  property: MoneySheetProperty | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onOpenLoan: () => void;
  start?: MoneySheetStart | null;
}) {
  const [mode, setMode] = useState<MoneySheetMode>(initialMode);
  const [kind, setKind] = useState("RENT_INCOME");
  const [repeat, setRepeat] = useState<Repeat>("MONTHLY");
  const [amount, setAmount] = useState("");
  const [onDate, setOnDate] = useState(todayIso());
  const [from, setFrom] = useState("");
  const [till, setTill] = useState(todayIso());
  const [sub, setSub] = useState("");
  const [note, setNote] = useState("");
  const [taxCost, setTaxCost] = useState(false);
  const [usedSubs, setUsedSubs] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Stay on the form after adding (feedback 2026-11-14: owners enter many past bills in a row).
  const [flash, setFlash] = useState("");
  const [justAdded, setJustAdded] = useState<Set<number>>(new Set());
  const amountRef = React.useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [filter, setFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [editId, setEditId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTax, setEditTax] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  // Select mode: change the amount of, or delete, many entries at once.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async (action: "SET_AMOUNT" | "DELETE") => {
    if (!property || selected.size === 0) return;
    const ids = Array.from(selected);
    const amt = parseFloat(bulkAmount);
    if (action === "SET_AMOUNT" && !(amt > 0)) return;
    if (action === "DELETE" && !confirm(`Delete ${ids.length} entries? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await api.bulkPropertyTransactions(property.id, action === "DELETE" ? { ids, action } : { ids, action, amount: amt });
      setTxs((list) =>
        list
          ? action === "DELETE"
            ? list.filter((t) => !selected.has(t.id))
            : list.map((t) => (selected.has(t.id) ? { ...t, amount: amt } : t))
          : list
      );
      onSaved(action === "DELETE" ? `${ids.length} entries deleted` : `${ids.length} entries changed to ${inr(amt)}`);
      setSelected(new Set());
      setSelecting(false);
      setBulkAmount("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Could not update the entries.");
    } finally {
      setBulkBusy(false);
    }
  };

  const startForm = useCallback(
    (m: MoneySheetMode) => {
      setMode(m);
      setError("");
      setOnDate(todayIso());
      setTill(todayIso());
      setSub("");
      setNote("");
      setTaxCost(false);
      setFlash("");
      setEditingId(null);
      if (m === "RENT") {
        setKind("RENT_INCOME");
        setRepeat("MONTHLY");
        setAmount(property?.monthly_rental_income ? String(property.monthly_rental_income) : "");
        setFrom(property?.purchase_date ?? "");
      } else if (m === "EXPENSE") {
        setKind("MAINTENANCE");
        setRepeat("MONTHLY");
        setAmount("");
        setFrom(property?.purchase_date ?? "");
      }
    },
    [property?.monthly_rental_income, property?.purchase_date]
  );

  const loadHistory = useCallback(async () => {
    if (!property) return;
    try {
      const res = await api.getPropertyTransactions(property.id);
      setTxs(res?.transactions ?? []);
      setUsedSubs(res?.sub_categories ?? {});
    } catch {
      setTxs([]);
    }
  }, [property]);

  useEffect(() => {
    if (isOpen && property) {
      if (start) {
        // Duplicate or edit: same form, filled from the entry.
        const t = start.tx;
        startForm(t.category === "INFLOW" ? "RENT" : "EXPENSE");
        setKind(t.transaction_type);
        setRepeat("ONCE");
        setAmount(String(t.amount));
        setOnDate(t.transaction_date.slice(0, 10));
        setSub(t.sub_category ?? "");
        const d = (t.description ?? "").trim();
        setNote(d && d !== (LABELS[t.transaction_type] ?? "") && !/ - [A-Z][a-z]{2} \d{4}$/.test(d) ? d : "");
        setTaxCost(!!t.adds_to_tax_cost);
        setEditingId(start.edit ? t.id : null);
      } else {
        startForm(initialMode);
      }
      setTxs(null);
      setFilter("ALL");
      loadHistory();
    }
  }, [isOpen, property?.id, initialMode, start]); // eslint-disable-line react-hooks/exhaustive-deps

  // Latest entry already logged for this kind: repeating entries start after it, so nothing is added twice.
  const lastOfKind = useMemo(() => {
    const dates = (txs ?? []).filter((t) => t.transaction_type === kind).map((t) => t.transaction_date.slice(0, 10));
    return dates.length ? dates.sort()[dates.length - 1] : null;
  }, [txs, kind]);

  useEffect(() => {
    if (mode === "HISTORY" || !txs) return;
    if (lastOfKind) setFrom(addMonthsIso(lastOfKind, repeat === "YEARLY" ? 12 : 1));
    else setFrom(property?.purchase_date ?? "");
  }, [lastOfKind, txs, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const everyMonths = repeat === "YEARLY" ? 12 : 1;
  const count = repeat === "ONCE" ? 1 : countRepeats(from, till, everyMonths);
  const amt = parseFloat(amount) || 0;

  const pickExpense = (id: string) => {
    setKind(id);
    setSub("");
    setTaxCost(false);
    const usual = [...EXPENSE_KINDS, PREPAYMENT_KIND].find((k) => k.id === id)?.usual;
    if (usual) setRepeat(usual);
  };

  const pickIncome = (id: string) => {
    setKind(id);
    setSub("");
  };

  // Auto notes ("Rent - Jan 2025", or just the type name) add nothing; show only what the owner wrote.
  const shownNote = (t: Tx) => {
    const d = (t.description ?? "").trim();
    if (!d) return "";
    const label = LABELS[t.transaction_type] ?? t.type_label;
    if (d === label || d === t.type_label) return "";
    if (/ - [A-Z][a-z]{2} \d{4}$/.test(d) && (d.startsWith(label) || d.startsWith(t.type_label))) return "";
    return d;
  };

  const subOptions = (k: string) => {
    const seen = new Set<string>();
    return [...(usedSubs[k] ?? []), ...(SUGGESTED_SUBS[k] ?? [])].filter((x) => {
      const key = x.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const save = async () => {
    if (!property) return;
    setError("");
    if (!(amt > 0)) {
      setError("Enter an amount.");
      return;
    }
    if (repeat !== "ONCE" && count === 0) {
      setError("Pick a start date on or before the end date.");
      return;
    }
    const label = LABELS[kind] ?? "Entry";
    setSaving(true);
    try {
      if (editingId != null) {
        await api.updatePropertyTransaction(property.id, editingId, {
          transaction_type: kind,
          amount: amt,
          transaction_date: onDate,
          description: note.trim() || label,
          sub_category: sub.trim(),
          ...(TAX_COST_KINDS.has(kind) ? { adds_to_tax_cost: taxCost } : {}),
        });
        onSaved(`${label} updated`);
        onClose();
        return;
      }
      if (repeat === "ONCE") {
        const res = await api.addPropertyTransaction(property.id, {
          transaction_type: kind,
          amount: amt,
          transaction_date: onDate,
          description: note.trim() || label,
          sub_category: sub.trim() || undefined,
          adds_to_tax_cost: TAX_COST_KINDS.has(kind) ? taxCost : undefined,
        });
        const msg = `${label} of ${inr(amt)} added for ${new Date(onDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
        onSaved(msg);
        setFlash(msg);
        const newId = res?.transaction?.id;
        setJustAdded((prev) => (newId ? new Set(prev).add(newId) : prev));
      } else {
        await api.generateRecurringPropertyTransactions(property.id, {
          transaction_type: kind,
          monthly_amount: amt,
          start_date: from,
          end_date: till,
          day_of_month: Math.min(28, Number(from.split("-")[2]) || 1),
          every_months: everyMonths,
          notes_prefix: note.trim() || label,
          sub_category: sub.trim() || undefined,
          adds_to_tax_cost: TAX_COST_KINDS.has(kind) ? taxCost : undefined,
        });
        const msg = `${count} ${label.toLowerCase()} entries added (${inr(amt * count)})`;
        onSaved(msg);
        setFlash(msg);
      }
      // Ready for the next one (feedback 2026-11-14): everything stays filled, so the same entry can be
      // added again in one tap; the amount is selected to type over it.
      amountRef.current?.focus();
      amountRef.current?.select();
      await loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!property || !confirm("Delete this entry?")) return;
    try {
      await api.deletePropertyTransaction(property.id, id);
      setTxs((list) => (list ? list.filter((t) => t.id !== id) : list));
      onSaved("Entry deleted");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Could not delete the entry.");
    }
  };

  const startEdit = (t: Tx) => {
    setEditId(t.id);
    setEditAmount(String(t.amount));
    setEditDate(t.transaction_date.slice(0, 10));
    setEditSub(t.sub_category ?? "");
    setEditNote(t.description ?? "");
    setEditTax(!!t.adds_to_tax_cost);
  };

  const saveEdit = async (t: Tx) => {
    if (!property) return;
    const amtNew = parseFloat(editAmount);
    if (!(amtNew > 0) || !editDate) return;
    setEditBusy(true);
    try {
      const changes = {
        amount: amtNew,
        transaction_date: editDate,
        sub_category: editSub.trim(),
        description: editNote.trim(),
        ...(TAX_COST_KINDS.has(t.transaction_type) ? { adds_to_tax_cost: editTax } : {}),
      };
      const res = await api.updatePropertyTransaction(property.id, t.id, changes);
      const saved: Tx = res?.transaction ?? { ...t, ...changes };
      setTxs((list) => (list ? list.map((x) => (x.id === t.id ? { ...x, ...saved } : x)) : list));
      setEditId(null);
      onSaved("Entry updated");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Could not update the entry.");
    } finally {
      setEditBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const list = (txs ?? []).filter((t) => filter === "ALL" || t.category === filter);
    const groups: { key: string; label: string; items: Tx[] }[] = [];
    for (const t of list) {
      const d = new Date(t.transaction_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), items: [] };
        groups.push(g);
      }
      g.items.push(t);
    }
    return groups;
  }, [txs, filter]);

  if (!property) return null;

  const totalIn = (txs ?? []).filter((t) => t.category === "INFLOW").reduce((s, t) => s + t.amount, 0);
  const totalOut = (txs ?? []).filter((t) => t.category === "OUTFLOW").reduce((s, t) => s + t.amount, 0);

  const title = editingId != null
    ? `Edit entry · ${property.property_name}`
    : mode === "RENT" ? `Add income · ${property.property_name}` : mode === "EXPENSE" ? `Add expense · ${property.property_name}` : `All entries · ${property.property_name}`;

  const isRent = mode === "RENT";
  const kinds = isRent ? INCOME_KINDS : property.has_loan ? [...EXPENSE_KINDS, PREPAYMENT_KIND] : EXPENSE_KINDS;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {mode === "HISTORY" ? (
        <div className="space-y-3">
          <Link
            href={`/holdings/real-estate/${property.id}/cash-flow`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300"
          >
            <ListTree size={14} /> Full cash flow (EMIs, rent, every cost) ›
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => startForm("RENT")} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2.5 text-xs font-bold">
              <Plus size={14} /> Add rent
            </button>
            <button type="button" onClick={() => startForm("EXPENSE")} className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 text-white py-2.5 text-xs font-bold">
              <Plus size={14} /> Add expense
            </button>
          </div>

          {txs === null ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>
          ) : txs.length === 0 ? (
            <p className="text-center text-xs text-neutral-500 py-8">Nothing logged yet. Add rent or an expense above.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-emerald-500/5 p-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Money in</div>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400"><PrivacyMask>+{inr(totalIn)}</PrivacyMask></div>
                </div>
                <div className="rounded-xl bg-rose-500/5 p-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Money out</div>
                  <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400"><PrivacyMask>-{inr(totalOut)}</PrivacyMask></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Segmented
                    value={filter}
                    onChange={(f) => { setFilter(f); setSelected(new Set()); }}
                    options={[{ id: "ALL", label: `All (${txs.length})` }, { id: "INFLOW", label: "Income" }, { id: "OUTFLOW", label: "Expenses" }]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setSelecting((v) => !v); setSelected(new Set()); setEditId(null); }}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${
                    selecting ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {selecting ? "Done" : "Select"}
                </button>
              </div>
              {selecting && (
                <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                  <span>{selected.size} selected · tap entries to pick</span>
                  <button
                    type="button"
                    className="font-semibold text-indigo-600 dark:text-indigo-400"
                    onClick={() => {
                      const visible = grouped.flatMap((g) => g.items.map((t) => t.id));
                      setSelected(selected.size === visible.length ? new Set() : new Set(visible));
                    }}
                  >
                    {selected.size > 0 && selected.size === grouped.flatMap((g) => g.items).length ? "Clear" : "Select all"}
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {grouped.map((g) => (
                  <div key={g.key}>
                    <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1">{g.label}</div>
                    <div className="rounded-xl border border-neutral-200 dark:border-white/10 divide-y divide-neutral-100 dark:divide-white/5">
                      {g.items.map((t) => editId === t.id ? (
                        <div key={t.id} className="px-3 py-2 space-y-2 bg-indigo-500/5">
                          <div className="text-xs font-semibold text-neutral-900 dark:text-white">Edit {LABELS[t.transaction_type] ?? t.type_label}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" inputMode="numeric" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={inputCls} aria-label="Amount" />
                            <DatePicker value={editDate} onChange={setEditDate} className={inputCls} />
                          </div>
                          <SubPicker value={editSub} onChange={setEditSub} options={subOptions(t.transaction_type)} listId={`subs-edit-${t.id}`} />
                          <input value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={300} placeholder="Note (optional)" className={inputCls} aria-label="Note" />
                          {TAX_COST_KINDS.has(t.transaction_type) && <TaxCostToggle checked={editTax} onChange={setEditTax} kind={t.transaction_type} />}
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs text-neutral-500">Cancel</button>
                            <button type="button" disabled={editBusy} onClick={() => saveEdit(t)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-60">
                              {editBusy ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={t.id}
                          onClick={selecting ? () => toggle(t.id) : undefined}
                          className={`flex items-center gap-1 px-3 py-2 ${selecting ? "cursor-pointer" : ""} ${selected.has(t.id) ? "bg-indigo-500/10" : ""}`}
                        >
                          {selecting && (
                            <input
                              type="checkbox"
                              checked={selected.has(t.id)}
                              onChange={() => toggle(t.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-2 accent-indigo-600"
                              aria-label="Select entry"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                              {LABELS[t.transaction_type] ?? t.type_label}
                              {t.sub_category && <span className="font-normal text-neutral-500"> · {t.sub_category}</span>}
                              {t.adds_to_tax_cost && (
                                <span className="ml-1.5 rounded bg-indigo-500/10 px-1 py-px text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Tax cost</span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">
                              {new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {shownNote(t) && <> · {shownNote(t)}</>}
                            </div>
                          </div>
                          <div className={`text-xs font-bold font-mono ${t.category === "INFLOW" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            <PrivacyMask>{t.category === "INFLOW" ? "+" : "-"}{inr(t.amount)}</PrivacyMask>
                          </div>
                          {!selecting && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  startForm(t.category === "INFLOW" ? "RENT" : "EXPENSE");
                                  setKind(t.transaction_type);
                                  setRepeat("ONCE");
                                  setAmount(String(t.amount));
                                  setOnDate(t.transaction_date.slice(0, 10));
                                  setSub(t.sub_category ?? "");
                                  setNote(shownNote(t));
                                  setTaxCost(!!t.adds_to_tax_cost);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600"
                                aria-label="Duplicate entry"
                                title="Duplicate"
                              >
                                <Copy size={13} />
                              </button>
                              <button type="button" onClick={() => startEdit(t)} className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600" aria-label="Edit entry">
                                <Pencil size={13} />
                              </button>
                              <button type="button" onClick={() => remove(t.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600" aria-label="Delete entry">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selecting && selected.size > 0 && (
                <div className="sticky bottom-0 -mx-1 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-surface p-2.5 shadow-lg space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">{selected.size} entries selected</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(e.target.value)}
                      placeholder="New amount (₹)"
                      className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={bulkBusy || !(parseFloat(bulkAmount) > 0)}
                      onClick={() => runBulk("SET_AMOUNT")}
                      className="rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Set amount
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => runBulk("DELETE")}
                      className="rounded-lg border border-rose-500/40 px-3 text-xs font-semibold text-rose-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
              {txs.some((t) => t.transaction_type === "HOME_LOAN_EMI") && property.has_loan && (
                <p className="text-[10px] text-neutral-400">
                  EMIs logged here by hand are not counted (the loan schedule has every EMI). To fix a missed or different EMI,
                  open <button type="button" onClick={onOpenLoan} className="font-semibold text-indigo-600 dark:text-indigo-400 underline">EMI / Loan → EMI schedule</button>.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. What */}
          <Field label={isRent ? "What kind of income?" : "What did you pay for?"}>
            <div className="grid gap-2 grid-cols-3">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => (isRent ? pickIncome(k.id) : pickExpense(k.id))}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold text-center leading-tight ${
                    kind === k.id
                      ? isRent
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  <k.icon size={16} />
                  {k.label}
                </button>
              ))}
            </div>
          </Field>

          {KIND_HINTS[kind] && (
            <p className="-mt-2 rounded-xl bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">{KIND_HINTS[kind]}</p>
          )}

          <Field label={kind === "OTHER_EXPENSE" || kind === "OTHER_INCOME" ? "Which head?" : "Head (optional)"}>
            <SubPicker value={sub} onChange={setSub} options={subOptions(kind)} listId="subs-new" />
          </Field>

          {/* 2. How much */}
          <Field label={repeat === "ONCE" ? "Amount (₹)" : repeat === "YEARLY" ? "Amount each year (₹)" : "Amount each month (₹)"}>
            <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" className={inputCls} autoFocus ref={amountRef} />
          </Field>

          {/* 3. How often (an edit is always one entry) */}
          {editingId == null && (
          <Field label="How often?">
            <Segmented<Repeat>
              value={repeat}
              onChange={setRepeat}
              options={
                isRent
                  ? [{ id: "MONTHLY", label: "Every month" }, { id: "ONCE", label: "One payment" }]
                  : [{ id: "ONCE", label: "Once" }, { id: "MONTHLY", label: "Every month" }, { id: "YEARLY", label: "Every year" }]
              }
            />
          </Field>
          )}

          {/* 4. When */}
          {repeat === "ONCE" ? (
            <Field label="Date">
              <DatePicker value={onDate} onChange={setOnDate} className={inputCls} />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <DatePicker value={from} onChange={setFrom} className={inputCls} />
              </Field>
              <Field label="Till">
                <DatePicker value={till} onChange={setTill} className={inputCls} />
              </Field>
            </div>
          )}

          {repeat !== "ONCE" && lastOfKind && from <= lastOfKind && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
              You already added {LABELS[kind]?.toLowerCase() ?? "entries"} till {monthLabel(lastOfKind)}. Starting before that will add
              those months again.{" "}
              <button type="button" className="font-bold underline" onClick={() => setFrom(addMonthsIso(lastOfKind, everyMonths))}>
                Start after {monthLabel(lastOfKind)}
              </button>
            </p>
          )}
          {repeat !== "ONCE" && lastOfKind && from > lastOfKind && count > 0 && (
            <p className="text-[11px] text-neutral-500">Already added till {monthLabel(lastOfKind)}, so this starts after it.</p>
          )}
          {repeat !== "ONCE" && lastOfKind && count === 0 && from > lastOfKind && (
            <p className="text-[11px] text-neutral-500">Already up to date till {monthLabel(lastOfKind)}. Nothing new to add for these dates.</p>
          )}

          {repeat !== "ONCE" && amt > 0 && count > 0 && (
            <p className="rounded-xl bg-neutral-50 dark:bg-white/5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300">
              We&apos;ll add <b>{count}</b> {repeat === "YEARLY" ? "yearly" : "monthly"} entries of {inr(amt)} ={" "}
              <b><PrivacyMask>{inr(amt * count)}</PrivacyMask></b>
            </p>
          )}

          <Field label="Note (optional)" hint="Shown against this entry in the cash flow.">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={NOTE_PLACEHOLDER[kind] ?? "e.g. Paid by cheque"} className={inputCls} />
          </Field>

          {TAX_COST_KINDS.has(kind) && <TaxCostToggle checked={taxCost} onChange={setTaxCost} kind={kind} />}

          {!isRent && (
            <button type="button" onClick={onOpenLoan} className="w-full flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-left text-[11px] text-neutral-600 dark:text-neutral-300">
              <CreditCard size={14} className="text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Paying a home loan EMI? Don&apos;t add it here. <b className="text-indigo-600 dark:text-indigo-400">{property.has_loan ? "Your loan" : "Add your loan"}</b> and
                every EMI is counted automatically.
              </span>
            </button>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 ${isRent ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
          >
            {saving
              ? "Saving…"
              : editingId != null
                ? "Save changes"
                : repeat === "ONCE" || count <= 1 || !(amt > 0)
                  ? isRent ? "Add income" : "Add expense"
                  : `Add ${count} entries`}
          </button>

          {flash && (
            <p role="status" className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ✓ {flash}. Add the next one, or close when done.
            </p>
          )}

          {txs && txs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Latest entries</span>
                <button type="button" onClick={() => { setMode("HISTORY"); loadHistory(); }} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  See all {txs.length} ›
                </button>
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-white/10 divide-y divide-neutral-100 dark:divide-white/5">
                {[...txs]
                  .sort((a, b) => (b.transaction_date.localeCompare(a.transaction_date) || b.id - a.id))
                  .slice(0, 8)
                  .map((t) => (
                    <div key={t.id} className={`flex items-center gap-2 px-3 py-1.5 ${justAdded.has(t.id) ? "bg-emerald-500/10" : ""}`}>
                      <span className="w-[68px] shrink-0 text-[10px] text-neutral-400">
                        {new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-700 dark:text-neutral-300">
                        {LABELS[t.transaction_type] ?? t.type_label}
                        {t.sub_category && <span className="text-neutral-400"> · {t.sub_category}</span>}
                        {shownNote(t) && <span className="text-neutral-400"> · {shownNote(t)}</span>}
                      </span>
                      <span className={`text-[11px] font-bold font-mono ${t.category === "INFLOW" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        <PrivacyMask>{t.category === "INFLOW" ? "+" : "-"}{inr(t.amount)}</PrivacyMask>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
