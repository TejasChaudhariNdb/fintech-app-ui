"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface Profile {
  id: number;
  name: string;
  profile_type: string;
  relation: string;
  pan: string | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
}

interface ProfileContextType {
  profiles: Profile[];
  activeProfileId: string; // "all" or stringified number
  activeProfile: Profile | null; // null represents "all" (All Family)
  loading: boolean;
  refreshProfiles: () => Promise<void>;
  changeActiveProfile: (id: string) => void;
  setDefault: (id: number) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getProfiles();
      setProfiles(data || []);

      // Determine initial active profile
      const activeProfiles = data || [];
      const storedActiveId = localStorage.getItem("active_profile_id");
      
      if (activeProfiles.length <= 1) {
        // Enforce the single profile context when user only has 1 active profile (no family assets to aggregate yet)
        const fallbackId = activeProfiles[0]?.id ? String(activeProfiles[0].id) : "all";
        setActiveProfileId(fallbackId);
        localStorage.setItem("active_profile_id", fallbackId);
      } else if (storedActiveId && (storedActiveId === "all" || activeProfiles.some((p: Profile) => String(p.id) === storedActiveId))) {
        setActiveProfileId(storedActiveId);
      } else {
        // Fallback to "all" (All Family) as the hero context when they have > 1 profile
        setActiveProfileId("all");
        localStorage.setItem("active_profile_id", "all");
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const changeActiveProfile = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem("active_profile_id", id);
    // Clear API cache so that calls retrieve correct profile scope
    api.clearPortfolioCache();
  };

  const setDefault = async (id: number) => {
    try {
      await api.setDefaultProfile(id);
      await fetchProfiles();
    } catch (error) {
      console.error("Failed to set default profile:", error);
      throw error;
    }
  };

  const refreshProfiles = async () => {
    await fetchProfiles();
  };

  // Find active profile details
  const activeProfile =
    activeProfileId === "all"
      ? null
      : profiles.find((p) => String(p.id) === activeProfileId) || null;

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfileId,
        activeProfile,
        loading,
        refreshProfiles,
        changeActiveProfile,
        setDefault,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
