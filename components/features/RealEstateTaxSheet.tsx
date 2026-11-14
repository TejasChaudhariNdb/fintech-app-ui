"use client";

// Real estate feedback (2026-11-13): tax details in a sheet, explained step by step, instead of a
// collapsed block inside the Capital Gain card. All figures come from the backend `tax_view`.
import React from "react";
import Modal from "@/components/ui/Modal";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { CheckCircle2, Info } from "lucide-react";

export interface PropertyTaxView {
  is_long_term: boolean;
  raw_gain: number;
  indexation_allowed: boolean | null;
  cii_purchase: number | null;
  cii_sale: number | null;
  indexed_cost: number | null;
  indexed_gain: number | null;
  tax_without_indexation: number | null;
  tax_with_indexation: number | null;
  recommended_option: string | null;
  recommended_tax: number | null;
  tax_note: string | null;
  // 2026-11-14: cost of improvement (entries ticked "count in capital gains cost"), each indexed from its own FY.
  cost_of_acquisition?: number;
  cost_of_improvement?: number;
  indexed_cost_of_acquisition?: number | null;
  indexed_cost_of_improvement?: number | null;
  improvements?: { date: string; amount: number; cii: number | null; indexed_amount: number | null }[];
  improvements_before_2001_skipped?: number;
  tax_note_improvements?: string | null;
}

export interface TaxSheetProperty {
  id: number;
  property_name: string;
  purchase_date: string;
  tenure_years: number;
  total_invested: number;
  current_valuation: number;
  tax_view?: PropertyTaxView;
}

const inr = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `₹${Math.round(v).toLocaleString("en-IN")}`;

function Row({ label, value, strong, hint }: { label: string; value: React.ReactNode; strong?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <div className="min-w-0">
        <div className={`text-xs ${strong ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-300"}`}>{label}</div>
        {hint && <div className="text-[10px] text-neutral-400 leading-snug">{hint}</div>}
      </div>
      <div className={`text-xs font-mono shrink-0 ${strong ? "font-bold text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-200"}`}>
        <PrivacyMask>{value}</PrivacyMask>
      </div>
    </div>
  );
}

function OptionBox({
  title,
  lines,
  tax,
  recommended,
}: {
  title: string;
  lines: { label: string; value: string }[];
  tax: number | null;
  recommended: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        recommended
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-neutral-200 dark:border-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-bold text-neutral-900 dark:text-white">{title}</span>
        {recommended && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={12} /> Lower tax
          </span>
        )}
      </div>
      {lines.map((l) => (
        <Row key={l.label} label={l.label} value={l.value} />
      ))}
      <div className="border-t border-neutral-100 dark:border-white/5 mt-1 pt-1">
        <Row label="Tax" value={inr(tax)} strong />
      </div>
    </div>
  );
}

