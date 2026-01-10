"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Initialize with value from localStorage if available
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("privacy_mode");
      return saved === "true";
    }
    return false;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("privacy_mode", String(isPrivacyMode));
  }, [isPrivacyMode]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => !prev);
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}
