"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppLock from "@/components/features/AppLock";
import BottomNav from "@/components/features/BottomNav";
import SideNav from "@/components/features/SideNav";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { useProfile } from "@/context/ProfileContext";
import ProfileSwitcher from "@/components/features/ProfileSwitcher";

import DemoRibbon from "@/components/ui/DemoRibbon";

import ChatWidget from "@/components/features/AIChat/ChatWidget";
import FcmManager from "@/components/FcmManager";
import FeedbackButton from "@/components/features/FeedbackButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeProfileId, activeProfile } = useProfile();
  const [isChecking, setIsChecking] = useState(true);
  const [isLockEnabled, setIsLockEnabled] = useState(false);

  // Update Page Title for GA & UX
  useEffect(() => {
    const getPageTitle = (path: string) => {
      if (path === "/" || path === "/dashboard") return "Dashboard - Arthavi";
      if (path.includes("/holdings/mutual-funds"))
        return "Mutual Funds - Arthavi";
      if (path.includes("/holdings/stocks")) return "Stocks - Arthavi";
      if (path.startsWith("/holdings")) return "Holdings - Arthavi";
      if (path.startsWith("/goals")) return "Goals - Arthavi";
      if (path.startsWith("/transactions")) return "Transactions - Arthavi";
      if (path.startsWith("/profile")) return "Profile - Arthavi";
      return "Arthavi";
    };
    document.title = getPageTitle(pathname);
  }, [pathname]);

  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      const lockSetting = localStorage.getItem("app_lock_enabled");
      if (lockSetting === "true") setIsLockEnabled(true);

      const token = localStorage.getItem("access_token");
      if (
        !token &&
        !pathname.includes("/login") &&
        !pathname.includes("/register")
      ) {
        console.log("No token found, redirecting to login");
        router.push("/login");
      } else {
        console.log("Token found, allowing access");
        if (isChecking) setIsChecking(false);
      }
    }
  }, [router, pathname, isChecking]);

  // Offline Detection
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <PrivacyProvider>
      <AppLock isEnabled={isLockEnabled} onUnlock={() => {}} />
      <div className="min-h-screen lg:flex dark:bg-[#0B0E14] bg-neutral-50 relative transition-colors duration-300">
        <SideNav />
        {/* Main content */}
        <main className="flex-1 pb-32 lg:pb-10 lg:pl-0 max-w-7xl mx-auto w-full">
          <DemoRibbon />

          {/* Top Header Bar */}
          <header className="flex h-16 w-full items-center justify-between border-b border-neutral-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0B0E14]/40 backdrop-blur-md px-4 lg:px-8 sticky top-0 z-30">

            {/* Left: Active Profile Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Viewing:</span>
              <div className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-white/5 px-2.5 py-1 rounded-full border border-neutral-200/60 dark:border-white/10">
                <span className={`w-2 h-2 rounded-full ${
                  activeProfileId === "all"
                    ? "bg-primary-500"
                    : activeProfile?.relation.toUpperCase() === "SELF"
                    ? "bg-blue-500"
                    : activeProfile?.relation.toUpperCase() === "MOTHER"
                    ? "bg-purple-500"
                    : activeProfile?.relation.toUpperCase() === "FATHER"
                    ? "bg-green-500"
                    : activeProfile?.relation.toUpperCase() === "SPOUSE"
                    ? "bg-orange-500"
                    : activeProfile?.relation.toUpperCase() === "CHILD"
                    ? "bg-yellow-500"
                    : "bg-indigo-500"
                }`} />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  {activeProfileId === "all" ? "All Family" : activeProfile?.name}
                </span>
              </div>
            </div>

            {/* Right: Switcher Dropdown */}
            <div className="flex items-center gap-3">
              <ProfileSwitcher />
            </div>
          </header>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2 text-center border-b border-red-500/20 backdrop-blur-md sticky top-0 z-50">
              You are offline. Showing cached data.
            </div>
          )}
          <div className="lg:px-8">{children}</div>
        </main>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
      <ChatWidget />
      <FcmManager />
      <FeedbackButton />
    </PrivacyProvider>
  );
}
