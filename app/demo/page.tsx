"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const initDemo = async () => {
      try {
        // Clear existing session first to ensure clean demo start
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_email");

        const email = process.env.NEXT_PUBLIC_DEMO_EMAIL || "";
        const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";

        if (!email || !password) {
          throw new Error(
            "Demo credentials not configured in environment (NEXT_PUBLIC_DEMO_EMAIL/PASSWORD)",
          );
        }

        const data = await api.login(email, password);
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_email", email);

        // Add a flag so we can maybe show a welcome banner or tour later
        sessionStorage.setItem("is_demo_session", "true");

        router.replace("/");
      } catch (err: any) {
        console.error("Demo login failed", err);
        setError(
          "Failed to initialize demo. Please try again or login manually.",
        );
        // Fallback to login after a delay if it fails
        setTimeout(() => router.replace("/login"), 3000);
      }
    };

    initDemo();
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-[#0B0E14]">
        <div className="text-center p-6">
          <p className="text-red-500 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-[#0B0E14]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-6" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          Setting up Demo Account...
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Preparing a sample portfolio for you to explore.
        </p>
      </div>
    </div>
  );
}
