"use client";

// Real estate feedback (2026-11-13): What-If sale simulator. Change the sale price and the year of
// sale and see the XIRR and money in hand. All maths is on the backend (GET /simulate), so it matches
// the property card's XIRR exactly.
import React, { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { api } from "@/lib/api";
import { ArrowRight, Loader2, TrendingDown, TrendingUp } from "lucide-react";

export interface SimulatorProperty {
  id: number;
  property_name: string;
  current_valuation: number;
  is_rented: boolean;
  monthly_rental_income: number;
  true_xirr_pct?: number | null;
}

interface Breakdown {
  upfront_own_money: number;
  emi_paid: number;
  interest_paid: number;
  income: number;
  future_rent: number;
  expenses: number;
  sale_value: number;
  outstanding_loan: number;
  foreclosure_fee: number;
  net_sale_in_hand: number;
  total_own_money_in: number;
  money_back_before_sale: number;
}

interface SimResult {
  sale_date: string;
  assumed_monthly_rent: number;
  current: { value: number; xirr_pct: number | null };
  simulated: {
    xirr_pct: number | null;
    xirr_post_tax_pct: number | null;
    breakdown: Breakdown;
    capital_gain: number;
    estimated_tax: number | null;
    net_in_hand_after_tax: number;
    total_profit: number;
    tax: { is_long_term: boolean; recommended_option: string | null };
  };
  notes: string[];
}

interface Bench {
  property_xirr_pct: number | null;
  nifty_xirr_pct: number | null;
  note: string;
}

const inr = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${v < 0 ? "-" : ""}₹${Math.abs(Math.round(v)).toLocaleString("en-IN")}`;

function short(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2).replace(/\.00$/, "")}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v.toFixed(1)}%`);

function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function Line({ label, value, tone, strong }: { label: string; value: string; tone?: "pos" | "neg"; strong?: boolean }) {
  const color = tone === "pos" ? "text-emerald-600 dark:text-emerald-400" : tone === "neg" ? "text-rose-600 dark:text-rose-400" : "text-neutral-800 dark:text-neutral-200";
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={`text-xs ${strong ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"}`}>{label}</span>
      <span className={`text-xs font-mono ${strong ? "font-bold" : ""} ${color}`}>
        <PrivacyMask>{value}</PrivacyMask>
      </span>
    </div>
  );
}

