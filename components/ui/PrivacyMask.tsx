"use client";

import React from "react";
import { usePrivacy } from "@/context/PrivacyContext";

interface PrivacyMaskProps {
  children: React.ReactNode;
  className?: string;
  blurStrength?: "sm" | "md" | "lg" | "xl";
}

export default function PrivacyMask({
  children,
  className = "",
  blurStrength = "sm",
}: PrivacyMaskProps) {
  const { isPrivacyMode } = usePrivacy();

  const blurClass = {
    sm: "blur-sm",
    md: "blur-md",
    lg: "blur-lg",
    xl: "blur-xl",
  }[blurStrength];

  return (
    <span
      className={`transition-all duration-300 ${
        isPrivacyMode ? `${blurClass} select-none` : ""
      } ${className}`}>
      {children}
    </span>
  );
}
