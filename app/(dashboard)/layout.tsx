"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppLock from "@/components/features/AppLock";
import BottomNav from "@/components/features/BottomNav";
import SideNav from "@/components/features/SideNav";
import { PrivacyProvider } from "@/context/PrivacyContext";

import DemoRibbon from "@/components/ui/DemoRibbon";

import ChatWidget from "@/components/features/AIChat/ChatWidget";
import FcmManager from "@/components/FcmManager";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
      if (path.startsWith("/activity")) return "Activity - Arthavi";
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
    </PrivacyProvider>
  );
}
