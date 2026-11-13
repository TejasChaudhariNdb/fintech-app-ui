"use client";

import React, { useState } from "react";

type Unit = "g" | "mg";

const CHIPS: Record<Unit, { label: string; add: number }[]> = {
  g: [
    { label: "+1g", add: 1 },
    { label: "+5g", add: 5 },
    { label: "+10g", add: 10 },
    { label: "+20g", add: 20 },
    { label: "+50g", add: 50 },
  ],
  mg: [
    { label: "+10mg", add: 10 },
    { label: "+50mg", add: 50 },
    { label: "+100mg", add: 100 },
    { label: "+500mg", add: 500 },
  ],
};

/** Trim float noise: 0.1 + 0.2 -> 0.3, 15 / 1000 -> 0.015. */
function tidy(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

function toDisplay(gramsStr: string, unit: Unit): string {
  const g = parseFloat(gramsStr);
  if (!gramsStr || isNaN(g)) return "";
  return unit === "mg" ? tidy(g * 1000, 3) : gramsStr;
}

/**
 * Weight field with a grams / milligrams switch. The value passed in and out is always grams
 * (what the backend stores); milligrams are converted on entry.
 */
export default function GoldWeightInput({
  grams,
  onChange,
  label = "Weight",
  showChips = true,
}: {
  grams: string;
  onChange: (grams: string) => void;
  label?: string;
  showChips?: boolean;
}) {
  const [unit, setUnit] = useState<Unit>("g");
  // What the user typed, in the selected unit. Kept separately so "1." or "0.0" can be typed.
  const [text, setText] = useState<string>(() => toDisplay(grams, unit));

  const setFromText = (value: string, u: Unit = unit) => {
    setText(value);
    const n = parseFloat(value);
    if (!value || isNaN(n)) {
      onChange("");
      return;
    }
    onChange(u === "mg" ? tidy(n / 1000, 6) : value);
  };

  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    setUnit(next);
    setText(toDisplay(grams, next));
  };

  const addChip = (amount: number) => {
    const cur = parseFloat(text) || 0;
    setFromText(tidy(cur + amount, 3));
  };

  const g = parseFloat(grams) || 0;
  const equivalent =
    g > 0 ? (unit === "mg" ? `= ${tidy(g, 6)} g` : g < 1 ? `= ${tidy(g * 1000, 3)} mg` : `${(g / 8).toFixed(2)} Sovereigns`) : "";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 tabular-nums">{equivalent}</span>
          <div
            role="radiogroup"
            aria-label="Weight unit"
            className="flex rounded-lg bg-neutral-100 dark:bg-white/5 p-0.5 text-[11px] font-bold"
          >
            {(["g", "mg"] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                onClick={() => switchUnit(u)}
                className={`px-2.5 py-0.5 rounded-md transition-colors ${
                  unit === u
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {u === "g" ? "Grams" : "Milligrams"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <input
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          placeholder={unit === "mg" ? "0" : "0.00"}
          value={text}
          onChange={(e) => setFromText(e.target.value)}
          className="w-full bg-white dark:bg-[#121620] border border-neutral-200 dark:border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-4 py-3 text-lg font-bold text-neutral-900 dark:text-white outline-none transition-all tabular-nums placeholder:text-neutral-300 dark:placeholder:text-neutral-600 pr-14"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
          {unit}
        </span>
      </div>

      {showChips && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-neutral-400 uppercase font-medium mr-1">Add:</span>
          {CHIPS[unit].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => addChip(chip.add)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {chip.label}
            </button>
          ))}
          {text && (
            <button
              type="button"
              onClick={() => setFromText("")}
              className="text-[11px] text-neutral-400 hover:text-red-500 ml-auto transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
