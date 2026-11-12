// BUG-035: filters for the mutual fund list. Kept separate from the page so the rules are in one place.
// Demat / Non-Demat is not offered: the mutual fund data does not record how units are held.

export const MF_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "LARGE_CAP", label: "Large cap" },
  { value: "MID_CAP", label: "Mid cap" },
  { value: "SMALL_CAP", label: "Small cap" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "DIVERSIFIED_EQUITY", label: "Diversified equity" },
  { value: "INDEX", label: "Index" },
  { value: "ELSS", label: "ELSS" },
  { value: "DEBT", label: "Debt" },
  { value: "SIF", label: "SIF" },
  { value: "SIF_THEMATIC", label: "Thematic / sectoral" },
  { value: "OTHER", label: "Other" },
];

export type MfPlan = "DIRECT" | "REGULAR" | "UNKNOWN";

export interface MfFilterState {
  categories: string[];   // category_bucket values; empty = all
  plan: "ALL" | "DIRECT" | "REGULAR";
  sifOnly: boolean;
}

export const EMPTY_MF_FILTERS: MfFilterState = { categories: [], plan: "ALL", sifOnly: false };

const STORAGE_KEY = "mf_list_filters";

// Scheme names carry the plan, e.g. "... - Direct Plan - Growth". Unknown when neither word appears.
export function mfPlanOf(schemeName: string | null | undefined): MfPlan {
  const name = (schemeName || "").toLowerCase();
  if (/\bdirect\b/.test(name)) return "DIRECT";
  if (/\bregular\b/.test(name)) return "REGULAR";
  return "UNKNOWN";
}

export function matchesMfFilters(
  scheme: { scheme?: string | null; category_bucket?: string | null; is_sif?: boolean | null },
  filters: MfFilterState,
): boolean {
  if (filters.categories.length > 0) {
    if (!scheme.category_bucket || !filters.categories.includes(scheme.category_bucket)) return false;
  }
  if (filters.plan !== "ALL" && mfPlanOf(scheme.scheme) !== filters.plan) return false;
  if (filters.sifOnly && !scheme.is_sif) return false;
  return true;
}

export function isMfFilterActive(filters: MfFilterState): boolean {
  return filters.categories.length > 0 || filters.plan !== "ALL" || filters.sifOnly;
}

// Reads and writes are wrapped: storage can be unavailable (private windows, blocked site data).
export function loadMfFilters(): MfFilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_MF_FILTERS;
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter((c: unknown) => typeof c === "string") : [],
      plan: parsed.plan === "DIRECT" || parsed.plan === "REGULAR" ? parsed.plan : "ALL",
      sifOnly: parsed.sifOnly === true,
    };
  } catch {
    return EMPTY_MF_FILTERS;
  }
}

export function saveMfFilters(filters: MfFilterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore: the filter still works for this visit
  }
}
