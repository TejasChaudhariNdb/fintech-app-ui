"use client";

import React, { useState } from "react";
import { Gift, Link2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import DatePicker from "@/components/ui/DatePicker";
import PrivacyMask from "@/components/ui/PrivacyMask";

export interface GiftLot {
  acquired_date: string;
  units: number;
  cost: number;
  source: "donor_fifo" | "user_entered" | "gift_day_value";
}

export interface GiftSide {
  tx_id: number;
  profile_id: number | null;
  profile_name: string | null;
  folio: string | null;
  scheme_id: number;
  scheme_name: string;
}

export interface GiftInfo {
  tx_id: number;
  direction: "IN" | "OUT";
  date: string;
  units: number;
  value_on_gift_date: number;
  counterparty_folio: string | null;
  self: GiftSide | null;
  counterparty: GiftSide | null;
  transfer_id: number | null;
  link_method: "auto" | "manual" | "manual_cost" | null;
  status: "linked" | "partial" | "cost_entered" | "unlinked";
  unmatched_units: number;
  inherited_cost?: number;
  lots?: GiftLot[];
  /** Exactly one matching gift-out in the family: offered as a one-tap link. */
  suggested_gift_out?: Candidate;
}

interface Candidate {
  tx_id: number;
  date: string;
  units: number;
  profile_name: string | null;
  folio: string | null;
}

interface Props {
  gift: GiftInfo;
  linkingAvailable: boolean;
  onChanged: () => void;
  notify: (message: string, type: "success" | "error" | "loading" | "info") => void;
}

const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

const inr = (n: number) =>
  `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const SOURCE_LABEL: Record<GiftLot["source"], string> = {
  donor_fifo: "Donor's purchase",
  user_entered: "Entered by you",
  gift_day_value: "Gift-date value",
};

/** One line describing who the gift came from / went to. */
export function giftCounterpartyLabel(gift: GiftInfo): string {
  const who = gift.counterparty?.profile_name;
  const folio = gift.counterparty?.folio || gift.counterparty_folio;
  const prefix = gift.direction === "IN" ? "From" : "To";
  if (who) return `${prefix} ${who}${folio ? ` · Folio ${folio}` : ""}`;
  return folio ? `${prefix} Folio ${folio}` : gift.direction === "IN" ? "Gift received" : "Gift given";
}

type LotRow = { acquired_date: string; units: string; cost: string };

export default function GiftDetailsCard({ gift, linkingAvailable, onChanged, notify }: Props) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [rows, setRows] = useState<LotRow[]>([
    { acquired_date: "", units: String(gift.units), cost: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const isIn = gift.direction === "IN";
  const needsCost = isIn && (gift.status === "unlinked" || gift.status === "partial");
  const canRemove = gift.link_method === "manual" || gift.link_method === "manual_cost";

  const findDonor = async () => {
    setLoadingCandidates(true);
    try {
      const data = await api.getGiftCandidates(gift.tx_id);
      setCandidates(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      notify(errMsg(e, "Could not load matching gifts"), "error");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const link = async (giftOutTxId: number) => {
    try {
      notify("Linking gift...", "loading");
      await api.linkGift(gift.tx_id, giftOutTxId);
      notify("Gift linked. Original purchase history carried over.", "success");
      setCandidates(null);
      onChanged();
    } catch (e: unknown) {
      notify(errMsg(e, "Could not link gift"), "error");
    }
  };

  const remove = async () => {
    if (!gift.transfer_id) return;
    if (!confirm("Remove this link? The gift will use its gift-date value until it is linked again.")) return;
    try {
      notify("Removing...", "loading");
      await api.removeGiftLink(gift.transfer_id);
      notify("Link removed", "success");
      onChanged();
    } catch (e: unknown) {
      notify(errMsg(e, "Could not remove link"), "error");
    }
  };

  const enteredUnits = rows.reduce((s, r) => s + (Number(r.units) || 0), 0);
  const unitsMatch = Math.abs(enteredUnits - gift.units) <= 0.001;
  const rowsValid =
    rows.length > 0 &&
    rows.every(
      (r) => r.acquired_date && Number(r.units) > 0 && r.cost !== "" && Number(r.cost) >= 0,
    );

  const saveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rowsValid || !unitsMatch) return;
    setSaving(true);
    try {
      await api.setGiftCost(
        gift.tx_id,
        rows.map((r) => ({
          acquired_date: r.acquired_date,
          units: Number(r.units),
          cost: Number(r.cost),
        })),
      );
      notify("Original cost saved", "success");
      setShowCostModal(false);
      onChanged();
    } catch (err: unknown) {
      notify(errMsg(err, "Could not save cost"), "error");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (i: number, patch: Partial<LotRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
          <Gift size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            {isIn ? "Gifted units received" : "Units gifted"}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {giftCounterpartyLabel(gift)} · {fmtDate(gift.date)} · {gift.units} units
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Value on gift date: <PrivacyMask>{inr(gift.value_on_gift_date)}</PrivacyMask>
          </p>
        </div>
      </div>

      {!isIn && (
        <p className="text-xs text-neutral-600 dark:text-neutral-300">
          Gifting is not a sale, so no capital gain is counted for these units.
          {gift.status === "linked" && gift.counterparty?.profile_name
            ? ` Their purchase history moved to ${gift.counterparty.profile_name}.`
            : ""}
        </p>
      )}

      {isIn && (gift.status === "linked" || gift.status === "cost_entered") && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={14} />
          {gift.status === "linked"
            ? "Original purchase dates and cost carried over (FIFO)"
            : "Using the original cost you entered"}
        </div>
      )}

      {needsCost && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {gift.status === "partial"
              ? `${gift.unmatched_units} units were not found in the donor's history and are valued at the gift-date price.`
              : "Original cost is not known yet, so these units use their gift-date value. Link the donor's gift or enter the original cost for correct returns and capital gains."}
          </span>
        </div>
      )}

      {isIn && linkingAvailable && gift.status === "unlinked" && gift.suggested_gift_out && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-300 dark:border-violet-500/30 bg-white dark:bg-white/5 px-3 py-2.5">
          <div className="text-xs min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-white">
              Found {gift.suggested_gift_out.profile_name || "a family member"}&apos;s gift
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 truncate">
              {fmtDate(gift.suggested_gift_out.date)} · {gift.suggested_gift_out.units} units
              {gift.suggested_gift_out.folio ? ` · Folio ${gift.suggested_gift_out.folio}` : ""}
            </p>
          </div>
          <Button size="sm" onClick={() => link(gift.suggested_gift_out!.tx_id)}
            className="flex items-center gap-1.5 text-xs shrink-0">
            <Link2 size={14} />
            Link
          </Button>
        </div>
      )}

      {isIn && gift.lots && gift.lots.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">
            Inherited purchase history
          </p>
          <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th className="text-left font-medium px-3 py-1.5">Bought on</th>
                  <th className="text-right font-medium px-3 py-1.5">Units</th>
                  <th className="text-right font-medium px-3 py-1.5">Cost</th>
                  <th className="text-right font-medium px-3 py-1.5 hidden sm:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {gift.lots.map((l, i) => (
                  <tr key={i} className="text-neutral-800 dark:text-neutral-200">
                    <td className="px-3 py-1.5">{fmtDate(l.acquired_date)}</td>
                    <td className="px-3 py-1.5 text-right">{l.units}</td>
                    <td className="px-3 py-1.5 text-right">
                      <PrivacyMask>{inr(l.cost)}</PrivacyMask>
                    </td>
                    <td className="px-3 py-1.5 text-right hidden sm:table-cell text-neutral-500 dark:text-neutral-400">
                      {SOURCE_LABEL[l.source] || l.source}
                    </td>
                  </tr>
                ))}
              </tbody>
              {gift.inherited_cost !== undefined && (
                <tfoot>
                  <tr className="font-semibold text-neutral-900 dark:text-white border-t border-neutral-200 dark:border-white/10">
                    <td className="px-3 py-1.5">Total cost</td>
                    <td className="px-3 py-1.5 text-right">{gift.units}</td>
                    <td className="px-3 py-1.5 text-right">
                      <PrivacyMask>{inr(gift.inherited_cost)}</PrivacyMask>
                    </td>
                    <td className="hidden sm:table-cell" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {isIn && linkingAvailable && (
        <div className="flex flex-wrap gap-2">
          {needsCost && (
            <>
              {!gift.suggested_gift_out && (
              <Button size="sm" variant="secondary" onClick={findDonor} disabled={loadingCandidates}
                className="flex items-center gap-1.5 text-xs">
                <Link2 size={14} />
                {loadingCandidates ? "Searching..." : "Find donor's gift"}
              </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowCostModal(true)}
                className="flex items-center gap-1.5 text-xs">
                <Plus size={14} />
                Enter original cost
              </Button>
            </>
          )}
          {canRemove && (
            <Button size="sm" variant="ghost" onClick={remove}
              className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <Trash2 size={14} />
              {gift.link_method === "manual_cost" ? "Remove entered cost" : "Remove link"}
            </Button>
          )}
        </div>
      )}

      {candidates !== null && (
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              No matching gift found in your family profiles. Upload the donor&apos;s CAS to their
              profile, or enter the original cost.
            </p>
          ) : (
            candidates.map((c) => (
              <div key={c.tx_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2">
                <div className="text-xs min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {c.profile_name || "Profile"} · Folio {c.folio}
                  </p>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {fmtDate(c.date)} · {c.units} units
                  </p>
                </div>
                <Button size="sm" onClick={() => link(c.tx_id)} className="text-xs">
                  Link
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        For tax, gifted units keep the original owner&apos;s cost and holding period. Gifts to
        relatives are generally tax-free; income from gifts to a spouse or minor child may be
        added to the giver&apos;s income. Check with a tax adviser.
      </p>

      <Modal isOpen={showCostModal} onClose={() => setShowCostModal(false)} title="Original purchase cost">
        <form onSubmit={saveCost} className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Enter when the giver bought these {gift.units} units and what they paid. Add one row per
            purchase, oldest first. You can find this in the giver&apos;s CAS.
          </p>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-2 items-end">
              <DatePicker
                label={i === 0 ? "Bought on" : undefined}
                value={r.acquired_date}
                max={gift.date?.slice(0, 10)}
                onChange={(v) => updateRow(i, { acquired_date: v })}
                required
              />
              <Input
                label={i === 0 ? "Units" : undefined}
                type="number"
                step="any"
                min="0"
                value={r.units}
                onChange={(e) => updateRow(i, { units: e.target.value })}
                required
              />
              <Input
                label={i === 0 ? "Cost (₹)" : undefined}
                type="number"
                step="any"
                min="0"
                value={r.cost}
                onChange={(e) => updateRow(i, { cost: e.target.value })}
                required
              />
              <button
                type="button"
                aria-label="Remove purchase"
                disabled={rows.length === 1}
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="h-10 px-2 text-neutral-400 hover:text-red-500 disabled:opacity-30">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { acquired_date: "", units: "", cost: "" }])}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1">
            <Plus size={14} /> Add another purchase
          </button>
          <p className={`text-xs ${unitsMatch ? "text-neutral-500 dark:text-neutral-400" : "text-amber-600 dark:text-amber-400"}`}>
            Units entered: {Number(enteredUnits.toFixed(4))} of {gift.units}
          </p>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCostModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-[2]" disabled={saving || !rowsValid || !unitsMatch}>
              {saving ? "Saving..." : "Save cost"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
