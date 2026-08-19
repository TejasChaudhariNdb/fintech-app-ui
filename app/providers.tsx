"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { analytics } from "@/lib/analytics";
import { ProfileProvider } from "@/context/ProfileContext";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.init();

    const handleChunkError = (e: ErrorEvent) => {
      if (
        e?.message?.includes("Loading chunk") ||
        e?.message?.includes("Failed to load chunk")
      ) {
        window.location.reload();
      }
    };
    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);

  // Replace with your actual Google Client ID
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ProfileProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </ProfileProvider>
    </GoogleOAuthProvider>
  );
}

