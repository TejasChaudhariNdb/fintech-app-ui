"use client";

import Input from "@/components/ui/Input";

// BUG-111: optional costs of one stock trade, in rupees for the whole trade (from the contract note).
export type TradeCharges = { charges: string; stt: string };

export const EMPTY_CHARGES: TradeCharges = { charges: "", stt: "" };

/** Form strings to what the backend takes: blank means "not entered" (null). */
export const chargesPayload = (c: TradeCharges) => ({
  charges: c.charges.trim() === "" ? null : Number(c.charges),
  stt: c.stt.trim() === "" ? null : Number(c.stt),
});

/** A saved transaction's charges back into form strings. */
export const chargesFromTx = (tx: { charges?: number | null; stt?: number | null }): TradeCharges => ({
  charges: tx.charges != null ? String(tx.charges) : "",
  stt: tx.stt != null ? String(tx.stt) : "",
});

export default function TradeChargesFields({
  value,
  onChange,
}: {
  value: TradeCharges;
  onChange: (next: TradeCharges) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Charges (₹, optional)"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          value={value.charges}
          onChange={(e) => onChange({ ...value, charges: e.target.value })}
        />
        <Input
          label="STT (₹, optional)"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          value={value.stt}
          onChange={(e) => onChange({ ...value, stt: e.target.value })}
        />
      </div>
      <p className="text-[11px] text-neutral-500 mt-1 ml-1">
        Total for this trade from your contract note. Charges = brokerage + GST + exchange fees + stamp duty.
        Both count in your cost and returns; for tax, charges are deducted but STT is not.
      </p>
    </div>
  );
}
