"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Google Authentication Error: ${errorParam}`);
      setTimeout(() => {
        router.push(`/login?error=${encodeURIComponent(errorParam)}`);
      }, 3000);
      return;
    }

    if (!code) {
      setError("No authorization code found in URL.");
      setTimeout(() => {
        router.push("/login?error=no_code");
      }, 3000);
      return;
    }

    async function exchangeCode() {
      try {
        // The redirect_uri must match exactly what was sent to Google
        const redirectUri = window.location.origin + "/google-callback";
        const data = await api.googleLoginWithCode(code!, redirectUri);
        
        localStorage.setItem("access_token", data.access_token);
        
        // Track signup/login event
        analytics.track({
          name: "signup_completed",
          properties: {
            signup_source: "google",
          },
        });

        router.push("/");
      } catch (err: any) {
        console.error("Code exchange failed:", err);
        setError(err.message || "Failed to complete Google authentication.");
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(err.message || "exchange_failed")}`);
        }, 3500);
      }
    }

    exchangeCode();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl p-8 lg:p-10 w-full max-w-md z-10 shadow-xl shadow-neutral-200/50 dark:shadow-none animate-slide-up backdrop-blur-xl text-center">
        {error ? (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Authentication Failed</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">{error}</p>
            <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-2">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Completing Sign In</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              Please wait while we connect your Google Account...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    }>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
