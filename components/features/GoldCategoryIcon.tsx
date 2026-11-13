import React from "react";
import { inferGoldCategory } from "@/lib/goldCategories";

/**
 * Line icons for gold categories, drawn for Arthavi in one style: 24x24, 1.6 stroke, round joins,
 * colour from `currentColor`. A category without its own icon (one a user typed) uses the icon of a
 * keyword in its name ("Toe Ring" -> Ring), otherwise a gem.
 */

const PATHS: Record<string, React.ReactNode> = {
  Chain: (
    <>
      <ellipse cx="6.8" cy="17.2" rx="3.6" ry="2.2" transform="rotate(-45 6.8 17.2)" />
      <ellipse cx="12" cy="12" rx="3.6" ry="2.2" transform="rotate(45 12 12)" />
      <ellipse cx="17.2" cy="6.8" rx="3.6" ry="2.2" transform="rotate(-45 17.2 6.8)" />
    </>
  ),
  Ring: (
    <>
      <circle cx="12" cy="15" r="6" />
      <path d="M9 4.5h6l1.5 2.1L12 10.2 7.5 6.6z" />
      <path d="M7.5 6.6h9" />
    </>
  ),
  Bangles: (
    <>
      <ellipse cx="12" cy="9.5" rx="8.5" ry="3.6" />
      <ellipse cx="12" cy="14.5" rx="8.5" ry="3.6" />
    </>
  ),
  Bracelet: (
    <>
      <ellipse cx="12" cy="12" rx="8.5" ry="5.5" />
      <circle cx="12" cy="6.5" r="1.4" />
      <circle cx="12" cy="17.5" r="1.4" />
      <circle cx="3.5" cy="12" r="1.4" />
      <circle cx="20.5" cy="12" r="1.4" />
    </>
  ),
  Earrings: (
    <>
      <path d="M7.5 9.5V6a1.6 1.6 0 0 0-1.6-1.6" />
      <path d="M7.5 9.5c-2 2.6-3 4.4-3 5.8a3 3 0 0 0 6 0c0-1.4-1-3.2-3-5.8z" />
      <path d="M16.5 9.5V6a1.6 1.6 0 0 0-1.6-1.6" />
      <path d="M16.5 9.5c-2 2.6-3 4.4-3 5.8a3 3 0 0 0 6 0c0-1.4-1-3.2-3-5.8z" />
    </>
  ),
  Necklace: (
    <>
      <path d="M4 3.5c0 7 3.6 11 8 11s8-4 8-11" />
      <path d="M12 14.5v1.6" />
      <path d="M12 16.1l-2.2 2.5L12 21.2l2.2-2.6z" />
    </>
  ),
  Mangalsutra: (
    <>
      <path d="M4 3.5l8 11 8-11" />
      <path d="M6.6 3.5L12 11l5.4-7.5" strokeDasharray="0.1 2.2" strokeWidth="2.2" />
      <circle cx="10" cy="17.6" r="2.1" />
      <circle cx="14" cy="17.6" r="2.1" />
    </>
  ),
  Pendant: (
    <>
      <path d="M7 3l5 6 5-6" />
      <path d="M12 9v1" />
      <circle cx="12" cy="15" r="4.6" />
      <circle cx="12" cy="15" r="1.8" />
    </>
  ),
  "Nose Pin": (
    <>
      <circle cx="12" cy="9" r="1.5" />
      <circle cx="12" cy="5.2" r="2" />
      <circle cx="15.8" cy="9" r="2" />
      <circle cx="12" cy="12.8" r="2" />
      <circle cx="8.2" cy="9" r="2" />
      <path d="M12 14.8V21" />
    </>
  ),
  Anklet: (
    <>
      <ellipse cx="12" cy="9.5" rx="8.5" ry="4" />
      <path d="M8 13.3v1.6M12 13.5v1.6M16 13.3v1.6" />
      <circle cx="8" cy="16.6" r="1.4" />
      <circle cx="12" cy="16.8" r="1.4" />
      <circle cx="16" cy="16.6" r="1.4" />
    </>
  ),
  Coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="6" />
      <path d="M9.6 9h4.8M9.6 11h4.8M10 9c2.8 0 2.8 4 0 4l3.2 3" />
    </>
  ),
  Bar: (
    <>
      <path d="M2.5 18.5h19L18 9.5H6z" />
      <path d="M6 9.5l1.6-3.5h8.8L18 9.5" />
      <path d="M9.5 14.5h5" />
    </>
  ),
  "Digital Gold": (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
      <circle cx="12" cy="11" r="3.4" />
      <path d="M12 9.4v3.2" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  SGB: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7.5h8M8 10.5h8" />
      <circle cx="12" cy="15.8" r="2.3" />
      <path d="M10.8 17.8l-.8 2.7M13.2 17.8l.8 2.7" />
    </>
  ),
  Gem: (
    <>
      <path d="M6 4h12l3 5-9 11L3 9z" />
      <path d="M3 9h18" />
      <path d="M9 4l3 5 3-5" />
      <path d="M12 9v11" />
    </>
  ),
};

export function goldIconKey(category: string): string {
  if (PATHS[category]) return category;
  const inferred = inferGoldCategory(category);
  return inferred && PATHS[inferred] ? inferred : "Gem";
}

export default function GoldCategoryIcon({
  category,
  size = 20,
  className = "",
}: {
  category: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[goldIconKey(category)]}
    </svg>
  );
}

/** The icon on the soft gold tile used for category headers. */
export function GoldCategoryTile({ category, size = 40 }: { category: string; size?: number }) {
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 ring-1 ring-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <GoldCategoryIcon category={category} size={Math.round(size * 0.55)} />
    </div>
  );
}
