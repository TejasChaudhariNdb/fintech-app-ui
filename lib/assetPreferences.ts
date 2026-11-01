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
 * Saves preferences to localStorage for a specific profile, broadcasts an update event,
 * and syncs to backend to invalidate Redis cache keys immediately.
 */
export function storeAssetPreferences(
  prefs: NetWorthAssetPreferences,
  profileId: string | number = "all",
  syncBackend = true
): void {
  if (typeof window === "undefined") return;

  try {
    const key = getProfileStorageKey(profileId);
    localStorage.setItem(key, JSON.stringify(prefs));
    if (profileId === "all") {
      localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(prefs));
    }
    window.dispatchEvent(
      new CustomEvent(`${ASSET_CHANGE_EVENT}_${profileId}`, { detail: prefs })
    );
    window.dispatchEvent(
      new CustomEvent(ASSET_CHANGE_EVENT, { detail: { profileId, prefs } })
    );

    if (syncBackend) {
      // Async sync to backend to update feature_flags and wipe Redis cache keys
      api.updateAssetPreferences(prefs, profileId).catch((err) => {
        console.warn("Could not sync asset preferences to backend:", err);
      });
    }
  } catch (e) {
    console.error("Error saving asset preferences to localStorage:", e);
  }
}

/**
 * Initial hydration helper from backend User profile.
 * Adopts preferences saved on backend per profile and for family ("all").
 */
export function syncPreferencesFromBackend(
  backendPrefs?: Partial<NetWorthAssetPreferences>,
  byProfile?: Record<string, any>
): void {
  if (typeof window === "undefined") return;
  try {
    if (byProfile && typeof byProfile === "object") {
      for (const [pId, pPrefs] of Object.entries(byProfile)) {
        if (pPrefs && typeof pPrefs === "object") {
          const key = getProfileStorageKey(pId);
          if (!localStorage.getItem(key)) {
            const merged: NetWorthAssetPreferences = {
              mutual_funds: typeof pPrefs.mutual_funds === "boolean" ? pPrefs.mutual_funds : true,
              stocks: typeof pPrefs.stocks === "boolean" ? pPrefs.stocks : true,
              fixed_income: typeof pPrefs.fixed_income === "boolean" ? pPrefs.fixed_income : true,
              gold: typeof pPrefs.gold === "boolean" ? pPrefs.gold : true,
              real_estate: typeof pPrefs.real_estate === "boolean" ? pPrefs.real_estate : true,
              show_insurance_cover: typeof pPrefs.show_insurance_cover === "boolean" ? pPrefs.show_insurance_cover : false,
            };
            storeAssetPreferences(merged, pId, false);
          }
        }
      }
    }

    if (backendPrefs && typeof backendPrefs === "object") {
      const allKey = getProfileStorageKey("all");
      if (!localStorage.getItem(allKey)) {
        const merged: NetWorthAssetPreferences = {
          mutual_funds: typeof backendPrefs.mutual_funds === "boolean" ? backendPrefs.mutual_funds : true,
          stocks: typeof backendPrefs.stocks === "boolean" ? backendPrefs.stocks : true,
          fixed_income: typeof backendPrefs.fixed_income === "boolean" ? backendPrefs.fixed_income : true,
          gold: typeof backendPrefs.gold === "boolean" ? backendPrefs.gold : true,
          real_estate: typeof backendPrefs.real_estate === "boolean" ? backendPrefs.real_estate : true,
          show_insurance_cover: typeof backendPrefs.show_insurance_cover === "boolean" ? backendPrefs.show_insurance_cover : false,
        };
        storeAssetPreferences(merged, "all", false);
      }
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

  const updatePreferences = useCallback(
    (newPrefs: NetWorthAssetPreferences) => {
      setPreferences(newPrefs);
      storeAssetPreferences(newPrefs, profileId);
    },
    [profileId]
  );

  return { preferences, updatePreferences };
}

