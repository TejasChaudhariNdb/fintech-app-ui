// Gold categories for the Add/Edit form autofill.
// Mirrors CATEGORY_KEYWORDS / infer_gold_category in ../backend/app/routes/gold.py; keep the two in step.
// The backend is the source of truth: it stores the category the form sends and infers one for older rows.

export const GOLD_CATEGORY_KEYWORDS: [string, string[]][] = [
  ["Digital Gold", ["digital"]],
  ["SGB", ["sgb", "sovereign gold bond", "gold bond"]],
  ["Mangalsutra", ["mangalsutra", "mangal sutra", "thali"]],
  ["Earrings", ["earring", "ear ring", "jhumka", "jhumki", "stud", "tops", "bali"]],
  ["Necklace", ["necklace", "choker", "haar", "har"]],
  ["Chain", ["chain"]],
  ["Bangles", ["bangle", "kada", "kangan", "kara"]],
  ["Bracelet", ["bracelet"]],
  ["Pendant", ["pendant", "locket"]],
  ["Ring", ["ring", "anguthi"]],
  ["Nose Pin", ["nose pin", "nosepin", "nath"]],
  ["Anklet", ["anklet", "payal"]],
  ["Coin", ["coin", "sovereign", "guinea", "gini"]],
  ["Bar", ["bar", "biscuit"]],
];

export const OTHER_JEWELLERY = "Other Jewellery";

// Shown first in the category picker.
export const COMMON_GOLD_CATEGORIES = [
  "Chain", "Ring", "Bangles", "Earrings", "Necklace", "Mangalsutra", "Pendant", "Coin", "Bar", "Digital Gold", "SGB",
];

/** Digital gold and SGBs are always 24K and carry no making charges. */
export function isPure24KCategory(category: string): boolean {
  return category === "Digital Gold" || category === "SGB";
}

export function assetTypeForCategory(category: string): string {
  if (category === "Digital Gold") return "DIGITAL_GOLD";
  if (category === "SGB") return "SGB";
  if (category === "Coin" || category === "Bar") return "PHYSICAL_BAR_COIN";
  return "JEWELRY";
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Category suggested by an asset name ("Wedding chain" -> "Chain"), or null when no keyword matches. */
export function inferGoldCategory(assetName: string): string | null {
  const name = ` ${assetName.toLowerCase()} `;
  for (const [category, words] of GOLD_CATEGORY_KEYWORDS) {
    for (const w of words) {
      if (new RegExp(`(?<![a-z])${escapeRe(w)}(?:s|es)?(?![a-z])`).test(name)) return category;
    }
  }
  return null;
}

/** Trim, collapse spaces and title-case a typed category; a known one is matched case-insensitively. */
export function cleanGoldCategory(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!text) return "";
  const known = [...GOLD_CATEGORY_KEYWORDS.map(([c]) => c), OTHER_JEWELLERY].find(
    (c) => c.toLowerCase() === text.toLowerCase()
  );
  if (known) return known;
  if (text === text.toUpperCase()) return text;
  return text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}
