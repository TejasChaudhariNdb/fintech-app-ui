"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { analytics } from "@/lib/analytics";
import { ProfileProvider } from "@/context/ProfileContext";
import { isChunkLoadError, reloadOnceForNewBuild } from "@/lib/chunkReload";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.init();

    // BUG-069: a deploy removes the old build's files. Reload once to load the new build, whether
    // the failure arrives as an error event or as a rejected promise (dynamic imports).
    const handleChunkError = (e: ErrorEvent) => {
      if (isChunkLoadError(e?.error) || isChunkLoadError(e?.message)) {
        reloadOnceForNewBuild();
      }
    };
    const handleChunkRejection = (e: PromiseRejectionEvent) => {
      if (isChunkLoadError(e?.reason)) {
        reloadOnceForNewBuild();
      }
    };
    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleChunkRejection);
    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleChunkRejection);
    };
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

