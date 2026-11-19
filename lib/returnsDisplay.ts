// BUG-072 (owner decision 2026-11-19): for a fund held under one year, XIRR and CAGR both show the
// plain return, labelled, instead of a yearly rate that magnifies a few weeks' move (-4% shown as
// -19%). The server still sends the annualised XIRR (used for sorting) and a `held_under_one_year` flag.

export const UNDER_ONE_YEAR_NOTE = "Held under 1 year: XIRR and CAGR show the plain return, not a yearly rate.";

/** The value to show in an XIRR / CAGR box. */
export function rateToShow(
  annualPct: number | null | undefined,
  plainReturnPct: number | null | undefined,
  heldUnderOneYear?: boolean,
): number | null {
  const v = heldUnderOneYear ? plainReturnPct : annualPct;
  return v === undefined || v === null || !isFinite(Number(v)) ? null : Number(v);
}

/** Box label, e.g. "XIRR" or "XIRR (<1 yr)". */
export function rateLabel(name: string, heldUnderOneYear?: boolean): string {
  return heldUnderOneYear ? `${name} (<1 yr)` : name;
}
