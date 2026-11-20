"use client";

/**
 * Owner feedback #1: import a property's income and expenses from a CSV or Excel file.
 * Step 1 uploads the file for a preview (nothing saved). Step 2 lists the rows: the owner unticks
 * any, picks a type where the file's word was not recognised, and imports. Duplicates of entries
 * already logged start unticked.
 */
import React, { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { api } from "@/lib/api";
import { AlertCircle, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type PreviewEntry = {
  row: number;
  date: string;
  transaction_type: string | null;
  category: "INFLOW" | "OUTFLOW" | null;
  direction_hint: "INFLOW" | "OUTFLOW" | null;
  amount: number;
  description: string | null;
  sub_category: string | null;
  raw_type: string | null;
  needs_type: boolean;
  auto_other?: boolean;
  is_duplicate: boolean;
};

type Preview = {
  entries: PreviewEntry[];
  errors: { row: number; reason: string }[];
  duplicate_count: number;
  needs_type_count: number;
  types: { INFLOW: Record<string, string>; OUTFLOW: Record<string, string> };
};

type Side = "INFLOW" | "OUTFLOW";
type Row = PreviewEntry & { include: boolean; chosenType: string; side: Side | null };

// Income and Expense columns: put each amount on its side, the Item word is optional.
const TEMPLATE = [
  "Date,Item,Income,Expense,Note",
  "01-Apr-2026,Rent,25000,,April rent from tenant",
  "01-Apr-2026,Parking rent,1500,,Second car slot",
  "05-Apr-2026,Society maintenance,,3500,April to June",
  "08-Apr-2026,Electricity,,1240,Common meter",
  "10-Apr-2026,Water and Wi-Fi,,899,",
  "12-Apr-2026,Property tax,,8400,Yearly municipal tax",
  "15-Apr-2026,Plumbing repair,,2200,Kitchen sink",
  "18-Apr-2026,Security guard,,800,Saved as Miscellaneous expense",
  "22-Apr-2026,Airbnb payout,4200,,Two nights",
  "30-Apr-2026,Deposit deduction,3000,,Recovered from old tenant",
  "05-May-2026,Property insurance,,2400,Yearly premium",
  "10-May-2026,Brokerage,,25000,New tenant",
].join("\n");

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function PropertyImportSheet({
  isOpen,
  property,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  property: { id: number; property_name: string } | null;
  onClose: () => void;
  onImported: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  // Same file types the backend reads; .xls must be re-saved as .xlsx
  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      setError("Choose a CSV or Excel (.xlsx) file. For an old .xls file, open it in Excel and save as .xlsx.");
      return;
    }
    setFile(f);
    setError("");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setRows([]);
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "property-income-expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async () => {
    if (!file || !property) return;
    setBusy(true);
    setError("");
    try {
      const res: Preview = await api.previewPropertyImport(property.id, file);
      setPreview(res);
      setRows(
        res.entries.map((e) => ({
          ...e,
          include: !e.is_duplicate,
          chosenType: e.transaction_type ?? "",
          side: e.category ?? e.direction_hint ?? null,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not read the file");
    } finally {
      setBusy(false);
    }
  };

  const typeOptions = useMemo(() => {
    if (!preview) return { INFLOW: [], OUTFLOW: [] } as Record<Side, [string, string][]>;
    // Sale proceeds and lump-sum loan repayment are left out here: they change returns a lot and
    // are recorded from the property screen, not from a file.
    const skip = new Set(["PROPERTY_SALE_PROCEEDS", "LOAN_REPAYMENT"]);
    return {
      INFLOW: Object.entries(preview.types.INFLOW).filter(([c]) => !skip.has(c)),
      OUTFLOW: Object.entries(preview.types.OUTFLOW).filter(([c]) => !skip.has(c)),
    } as Record<Side, [string, string][]>;
  }, [preview]);

  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  // Switching side keeps a matching type, otherwise falls back to Miscellaneous on that side.
  const setSide = (i: number, side: Side) => {
    const r = rows[i];
    const keep = r.chosenType && (side === "INFLOW") === isIncome(r.chosenType);
    setRow(i, {
      side,
      chosenType: keep ? r.chosenType : side === "INFLOW" ? "OTHER_INCOME" : "OTHER_EXPENSE",
      sub_category: keep ? r.sub_category : r.sub_category ?? r.raw_type,
    });
  };

  const included = rows.filter((r) => r.include);
  const missingType = included.filter((r) => !r.chosenType).length;
  const isIncome = (t: string) => !!preview && t in preview.types.INFLOW;
  const incomeTotal = included.filter((r) => r.chosenType && isIncome(r.chosenType)).reduce((s, r) => s + r.amount, 0);
  const expenseTotal = included.filter((r) => r.chosenType && !isIncome(r.chosenType)).reduce((s, r) => s + r.amount, 0);

  const doImport = async () => {
    if (!property || included.length === 0 || missingType > 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.importPropertyTransactions(
        property.id,
        included.map((r) => ({
          transaction_type: r.chosenType,
          amount: r.amount,
          transaction_date: r.date,
          description: r.description,
          sub_category: r.sub_category,
        }))
      );
      reset();
      onImported(res?.message || `Imported ${included.length} entries.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  if (!property) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title={`Import entries · ${property.property_name}`}>
      {!preview ? (
        <div className="space-y-4">
          <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-2">
            <p>
              Upload a <b>CSV</b> or <b>Excel (.xlsx)</b> file with one row per entry. Easiest layout:
            </p>
            <div className="grid grid-cols-5 gap-px rounded-lg overflow-hidden border border-neutral-200 dark:border-white/10 text-[10px] font-mono">
              {["Date", "Item", "Income", "Expense", "Note"].map((h) => (
                <div key={h} className="bg-neutral-100 dark:bg-white/10 px-1.5 py-1 font-bold">{h}</div>
              ))}
              {["01-Apr-2026", "Rent", "25000", "", "April"].map((c, i) => (
                <div key={`a${i}`} className={`px-1.5 py-1 bg-white dark:bg-white/5 ${i === 2 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{c}</div>
              ))}
              {["05-Apr-2026", "Maintenance", "", "3500", ""].map((c, i) => (
                <div key={`b${i}`} className={`px-1.5 py-1 bg-white dark:bg-white/5 ${i === 3 ? "text-rose-600 dark:text-rose-400" : ""}`}>{c}</div>
              ))}
            </div>
            <p>
              Write dates like <b>01-Apr-2026</b> (day, month name, year). Money you{" "}
              <b className="text-emerald-600 dark:text-emerald-400">received</b> goes in <b>Income</b>, money you{" "}
              <b className="text-rose-600 dark:text-rose-400">paid</b> goes in <b>Expense</b>. The Item is optional: words like
              Rent, Maintenance, Electricity or Property tax are recognised, anything else is saved as Miscellaneous with your word
              kept. You will check every row before anything is saved.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
          >
            <Download size={14} /> Download a sample file
          </button>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 cursor-pointer text-center transition-all ${
              dragging
                ? "border-indigo-500 bg-indigo-500/15 scale-[1.01]"
                : "border-indigo-400/50 bg-indigo-500/5 hover:bg-indigo-500/10"
            }`}
          >
            <FileSpreadsheet size={22} className="text-indigo-500" />
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {file ? file.name : dragging ? "Drop the file here" : "Drag a CSV or Excel (.xlsx) file here, or tap to choose"}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            disabled={!file || busy}
            onClick={readFile}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Read file
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-emerald-500/5 p-2">
              <div className="text-[11px] uppercase font-bold text-neutral-400">Income</div>
              <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                <PrivacyMask>+{inr(incomeTotal)}</PrivacyMask>
              </div>
            </div>
            <div className="rounded-xl bg-neutral-500/5 p-2">
              <div className="text-[11px] uppercase font-bold text-neutral-400">Expenses</div>
              <div className="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-200">
                <PrivacyMask>−{inr(expenseTotal)}</PrivacyMask>
              </div>
            </div>
          </div>

          {preview.duplicate_count > 0 && (
            <p className="text-xs rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 px-3 py-2">
              {preview.duplicate_count} {preview.duplicate_count === 1 ? "entry is" : "entries are"} already logged (same
              date, type and amount) and left unticked.
            </p>
          )}
          {preview.errors.length > 0 && (
            <div className="text-xs rounded-xl bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-300 px-3 py-2 space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle size={14} /> {preview.errors.length} row{preview.errors.length === 1 ? "" : "s"} skipped
              </div>
              {preview.errors.slice(0, 6).map((e) => (
                <div key={e.row}>
                  Row {e.row}: {e.reason}
                </div>
              ))}
              {preview.errors.length > 6 && <div>…and {preview.errors.length - 6} more</div>}
            </div>
          )}
          {missingType > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Tap <b>Income</b> or <b>Expense</b> for {missingType} {missingType === 1 ? "row" : "rows"} marked below, or untick{" "}
              {missingType === 1 ? "it" : "them"}.
            </p>
          )}

          <div className="rounded-xl border border-neutral-200 dark:border-white/10 divide-y divide-neutral-100 dark:divide-white/5 max-h-[45vh] overflow-y-auto">
            {rows.map((r, i) => (
              <div key={`${r.row}-${i}`} className={`flex items-start gap-2 px-3 py-2 ${r.include ? "" : "opacity-50"}`}>
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                  className="mt-1 accent-indigo-600"
                  aria-label={`Import row ${r.row}`}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-neutral-500">{fmtDate(r.date)}</span>
                    <span
                      className={`font-mono font-semibold ${
                        r.chosenType && isIncome(r.chosenType) ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 dark:text-neutral-100"
                      }`}
                    >
                      <PrivacyMask>
                        {r.chosenType ? (isIncome(r.chosenType) ? "+" : "−") : ""}
                        {inr(r.amount)}
                      </PrivacyMask>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex shrink-0 rounded-lg p-0.5 ${
                        r.include && !r.side ? "ring-1 ring-amber-500" : ""
                      } bg-neutral-100 dark:bg-white/5`}
                      role="group"
                      aria-label={`Income or expense for row ${r.row}`}
                    >
                      {(["INFLOW", "OUTFLOW"] as Side[]).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setSide(i, side)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            r.side === side
                              ? side === "INFLOW"
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                              : "text-neutral-500"
                          }`}
                        >
                          {side === "INFLOW" ? "Income" : "Expense"}
                        </button>
                      ))}
                    </div>
                    <select
                      value={r.chosenType}
                      disabled={!r.side}
                      onChange={(e) => setRow(i, { chosenType: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-neutral-200 dark:border-white/10 px-2 py-1 text-xs bg-white dark:bg-white/5 disabled:opacity-50"
                      aria-label={`Type for row ${r.row}`}
                    >
                      {!r.side && <option value="">{r.raw_type ? `“${r.raw_type}”` : "Pick a side first"}</option>}
                      {r.side &&
                        [
                          ...typeOptions[r.side],
                          // a sale / prepayment named exactly in the file stays selectable
                          ...(r.chosenType && preview && !typeOptions[r.side].some(([c]) => c === r.chosenType)
                            ? ([[r.chosenType, preview.types[r.side][r.chosenType] ?? r.chosenType]] as [string, string][])
                            : []),
                        ].map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                    </select>
                  </div>
                  {(r.description || r.sub_category) && (
                    <div className="text-[11px] text-neutral-500 truncate">
                      {[r.sub_category, r.description].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="text-center text-xs text-neutral-500 py-6">No entries found in the file.</p>}
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-neutral-200 dark:border-white/10 py-2.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Choose another file
            </button>
            <button
              type="button"
              disabled={busy || included.length === 0 || missingType > 0}
              onClick={doImport}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Import {included.length}{" "}
              {included.length === 1 ? "entry" : "entries"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
