"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { analytics } from "@/lib/analytics";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.init();
  }, []);

  // Replace with your actual Google Client ID
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

