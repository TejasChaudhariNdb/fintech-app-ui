"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

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

export function getProfileStorageKey(profileId: string | number = "all"): string {
  return `${ASSET_STORAGE_KEY}_${profileId}`;
}

/**
 * Safely reads the user's asset preferences from localStorage for a specific profile.
 * Falls back to DEFAULT_ASSET_PREFERENCES if not set or during SSR.
 */
export function getStoredAssetPreferences(profileId: string | number = "all"): NetWorthAssetPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_ASSET_PREFERENCES };
  }

  try {
    const key = getProfileStorageKey(profileId);
    let raw = localStorage.getItem(key);
    // Fall back to legacy global key if profile key not found
    if (!raw && profileId === "all") {
      raw = localStorage.getItem(ASSET_STORAGE_KEY);
    }
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
 * Saves preferences for a profile. The backend is the source of truth, so the save waits for it.
 * If the backend save fails, the previous values are restored everywhere (no silent mismatch
 * between the toggles and the Home numbers). Resolves true on success, false if it was reverted.
 */
export async function storeAssetPreferences(
  prefs: NetWorthAssetPreferences,
  profileId: string | number = "all",
  syncBackend = true
): Promise<boolean> {
  if (typeof window === "undefined") return true;

  const previous = getStoredAssetPreferences(profileId);
  writeLocalAssetPreferences(prefs, profileId);

  if (!syncBackend) return true;
  // Each save is numbered per profile. A failed save reverts only if no newer save has started, so an
  // older failure cannot undo a later toggle. Every save sends the full set, so the last one wins.
  const key = String(profileId);
  const seq = (latestSaveSeq[key] ?? 0) + 1;
  latestSaveSeq[key] = seq;
  try {
    await api.updateAssetPreferences(prefs, profileId);
    return true;
  } catch (err) {
    console.error("Could not save asset preferences to the server.", err);
    if (latestSaveSeq[key] === seq) {
      writeLocalAssetPreferences(previous, profileId);
    }
    return false;
  }
}

const latestSaveSeq: Record<string, number> = {};

function writeLocalAssetPreferences(prefs: NetWorthAssetPreferences, profileId: string | number): void {
  try {
    const key = getProfileStorageKey(profileId);
    localStorage.setItem(key, JSON.stringify(prefs));
    if (profileId === "all") {
      localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(prefs));
    }
    window.dispatchEvent(new CustomEvent(`${ASSET_CHANGE_EVENT}_${profileId}`, { detail: prefs }));
    window.dispatchEvent(new CustomEvent(ASSET_CHANGE_EVENT, { detail: { profileId, prefs } }));
  } catch (e) {
    console.error("Error saving asset preferences to localStorage:", e);
  }
}

/**
 * Hydrates preferences from the backend on page load. The backend value always wins (it is what the
 * Home numbers use), so a stale value saved in this browser cannot override it.
 */
export function syncPreferencesFromBackend(
  backendPrefs?: Partial<NetWorthAssetPreferences>,
  byProfile?: Record<string, any>
): void {
  if (typeof window === "undefined") return;
  try {
    const toFull = (p: any): NetWorthAssetPreferences => ({
      mutual_funds: typeof p.mutual_funds === "boolean" ? p.mutual_funds : true,
      stocks: typeof p.stocks === "boolean" ? p.stocks : true,
      fixed_income: typeof p.fixed_income === "boolean" ? p.fixed_income : true,
      gold: typeof p.gold === "boolean" ? p.gold : true,
      real_estate: typeof p.real_estate === "boolean" ? p.real_estate : true,
      show_insurance_cover: typeof p.show_insurance_cover === "boolean" ? p.show_insurance_cover : false,
    });

    if (byProfile && typeof byProfile === "object") {
      for (const [pId, pPrefs] of Object.entries(byProfile)) {
        if (pPrefs && typeof pPrefs === "object") {
          writeLocalAssetPreferences(toFull(pPrefs), pId);
        }
      }
    }

    if (backendPrefs && typeof backendPrefs === "object") {
      writeLocalAssetPreferences(toFull(backendPrefs), "all");
    }
  } catch (e) {
    console.error("Error hydrating asset preferences from backend:", e);
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
 * React hook to observe and update asset preferences reactively per profile.
 */
export function useAssetPreferences(profileId: string | number = "all") {
  const [preferences, setPreferences] = useState<NetWorthAssetPreferences>(() =>
    getStoredAssetPreferences(profileId)
  );

  useEffect(() => {
    setPreferences(getStoredAssetPreferences(profileId));

    const specificHandler = (e: Event) => {
      const customEvent = e as CustomEvent<NetWorthAssetPreferences>;
      if (customEvent.detail) {
        setPreferences(customEvent.detail);
      } else {
        setPreferences(getStoredAssetPreferences(profileId));
      }
    };

    const globalHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ profileId?: string | number; prefs?: NetWorthAssetPreferences }>;
      if (
        customEvent.detail &&
        String(customEvent.detail.profileId) === String(profileId) &&
        customEvent.detail.prefs
      ) {
        setPreferences(customEvent.detail.prefs);
      }
    };

    window.addEventListener(`${ASSET_CHANGE_EVENT}_${profileId}`, specificHandler);
    window.addEventListener(ASSET_CHANGE_EVENT, globalHandler);
    window.addEventListener("storage", specificHandler);

    return () => {
      window.removeEventListener(`${ASSET_CHANGE_EVENT}_${profileId}`, specificHandler);
      window.removeEventListener(ASSET_CHANGE_EVENT, globalHandler);
      window.removeEventListener("storage", specificHandler);
    };
  }, [profileId]);

  // Optimistic update. If the server save fails, storeAssetPreferences broadcasts the previous values
  // and the handler above reverts the toggles.
  const updatePreferences = useCallback(
    (newPrefs: NetWorthAssetPreferences) => {
      setPreferences(newPrefs);
      void storeAssetPreferences(newPrefs, profileId);
    },
    [profileId]
  );

  return { preferences, updatePreferences };
}

