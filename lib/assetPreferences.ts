"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetWorthAssetPreferences {
  mutual_funds: boolean;
  stocks: boolean;
  fixed_income: boolean;
  gold: boolean;
  real_estate: boolean;
  show_insurance_cover: boolean;
}

export const DEFAULT_ASSET_PREFERENCES: NetWorthAssetPreferences = {
  mutual_funds: true,
  stocks: true,
  fixed_income: true,
  gold: true,
  real_estate: true,
  show_insurance_cover: false,
};

export const ASSET_STORAGE_KEY = "arthavi_networth_asset_prefs";
export const ASSET_CHANGE_EVENT = "arthavi-asset-prefs-changed";

/**
 * Safely reads the user's asset preferences from localStorage.
 * Falls back to DEFAULT_ASSET_PREFERENCES if not set or during SSR.
 */
export function getStoredAssetPreferences(): NetWorthAssetPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_ASSET_PREFERENCES };
  }

  try {
    const raw = localStorage.getItem(ASSET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ASSET_PREFERENCES };

    const parsed = JSON.parse(raw);
    return {
      mutual_funds: typeof parsed.mutual_funds === "boolean" ? parsed.mutual_funds : true,
      stocks: typeof parsed.stocks === "boolean" ? parsed.stocks : true,
      fixed_income: typeof parsed.fixed_income === "boolean" ? parsed.fixed_income : true,
      gold: typeof parsed.gold === "boolean" ? parsed.gold : true,
      real_estate: typeof parsed.real_estate === "boolean" ? parsed.real_estate : true,
      show_insurance_cover: typeof parsed.show_insurance_cover === "boolean" ? parsed.show_insurance_cover : false,
    };
  } catch (e) {
    console.error("Error reading asset preferences from localStorage:", e);
    return { ...DEFAULT_ASSET_PREFERENCES };
  }
}

/**
 * Saves preferences to localStorage and broadcasts an update event.
 */
export function storeAssetPreferences(prefs: NetWorthAssetPreferences): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(
      new CustomEvent(ASSET_CHANGE_EVENT, { detail: prefs })
    );
  } catch (e) {
    console.error("Error saving asset preferences to localStorage:", e);
  }
}

/**
 * Counts how many core wealth asset classes are active (out of 5).
 */
export function countActiveAssets(prefs: NetWorthAssetPreferences): { active: number; total: number } {
  const keys: (keyof Omit<NetWorthAssetPreferences, "show_insurance_cover">)[] = [
    "mutual_funds",
    "stocks",
    "fixed_income",
    "gold",
    "real_estate",
  ];
  const active = keys.filter((k) => prefs[k]).length;
  return { active, total: keys.length };
}

/**
 * Checks if the user's preferences deviate from standard defaults.
 */
export function isCustomized(prefs: NetWorthAssetPreferences): boolean {
  return (
    !prefs.mutual_funds ||
    !prefs.stocks ||
    !prefs.fixed_income ||
    !prefs.gold ||
    !prefs.real_estate ||
    prefs.show_insurance_cover
  );
}

/**
 * React hook to observe and update asset preferences reactively.
 */
export function useAssetPreferences() {
  const [preferences, setPreferences] = useState<NetWorthAssetPreferences>(getStoredAssetPreferences);

  useEffect(() => {
    // Initial sync
    setPreferences(getStoredAssetPreferences());

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<NetWorthAssetPreferences>;
      if (customEvent.detail) {
        setPreferences(customEvent.detail);
      } else {
        setPreferences(getStoredAssetPreferences());
      }
    };

    window.addEventListener(ASSET_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener(ASSET_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const updatePreferences = useCallback((newPrefs: NetWorthAssetPreferences) => {
    setPreferences(newPrefs);
    storeAssetPreferences(newPrefs);
  }, []);

  return { preferences, updatePreferences };
}

