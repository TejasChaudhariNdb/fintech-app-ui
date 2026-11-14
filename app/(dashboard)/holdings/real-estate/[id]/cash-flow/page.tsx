"use client";

// Full cash flow of one property (real estate feedback 2026-11-14): every rupee in and out against
// the timeline. One screen for everything: add, edit, duplicate or delete entries, open the loan /
// EMI schedule, and see the result in four views (by head, by year, list, table) that all use the
// same filters. The backend builds the rows (GET /real-estate/holdings/{id}/cash-flow); this page
// only filters and adds them up. Totals stay neutral: negative cash flow is normal for property.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import PrivacyMask from "@/components/ui/PrivacyMask";
import PropertyMoneySheet, { MoneySheetMode, MoneySheetStart } from "@/components/features/PropertyMoneySheet";
import PropertyLoanModal, { PropertyLoanView } from "@/components/features/PropertyLoanModal";
import {
  ArrowDownUp,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  Info,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface Line {
  date: string;
  head: string;
  label: string;
  direction: "IN" | "OUT";
  amount: number;
  signed_amount: number;
  in_xirr: boolean;
  excluded_reason: string | null;
  source: "PURCHASE" | "LOAN" | "EMI" | "ENTRY" | "VALUATION" | "ASSUMED";
  transaction_id: number | null;
  sub_category: string | null;
  note: string | null;
  adds_to_tax_cost: boolean;
}

interface CashFlowResponse {
  holding_id: number;
  property_name: string;
  purchase_date: string;
  as_of: string;
  xirr_pct: number | null;
  xirr_check_pct: number | null;
  xirr_basis: "WITH_LOAN" | "CASH_FLOW" | "PRICE_ONLY";
  has_loan: boolean;
  loan: PropertyLoanView | null;
  monthly_rental_income: number;
  is_rented: boolean;
  heads: { head: string; label: string; direction: "IN" | "OUT" }[];
  lines: Line[];
  notes: string[];
}

// Short names for the page; the backend label is the fallback.
const SHORT: Record<string, string> = {
  PURCHASE_PRICE: "Purchase price",
  STAMP_DUTY: "Stamp duty & registration",
  RENOVATION_AT_PURCHASE: "Renovation at purchase",
  LOAN_TAKEN: "Home loan taken",
  EMI_PRINCIPAL: "EMI · principal",
  EMI_INTEREST: "EMI · interest",
  HOME_LOAN_INTEREST: "Pre-EMI interest",
  LOAN_REPAYMENT: "Loan prepayment",
  HOME_LOAN_EMI: "EMI logged by hand",
  MAINTENANCE: "Society maintenance",
  PROPERTY_TAX: "Property tax",
  ELECTRICITY_BILL: "Electricity",
  GAS_BILL: "Piped gas",
  UTILITIES_BILLS: "Water / Wi-Fi bills",
  REPAIRS_RENOVATION: "Repairs & renovation",
  FURNISHING_APPLIANCES: "Furnishing",
  BROKERAGE_COMMISSION: "Brokerage",
  INSURANCE: "Insurance",
  OTHER_EXPENSE: "Miscellaneous expense",
  RENT_INCOME: "Rent",
  SHORT_STAY_AIRBNB: "Airbnb / short stay",
  PARKING_AMENITY_INCOME: "Parking",
  DEPOSIT_DEDUCTION_RECOVERY: "Deposit kept",
  OTHER_INCOME: "Miscellaneous income",
  PROPERTY_SALE_PROCEEDS: "Sale proceeds",
  CURRENT_VALUE: "Market value today",
  LOAN_OUTSTANDING: "Loan still to repay",
  FORECLOSURE_FEE: "Foreclosure fee",
};

const EXCLUDED_WHY: Record<string, string> = {
  EMI_FROM_LOAN_SCHEDULE: "Not counted: EMIs come from the loan schedule",
  PREPAYMENT_NEEDS_OUTSTANDING: "Not counted yet: enter today's loan outstanding under EMI / Loan",
};

type Preset = "ALL" | "THIS_FY" | "LAST_FY" | "LAST_12M" | "CUSTOM";
type View = "HEADS" | "YEARS" | "LIST" | "TABLE";
type Direction = "ALL" | "OUT" | "IN";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const nameOf = (l: { head: string; label: string }) => SHORT[l.head] ?? l.label;

/** ₹1.40Cr / ₹39.3L / ₹97.1K for tight spaces. */
function inrShort(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return inr(v);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Indian FY of an ISO date: "2024-25" for 1 Apr 2024 .. 31 Mar 2025. */
function fyOf(dateIso: string): string {
  const [y, m] = dateIso.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function presetRange(p: Preset, today: string): [string, string] | null {
  const [y, m] = today.split("-").map(Number);
  const fyStart = m >= 4 ? y : y - 1;
  if (p === "THIS_FY") return [`${fyStart}-04-01`, `${fyStart + 1}-03-31`];
  if (p === "LAST_FY") return [`${fyStart - 1}-04-01`, `${fyStart}-03-31`];
  if (p === "LAST_12M") {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 1);
    d.setDate(d.getDate() + 1);
    return [iso(d), today];
  }
  return null;
}

const prettyDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Notes the app wrote itself ("Rent - Jan 2025", or just the type) are not shown as notes. */
function ownNote(l: Line): string {
  const d = (l.note ?? "").trim();
  if (!d) return "";
  if (/ - [A-Z][a-z]{2} \d{4}$/.test(d)) return "";
  if (d.toLowerCase() === nameOf(l).toLowerCase() || d === l.label) return "";
  return d;
}

const toStart = (l: Line, edit: boolean): MoneySheetStart => ({
  edit,
  tx: {
    id: l.transaction_id ?? 0,
    transaction_type: l.head,
    category: l.direction === "IN" ? "INFLOW" : "OUTFLOW",
    amount: l.amount,
    transaction_date: l.date,
    description: l.note,
    sub_category: l.sub_category,
    adds_to_tax_cost: l.adds_to_tax_cost,
  },
});

export default function PropertyCashFlowPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [data, setData] = useState<CashFlowResponse | null>(null);
  const [error, setError] = useState("");

  // Filters, shared by every view.
  const [preset, setPreset] = useState<Preset>("ALL");
  const [from, setFrom] = useState("");
  const [till, setTill] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set()); // empty = every head
  const [direction, setDirection] = useState<Direction>("ALL");
  const [query, setQuery] = useState("");
  const [headsOpen, setHeadsOpen] = useState(false); // phones: head chips folded away

  const [view, setView] = useState<View>("HEADS");
  const [newestFirst, setNewestFirst] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Entry sheet / loan sheet on this same screen.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<MoneySheetMode>("EXPENSE");
  const [sheetStart, setSheetStart] = useState<MoneySheetStart | null>(null);
  const [loanOpen, setLoanOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Refresh after a change; the filters are kept.
  const load = useCallback(async () => {
    if (!id) return;
    try {
      setData(await api.getPropertyCashFlow(id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load the cash flow.");
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api
      .getPropertyCashFlow(id)
      .then((res: CashFlowResponse) => {
        if (!alive) return;
        setData(res);
        setFrom(res.purchase_date);
        setTill(res.as_of);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Could not load the cash flow."));
    return () => {
      alive = false;
    };
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const openSheet = (mode: MoneySheetMode, start: MoneySheetStart | null = null) => {
    setSheetMode(mode);
    setSheetStart(start);
    setSheetOpen(true);
  };

  const removeEntry = async (l: Line) => {
    if (!l.transaction_id || !confirm(`Delete ${nameOf(l)} of ${inr(l.amount)} on ${prettyDate(l.date)}?`)) return;
    try {
      await api.deletePropertyTransaction(id, l.transaction_id);
      showToast("Entry deleted");
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Could not delete the entry.");
    }
  };

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (!data) return;
    if (p === "ALL") {
      setFrom(data.purchase_date);
      setTill(data.as_of);
    } else if (p !== "CUSTOM") {
      const r = presetRange(p, data.as_of);
      if (r) {
        setFrom(r[0]);
        setTill(r[1]);
      }
    }
  };

  const toggleHead = (h: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });

  const filtersOn = preset !== "ALL" || picked.size > 0 || direction !== "ALL" || query.trim() !== "";
  const resetFilters = () => {
    choosePreset("ALL");
    setPicked(new Set());
    setDirection("ALL");
    setQuery("");
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.lines.filter(
      (l) =>
        (!from || l.date >= from) &&
        (!till || l.date <= till) &&
        (picked.size === 0 || picked.has(l.head)) &&
        (direction === "ALL" || l.direction === direction) &&
        (!q || `${nameOf(l)} ${l.sub_category ?? ""} ${l.note ?? ""}`.toLowerCase().includes(q))
    );
  }, [data, from, till, picked, direction, query]);

  // Own money paid and money received in the range. The bank's loan paid part of the price, so it
  // is taken off; valuation-day rows are not cash yet and are left out of these totals.
  const totals = useMemo(() => {
    let paid = 0;
    let received = 0;
    for (const l of rows) {
      if (!l.in_xirr || l.source === "VALUATION" || l.source === "ASSUMED") continue;
      if (l.head === "LOAN_TAKEN") paid -= l.amount;
      else if (l.direction === "OUT") paid += l.amount;
      else received += l.amount;
    }
    return { paid, received, net: received - paid };
  }, [rows]);

  const byHead = useMemo(() => {
    const map = new Map<string, { head: string; name: string; direction: "IN" | "OUT"; total: number; count: number; excluded: number; subs: Map<string, { total: number; count: number }> }>();
    for (const l of rows) {
      let g = map.get(l.head);
      if (!g) {
        g = { head: l.head, name: nameOf(l), direction: l.direction, total: 0, count: 0, excluded: 0, subs: new Map() };
        map.set(l.head, g);
      }
      if (!l.in_xirr) {
        g.excluded += l.amount;
        continue;
      }
      g.total += l.amount;
      g.count += 1;
      const subName = l.sub_category || "";
      const s = g.subs.get(subName) ?? { total: 0, count: 0 };
      s.total += l.amount;
      s.count += 1;
      g.subs.set(subName, s);
    }
    const order = new Map((data?.heads ?? []).map((h, i) => [h.head, i]));
    return Array.from(map.values()).sort((a, b) => (order.get(a.head) ?? 99) - (order.get(b.head) ?? 99));
  }, [rows, data]);

  const byYear = useMemo(() => {
    const map = new Map<string, { fy: string; out: number; inn: number; heads: Map<string, number> }>();
    for (const l of rows) {
      if (!l.in_xirr || l.source === "VALUATION") continue;
      const fy = fyOf(l.date);
      const g = map.get(fy) ?? { fy, out: 0, inn: 0, heads: new Map() };
      if (l.direction === "OUT") g.out += l.amount;
      else g.inn += l.amount;
      g.heads.set(nameOf(l), (g.heads.get(nameOf(l)) ?? 0) + l.signed_amount);
      map.set(fy, g);
    }
    return Array.from(map.values()).sort((a, b) => (a.fy < b.fy ? 1 : -1));
  }, [rows]);

  // Table rows in date order with a running total (oldest first, then flipped if newest first).
  const tableRows = useMemo(() => {
    let running = 0;
    const withRunning = rows.map((l) => {
      if (l.in_xirr) running += l.signed_amount;
      return { l, running };
    });
    return newestFirst ? [...withRunning].reverse() : withRunning;
  }, [rows, newestFirst]);

  const tableTotals = useMemo(() => {
    let out = 0;
    let inn = 0;
    for (const l of rows) {
      if (!l.in_xirr) continue;
      if (l.direction === "OUT") out += l.amount;
      else inn += l.amount;
    }
    return { out, inn };
  }, [rows]);

  const downloadCsv = () => {
    if (!data) return;
    const header = ["Date", "FY", "Head", "Sub-head", "Note", "Money out", "Money in", "XIRR flow", "Counted in XIRR"];
    const body = rows.map((l) => [
      l.date,
      fyOf(l.date),
      nameOf(l),
      l.sub_category ?? "",
      l.note ?? "",
      l.direction === "OUT" ? l.amount.toFixed(2) : "",
      l.direction === "IN" ? l.amount.toFixed(2) : "",
      l.in_xirr ? l.signed_amount.toFixed(2) : "",
      l.in_xirr ? "Yes" : EXCLUDED_WHY[l.excluded_reason ?? ""] ?? "No",
    ]);
    const csv = [header, ...body].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.property_name.replace(/[^\w-]+/g, "_")}_cash_flow_${from}_to_${till}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        <BackLink />
        <Card className="p-6 text-sm text-rose-600">{error}</Card>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={22} />
      </div>
    );
  }

  const presets: { id: Preset; label: string }[] = [
    { id: "ALL", label: "Since purchase" },
    { id: "THIS_FY", label: "This FY" },
    { id: "LAST_FY", label: "Last FY" },
    { id: "LAST_12M", label: "Last 12 months" },
    { id: "CUSTOM", label: "Custom" },
  ];

  /** Edit / duplicate / delete for logged entries; EMI rows open the loan schedule. */
  const rowActions = (l: Line) => {
    if (l.source === "ENTRY" && l.transaction_id) {
      return (
        <span className="inline-flex shrink-0">
          <IconBtn label="Edit" onClick={() => openSheet(l.direction === "IN" ? "RENT" : "EXPENSE", toStart(l, true))}>
            <Pencil size={13} />
          </IconBtn>
          <IconBtn label="Duplicate" onClick={() => openSheet(l.direction === "IN" ? "RENT" : "EXPENSE", toStart(l, false))}>
            <Copy size={13} />
          </IconBtn>
          <IconBtn label="Delete" danger onClick={() => removeEntry(l)}>
            <Trash2 size={13} />
          </IconBtn>
        </span>
      );
    }
    if ((l.source === "EMI" || l.source === "LOAN") && data.loan) {
      return (
        <span className="inline-flex shrink-0">
          <IconBtn label="Open EMI schedule" onClick={() => setLoanOpen(true)}>
            <CreditCard size={13} />
          </IconBtn>
        </span>
      );
    }
    return <span className="inline-block w-[26px] shrink-0" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <BackLink />
          <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate mt-1">{data.property_name}</h1>
          <p className="text-xs text-neutral-500">Cash flow since {prettyDate(data.purchase_date)}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-indigo-500/[0.08] px-3 py-2 text-right">
          <div className="text-[11px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Net return</div>
          <div className="text-lg font-black font-mono text-neutral-900 dark:text-white">
            {data.xirr_pct == null ? "—" : `${data.xirr_pct.toFixed(2)}%`}
          </div>
          <div className="text-[11px] text-neutral-400">XIRR p.a., whole period</div>
        </div>
      </div>

      {/* Add / manage, without leaving this screen */}
      <div className="grid grid-cols-3 gap-2">
        <ActionBtn tone="emerald" onClick={() => openSheet("RENT")}>
          <Plus size={14} /> Income
        </ActionBtn>
        <ActionBtn tone="rose" onClick={() => openSheet("EXPENSE")}>
          <Plus size={14} /> Expense
        </ActionBtn>
        <ActionBtn tone="neutral" onClick={() => setLoanOpen(true)}>
          <CreditCard size={14} /> {data.loan ? "EMI / Loan" : "Add loan"}
        </ActionBtn>
      </div>

      {/* Filters: apply to every view below */}
      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Chip key={p.id} on={preset === p.id} onClick={() => choosePreset(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
        {preset === "CUSTOM" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-neutral-500">
              From
              <DatePicker value={from} onChange={setFrom} className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-neutral-500">
              Till
              <DatePicker value={till} onChange={setTill} className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </label>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex p-1 rounded-xl bg-neutral-100 dark:bg-white/5 sm:w-72">
            {([
              ["ALL", "All"],
              ["OUT", "Money out"],
              ["IN", "Money in"],
            ] as [Direction, string][]).map(([d, label]) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${direction === d ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search head or note, e.g. painting"
              className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent pl-8 pr-8 py-2 text-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            {/* Phones: a toggle, so the long list of heads does not push the figures off screen. */}
            <button
              type="button"
              onClick={() => setHeadsOpen((v) => !v)}
              className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300"
              aria-expanded={headsOpen}
            >
              Heads {picked.size ? `(${picked.size} picked)` : "(all)"}
              <ChevronDown size={13} className={`transition-transform ${headsOpen ? "rotate-180" : ""}`} />
            </button>
            <span className="hidden sm:inline text-xs font-semibold text-neutral-500">Heads {picked.size ? `(${picked.size} picked)` : "(all)"}</span>
            {filtersOn && (
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Clear all filters
              </button>
            )}
          </div>
          <div className={`${headsOpen ? "flex" : "hidden"} sm:flex flex-wrap gap-1.5`}>
            {data.heads.map((h) => (
              <Chip key={h.head} small on={picked.has(h.head)} onClick={() => toggleHead(h.head)}>
                {nameOf(h)}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      {/* Totals for the filtered rows: plain text, no alarm colours */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Total label="You paid" sub="own money: price less loan, EMIs, costs" value={totals.paid} />
        <Total label="You received" sub="rent and other income" value={totals.received} />
        <Total label="Net cash" sub="received − paid" value={totals.net} signed />
      </div>

      {/* Views */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 p-1 rounded-xl bg-neutral-100 dark:bg-white/5">
          {([
            ["HEADS", "By head"],
            ["YEARS", "By year"],
            ["LIST", "List"],
            ["TABLE", "Table"],
          ] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${view === v ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-white/10 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 disabled:opacity-50"
          title="Download these rows as a CSV (opens in Excel)"
        >
          <Download size={14} /> CSV
        </button>
      </div>
      <p className="-mt-2 text-[11px] text-neutral-400">{rows.length} of {data.lines.length} rows match the filters.</p>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-xs text-neutral-500">Nothing matches these filters.</Card>
      ) : view === "HEADS" ? (
        <Card className="divide-y divide-neutral-100 dark:divide-white/5 overflow-hidden">
          {byHead.map((g) => {
            const subs = Array.from(g.subs.entries()).filter(([n]) => n);
            const expandable = subs.length > 0;
            const isOpen = open.has(g.head);
            return (
              <div key={g.head}>
                <button
                  type="button"
                  disabled={!expandable}
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.head)) next.delete(g.head);
                      else next.add(g.head);
                      return next;
                    })
                  }
                  className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 text-left"
                >
                  <span className="w-3.5 shrink-0 text-neutral-400">
                    {expandable ? isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-neutral-900 dark:text-white truncate">{g.name}</span>
                    <span className="block text-[11px] text-neutral-400">
                      {g.count} {g.count === 1 ? "entry" : "entries"}
                      {g.excluded > 0 && <> · <PrivacyMask>{inr(g.excluded)}</PrivacyMask> not counted</>}
                    </span>
                  </span>
                  <Amount direction={g.direction} value={g.total} />
                </button>
                {isOpen &&
                  subs.map(([name, s]) => (
                    <div key={name} className="flex items-center gap-2 pl-9 pr-3 sm:pr-4 py-1.5 bg-neutral-50/70 dark:bg-white/[0.02]">
                      <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-300">
                        {name} <span className="text-neutral-400">· {s.count}</span>
                      </span>
                      <Amount direction={g.direction} value={s.total} small />
                    </div>
                  ))}
                {isOpen && g.subs.has("") && subs.length > 0 && (
                  <div className="flex items-center gap-2 pl-9 pr-3 sm:pr-4 py-1.5 bg-neutral-50/70 dark:bg-white/[0.02]">
                    <span className="flex-1 text-xs text-neutral-400">No head given · {g.subs.get("")!.count}</span>
                    <Amount direction={g.direction} value={g.subs.get("")!.total} small />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ) : view === "YEARS" ? (
        <Card className="divide-y divide-neutral-100 dark:divide-white/5 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 sm:px-4 py-2 text-[11px] uppercase font-bold text-neutral-400">
            <span>FY</span>
            <span className="text-right w-20 sm:w-24">Out</span>
            <span className="text-right w-20 sm:w-24">In</span>
            <span className="text-right w-20 sm:w-24">Net</span>
          </div>
          {byYear.map((y) => (
            <details key={y.fy} className="group">
              <summary className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 sm:px-4 py-2.5 cursor-pointer list-none text-xs font-mono">
                <span className="font-sans font-semibold text-neutral-900 dark:text-white">FY {y.fy}</span>
                <span className="text-right w-20 sm:w-24 text-neutral-600 dark:text-neutral-300"><PrivacyMask>{inr(y.out)}</PrivacyMask></span>
                <span className="text-right w-20 sm:w-24 text-emerald-600 dark:text-emerald-400"><PrivacyMask>{inr(y.inn)}</PrivacyMask></span>
                <span className="text-right w-20 sm:w-24 font-semibold text-neutral-800 dark:text-neutral-200">
                  <PrivacyMask>{y.inn - y.out >= 0 ? "+" : "−"}{inr(Math.abs(y.inn - y.out))}</PrivacyMask>
                </span>
              </summary>
              <div className="px-3 sm:px-4 pb-2 space-y-0.5">
                {Array.from(y.heads.entries()).map(([name, v]) => (
                  <div key={name} className="flex justify-between text-xs text-neutral-600 dark:text-neutral-300">
                    <span>{name}</span>
                    <span className={`font-mono ${v >= 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      <PrivacyMask>{v >= 0 ? "+" : "−"}{inr(Math.abs(v))}</PrivacyMask>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
          <p className="px-3 sm:px-4 py-2 text-[11px] text-neutral-400">Out includes the full purchase price; the loan taken shows as In in the purchase year.</p>
        </Card>
      ) : view === "LIST" ? (
        <Card className="divide-y divide-neutral-100 dark:divide-white/5 overflow-hidden">
          {[...rows].reverse().map((l, i) => (
            <div key={`${l.date}-${l.head}-${l.transaction_id ?? i}`} className={`flex items-start gap-2 px-3 sm:px-4 py-2 ${l.in_xirr ? "" : "opacity-60"}`}>
              <div className="w-[72px] shrink-0 text-[11px] text-neutral-400 pt-0.5">{prettyDate(l.date)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                  {nameOf(l)}
                  {l.sub_category && <span className="font-normal text-neutral-500"> · {l.sub_category}</span>}
                  {l.adds_to_tax_cost && <TaxTag />}
                </div>
                {ownNote(l) && <div className="text-[11px] text-neutral-500 break-words">{ownNote(l)}</div>}
                {!l.in_xirr && <div className="text-[11px] text-amber-700 dark:text-amber-400">{EXCLUDED_WHY[l.excluded_reason ?? ""] ?? "Not counted"}</div>}
                {l.source === "VALUATION" && <div className="text-[11px] text-neutral-400">As if sold today (for XIRR)</div>}
              </div>
              <Amount direction={l.direction} value={l.amount} />
              {rowActions(l)}
            </div>
          ))}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* w-0 + min-w-full: the scroller adds nothing to the page width, then fills the card; the table scrolls inside. */}
          <div className="overflow-x-auto w-0 min-w-full">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="text-[11px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-white/5">
                  <th className="text-left px-3 py-2 font-bold">
                    <button type="button" onClick={() => setNewestFirst((v) => !v)} className="inline-flex items-center gap-1 uppercase">
                      Date <ArrowDownUp size={11} />
                    </button>
                  </th>
                  <th className="text-left px-2 py-2 font-bold">FY</th>
                  <th className="text-left px-2 py-2 font-bold">Head</th>
                  <th className="text-left px-2 py-2 font-bold">Sub-head</th>
                  <th className="text-left px-2 py-2 font-bold">Note</th>
                  <th className="text-right px-2 py-2 font-bold">Out</th>
                  <th className="text-right px-2 py-2 font-bold">In</th>
                  <th className="text-right px-2 py-2 font-bold" title="Running total of counted rows (in − out), in date order">Running</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {tableRows.map(({ l, running }, i) => (
                  <tr key={`${l.date}-${l.head}-${l.transaction_id ?? i}`} className={l.in_xirr ? "" : "opacity-60"}>
                    <td className="px-3 py-1.5 whitespace-nowrap text-neutral-500">{prettyDate(l.date)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-neutral-400">{fyOf(l.date)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap font-semibold text-neutral-900 dark:text-white">
                      {nameOf(l)}
                      {l.adds_to_tax_cost && <TaxTag />}
                    </td>
                    <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-300">{l.sub_category ?? ""}</td>
                    <td className="px-2 py-1.5 text-neutral-500 max-w-[220px]">
                      <span className="line-clamp-2">
                        {ownNote(l)}
                        {!l.in_xirr && <span className="text-amber-700 dark:text-amber-400"> {EXCLUDED_WHY[l.excluded_reason ?? ""] ?? "Not counted"}</span>}
                        {l.source === "VALUATION" && <span className="text-neutral-400">As if sold today</span>}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap text-neutral-700 dark:text-neutral-200">
                      {l.direction === "OUT" ? <PrivacyMask>{inr(l.amount)}</PrivacyMask> : ""}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                      {l.direction === "IN" ? <PrivacyMask>{inr(l.amount)}</PrivacyMask> : ""}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap text-neutral-400">
                      <PrivacyMask>{running >= 0 ? "" : "−"}{inr(Math.abs(running))}</PrivacyMask>
                    </td>
                    <td className="px-2 py-1 text-right">
                      {rowActions(l)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 dark:border-white/10 font-semibold">
                  <td className="px-3 py-2 text-neutral-500" colSpan={5}>
                    Total of {rows.length} rows {rows.some((l) => !l.in_xirr) && <span className="font-normal text-neutral-400">(faded rows not counted)</span>}
                  </td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap text-neutral-800 dark:text-neutral-100"><PrivacyMask>{inr(tableTotals.out)}</PrivacyMask></td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap text-emerald-600 dark:text-emerald-400"><PrivacyMask>{inr(tableTotals.inn)}</PrivacyMask></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* How the XIRR is built */}
      <Card className="p-3 sm:p-4 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
          <Info size={14} className="text-indigo-500" /> How the net return (XIRR) is worked out
        </div>
        <p>
          <b>Money out:</b> purchase price, stamp duty, every EMI (principal + interest), every expense, and the loan still to repay today.{" "}
          <b>Money in:</b> the home loan (the bank paid that part of the price), rent and other income, and today&apos;s market value.
        </p>
        <p>
          XIRR is the yearly return that makes all of these, on their dates, add up to zero, the same way a mutual fund XIRR works.
          It covers the whole period; the filters only change what is listed and the totals.
        </p>
        <p>Paying out more than you get back while you hold a property is normal: the market value at the end is what pays it back.</p>
        {data.xirr_check_pct != null && (
          <p className="text-neutral-400">
            Solved again from the rows on this page: {data.xirr_check_pct.toFixed(2)}%. Download the CSV and use Excel&apos;s XIRR on the
            &quot;XIRR flow&quot; column with &quot;Since purchase&quot; and no other filters to check it.
          </p>
        )}
      </Card>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}

      <PropertyMoneySheet
        isOpen={sheetOpen}
        mode={sheetMode}
        start={sheetStart}
        onClose={() => {
          setSheetOpen(false);
          setSheetStart(null);
        }}
        property={{
          id: data.holding_id,
          property_name: data.property_name,
          purchase_date: data.purchase_date,
          monthly_rental_income: data.monthly_rental_income,
          is_rented: data.is_rented,
          has_loan: data.has_loan,
        }}
        onSaved={(msg) => {
          showToast(msg);
          load();
        }}
        onOpenLoan={() => {
          setSheetOpen(false);
          setLoanOpen(true);
        }}
      />

      {loanOpen && (
        <PropertyLoanModal
          isOpen={loanOpen}
          onClose={() => setLoanOpen(false)}
          holdingId={data.holding_id}
          propertyName={data.property_name}
          loan={data.loan}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/holdings/real-estate" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white">
      <ArrowLeft size={14} /> Real estate
    </Link>
  );
}

function Chip({ on, small, onClick, children }: { on: boolean; small?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border font-semibold ${small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"} ${
        on ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

function ActionBtn({ tone, onClick, children }: { tone: "emerald" | "rose" | "neutral"; onClick: () => void; children: React.ReactNode }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : tone === "rose"
        ? "bg-rose-600 hover:bg-rose-700 text-white"
        : "border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5";
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold ${cls}`}>
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg text-neutral-400 ${danger ? "hover:text-rose-600" : "hover:text-indigo-600"}`}
    >
      {children}
    </button>
  );
}

function TaxTag() {
  return <span className="ml-1.5 rounded bg-indigo-500/10 px-1 py-px text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Tax cost</span>;
}

/** Plain, neutral totals (feedback 2026-11-14: a big red negative alarms owners). */
function Total({ label, sub, value, signed }: { label: string; sub: string; value: number; signed?: boolean }) {
  return (
    <Card className="p-2.5 sm:p-3">
      <div className="text-[11px] uppercase font-bold text-neutral-400">{label}</div>
      <div className="text-sm font-semibold font-mono text-neutral-800 dark:text-neutral-100">
        <PrivacyMask>
          {signed ? (value >= 0 ? "+" : "−") : ""}
          {/* Phones: short form so a crore figure fits a third of the screen. */}
          <span className="sm:hidden">{inrShort(Math.abs(value))}</span>
          <span className="hidden sm:inline">{inr(Math.abs(value))}</span>
        </PrivacyMask>
      </div>
      <div className="text-[11px] text-neutral-400 leading-tight">{sub}</div>
    </Card>
  );
}

/** Money in is green; money out stays neutral (prefixed with −) rather than red. */
function Amount({ direction, value, small }: { direction: "IN" | "OUT"; value: number; small?: boolean }) {
  return (
    <span
      className={`shrink-0 font-mono font-semibold ${small ? "text-xs" : "text-xs"} ${
        direction === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-200"
      }`}
    >
      <PrivacyMask>
        {direction === "IN" ? "+" : "−"}
        {inr(value)}
      </PrivacyMask>
    </span>
  );
}