export default function RealEstateTaxSheet({
  isOpen,
  onClose,
  properties,
}: {
  isOpen: boolean;
  onClose: () => void;
  properties: TaxSheetProperty[];
}) {
  const total = properties.reduce((s, p) => s + (p.tax_view?.recommended_tax ?? 0), 0);
  const anyLongTerm = properties.some((p) => p.tax_view?.is_long_term);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Capital gains tax, if sold today">
      <div className="space-y-4">
        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3 text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
            <p>
              This estimates the tax you would pay if you sold each property today at its current value.
              Nothing is paid until you actually sell.
            </p>
          </div>
          <ul className="list-disc pl-6 space-y-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
            <li><b>Held 24 months or less:</b> the gain is added to your income and taxed at your slab rate.</li>
            <li><b>Held over 24 months:</b> 12.5% on the gain.</li>
            <li>
              <b>Bought before 23 Jul 2024:</b> you can instead pay 20% after <i>indexation</i>. Indexation raises your
              purchase cost in line with inflation, using the government&apos;s Cost Inflation Index (CII), so less of
              the gain is taxed. You pick whichever is lower.
            </li>
          </ul>
        </div>

        {anyLongTerm && (
          <div className="flex items-baseline justify-between rounded-xl border border-neutral-200 dark:border-white/10 p-3">
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">Estimated tax, all properties</span>
            <span className="text-base font-black font-mono text-neutral-900 dark:text-white">
              <PrivacyMask>{inr(total)}</PrivacyMask>
            </span>
          </div>
        )}

        {properties.map((p) => {
          const t = p.tax_view;
          if (!t) return null;
          const indexedRecommended = t.recommended_option?.includes("with indexation") ?? false;
          return (
            <div key={p.id} className="rounded-2xl border border-neutral-200 dark:border-white/10 p-3 space-y-2">
              <div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">{p.property_name}</div>
                <div className="text-[11px] text-neutral-500">
                  Held {p.tenure_years} years · {t.is_long_term ? "long-term" : "short-term"}
                </div>
              </div>

              <div>
                <Row label="Sale value (today's value)" value={inr(p.current_valuation)} />
                <Row label="Your cost" hint="Price + stamp duty + renovation at purchase" value={inr(p.total_invested)} />
                {(t.cost_of_improvement ?? 0) > 0 && (
                  <Row
                    label="Cost of improvement"
                    hint={`${t.improvements?.length ?? 0} ${t.improvements?.length === 1 ? "entry" : "entries"} ticked “count in capital gains cost”`}
                    value={inr(t.cost_of_improvement)}
                  />
                )}
                <Row label="Gain" value={inr(t.raw_gain)} strong />
              </div>

              {!t.is_long_term ? (
                <p className="text-[11px] text-neutral-500 rounded-lg bg-neutral-50 dark:bg-white/5 p-2">
                  Held 24 months or less, so the gain is taxed at your income slab rate. We don&apos;t estimate it here.
                </p>
              ) : t.raw_gain <= 0 && !(t.indexed_gain && t.indexed_gain > 0) ? (
                <p className="text-[11px] text-neutral-500 rounded-lg bg-neutral-50 dark:bg-white/5 p-2">
                  No gain at today&apos;s value, so no tax.
                </p>
              ) : (
                <div className="space-y-2">
                  <OptionBox
                    title="Option A · 12.5%, no indexation"
                    lines={[{ label: "Taxable gain", value: inr(Math.max(t.raw_gain, 0)) }]}
                    tax={t.tax_without_indexation}
                    recommended={!indexedRecommended}
                  />
                  {t.indexation_allowed ? (
                    <OptionBox
                      title="Option B · 20% with indexation"
                      lines={[
                        { label: `Inflation index (CII) ${t.cii_purchase} → ${t.cii_sale}`, value: `×${((t.cii_sale ?? 0) / (t.cii_purchase || 1)).toFixed(2)}` },
                        ...((t.cost_of_improvement ?? 0) > 0
                          ? [
                              { label: "Indexed cost of purchase", value: inr(t.indexed_cost_of_acquisition) },
                              ...(t.improvements ?? []).map((im) => ({
                                label: `Improvement ${new Date(im.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}: ${inr(im.amount)} × ${t.cii_sale}/${im.cii}`,
                                value: inr(im.indexed_amount),
                              })),
                            ]
                          : []),
                        { label: "Indexed cost", value: inr(t.indexed_cost) },
                        { label: "Taxable gain", value: inr(Math.max(t.indexed_gain ?? 0, 0)) },
                      ]}
                      tax={t.tax_with_indexation}
                      recommended={indexedRecommended}
                    />
                  ) : (
                    <p className="text-[11px] text-neutral-500">Bought on or after 23 Jul 2024, so indexation is not available.</p>
                  )}
                </div>
              )}
              {t.tax_note && <p className="text-[10px] text-neutral-400 leading-snug">{t.tax_note}</p>}
              {t.tax_note_improvements && <p className="text-[10px] text-neutral-400 leading-snug">{t.tax_note_improvements}</p>}
            </div>
          );
        })}

        <p className="text-[10px] text-neutral-400 leading-snug">
          Estimate only. Only costs you tick as “count in capital gains cost” (renovation, extension, brokerage on purchase)
          are added; routine repairs, painting, society maintenance and property tax never count. Excludes surcharge, cess,
          brokerage on sale and exemptions such as Sec 54 (reinvesting in another house). Not tax advice.
        </p>
      </div>
    </Modal>
  );
}