export default function PropertySimulatorModal({
  isOpen,
  onClose,
  property,
}: {
  isOpen: boolean;
  onClose: () => void;
  property: SimulatorProperty | null;
}) {
  const base = property?.current_valuation ?? 0;
  const [saleValue, setSaleValue] = useState(base);
  const [yearsAhead, setYearsAhead] = useState(0);
  const [assumeRent, setAssumeRent] = useState(true);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bench, setBench] = useState<Bench | null>(null);
  const reqId = useRef(0);

  // Reset when a different property opens
  useEffect(() => {
    if (isOpen && property) {
      setSaleValue(property.current_valuation);
      setYearsAhead(0);
      setAssumeRent(true);
      setResult(null);
      setBench(null);
      setError("");
      api.getPropertyBenchmark(property.id).then(setBench).catch(() => setBench(null));
    }
  }, [isOpen, property?.id]);

  // Debounced simulation
  useEffect(() => {
    if (!isOpen || !property) return;
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + yearsAhead);
      try {
        const res = await api.simulatePropertySale(property.id, Math.max(saleValue, 0), isoDate(d), assumeRent);
        if (id === reqId.current) {
          setResult(res);
          setError("");
        }
      } catch (e: unknown) {
        if (id === reqId.current) setError(e instanceof Error ? e.message : "Could not run the simulation.");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [isOpen, property?.id, saleValue, yearsAhead, assumeRent]);

  if (!property) return null;

  const min = Math.max(Math.round(base * 0.5), 0);
  const max = Math.max(Math.round(base * 2), 100000);
  const step = base >= 1e7 ? 100000 : 50000;
  const sim = result?.simulated;
  const b = sim?.breakdown;
  const nowX = result?.current.xirr_pct ?? property.true_xirr_pct ?? null;
  const simX = sim?.xirr_pct ?? null;
  const up = nowX !== null && simX !== null ? simX >= nowX : true;
  const diff = saleValue - base;

  const chips = [
    { label: "Today", v: base },
    { label: "+₹10L", v: base + 1_000_000 },
    { label: "+₹20L", v: base + 2_000_000 },
    { label: "+10%", v: Math.round(base * 1.1) },
    { label: "-10%", v: Math.round(base * 0.9) },
  ];

  let verdict: string | null = null;
  if (bench?.nifty_xirr_pct != null && bench.property_xirr_pct != null) {
    const gap = bench.property_xirr_pct - bench.nifty_xirr_pct;
    verdict =
      gap >= 0
        ? `So far the property has beaten Nifty 50 by ${gap.toFixed(1)}% a year on the same money.`
        : `So far the same money in Nifty 50 would have earned ${Math.abs(gap).toFixed(1)}% a year more.`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`What if I sell? · ${property.property_name}`}>
      <div className="space-y-4">
        {/* XIRR now -> simulated */}
        <div className="rounded-2xl bg-neutral-50 dark:bg-white/5 p-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-[11px] uppercase font-bold text-neutral-400">XIRR today</div>
              <div className="text-xl font-black font-mono text-neutral-700 dark:text-neutral-200">{pct(nowX)}</div>
            </div>
            <ArrowRight size={18} className="text-neutral-400" />
            <div className="text-center">
              <div className="text-[11px] uppercase font-bold text-neutral-400">If sold as below</div>
              <div className={`text-2xl font-black font-mono flex items-center gap-1 ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {loading && !result ? <Loader2 size={18} className="animate-spin" /> : pct(simX)}
                {result && (up ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
              </div>
            </div>
          </div>
          {sim && sim.estimated_tax ? (
            <p className="text-center text-xs text-neutral-500 mt-1">After capital gains tax: <b>{pct(sim.xirr_post_tax_pct)}</b></p>
          ) : null}
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Sale price</label>
              <span className="text-sm font-black font-mono text-neutral-900 dark:text-white">
                <PrivacyMask>{short(saleValue)}</PrivacyMask>
                {diff !== 0 && (
                  <span className={`ml-1 text-xs font-semibold ${diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ({diff > 0 ? "+" : ""}{short(diff)})
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={Math.min(Math.max(saleValue, min), max)}
              onChange={(e) => setSaleValue(Number(e.target.value))}
              className="w-full accent-indigo-600 mt-2"
              aria-label="Sale price"
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-1">
              {chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setSaleValue(c.v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                    saleValue === c.v
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              value={Math.round(saleValue)}
              onChange={(e) => setSaleValue(Number(e.target.value) || 0)}
              className="mt-2 w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
              aria-label="Sale price in rupees"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">When you sell</label>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {yearsAhead === 0 ? "Today" : `In ${yearsAhead} year${yearsAhead > 1 ? "s" : ""}`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={yearsAhead}
              onChange={(e) => setYearsAhead(Number(e.target.value))}
              className="w-full accent-indigo-600 mt-2"
              aria-label="Years until sale"
            />
          </div>

          {property.is_rented && property.monthly_rental_income > 0 && yearsAhead > 0 && (
            <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={assumeRent} onChange={(e) => setAssumeRent(e.target.checked)} className="accent-indigo-600" />
              Keep earning rent of ₹{property.monthly_rental_income.toLocaleString("en-IN")}/month until then
            </label>
          )}
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        {b && sim && (
          <>
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 p-3">
              <div className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Money in hand when you sell</div>
              <Line label="Sale price" value={inr(b.sale_value)} />
              {b.outstanding_loan > 0 && <Line label="Repay remaining loan" value={`-${inr(b.outstanding_loan)}`} tone="neg" />}
              {b.foreclosure_fee > 0 && <Line label="Foreclosure fee" value={`-${inr(b.foreclosure_fee)}`} tone="neg" />}
              {sim.estimated_tax ? (
                <Line label="Capital gains tax (est.)" value={`-${inr(sim.estimated_tax)}`} tone="neg" />
              ) : !sim.tax.is_long_term ? (
                <Line label="Tax (short-term, slab rate)" value="not estimated" />
              ) : null}
              <div className="border-t border-neutral-100 dark:border-white/5 mt-1 pt-1">
                <Line label="You keep" value={inr(sim.net_in_hand_after_tax)} strong />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 p-3">
              <div className="text-xs font-bold text-neutral-900 dark:text-white mb-1">The whole journey</div>
              <Line label="Down payment + charges" value={inr(b.upfront_own_money)} />
              {b.emi_paid > 0 && <Line label={`EMIs paid (of which interest ${short(b.interest_paid)})`} value={inr(b.emi_paid)} />}
              {b.expenses > 0 && <Line label="Maintenance, tax, repairs" value={inr(b.expenses)} />}
              <Line label="Total you put in" value={inr(b.total_own_money_in)} strong />
              {b.money_back_before_sale > 0 && (
                <Line label={`Rent received${b.future_rent > 0 ? " (incl. future)" : ""}`} value={`+${inr(b.money_back_before_sale)}`} tone="pos" />
              )}
              <Line label="Kept from the sale" value={`+${inr(sim.net_in_hand_after_tax)}`} tone="pos" />
              <div className="border-t border-neutral-100 dark:border-white/5 mt-1 pt-1">
                <Line label="Total profit" value={inr(sim.total_profit)} tone={sim.total_profit >= 0 ? "pos" : "neg"} strong />
              </div>
            </div>
          </>
        )}

        {/* Opportunity cost */}
        <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-3">
          <div className="text-xs font-bold text-neutral-900 dark:text-white">Property vs Nifty 50 (so far)</div>
          {bench === null ? (
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Comparing…</p>
          ) : bench.nifty_xirr_pct == null ? (
            <p className="text-xs text-neutral-500 mt-1">Comparison not available right now.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                <div>
                  <div className="text-[11px] uppercase text-neutral-400 font-bold">Your property</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white">{pct(bench.property_xirr_pct)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-neutral-400 font-bold">Same money in Nifty 50</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white">{pct(bench.nifty_xirr_pct)}</div>
                </div>
              </div>
              {verdict && <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-2">{verdict}</p>}
              <p className="text-[11px] text-neutral-400 mt-1">
                As if your down payment, EMIs and expenses had gone into Nifty 50 on the same dates, with rent taken out. Price index, no dividends.
              </p>
            </>
          )}
        </div>

        {result && (
          <ul className="list-disc pl-4 text-[11px] text-neutral-400 space-y-0.5">
            {result.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
      </div>
    </Modal>
  );
}
