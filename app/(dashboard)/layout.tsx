"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppLock from "@/components/features/AppLock";
import BottomNav from "@/components/features/BottomNav";
import SideNav from "@/components/features/SideNav";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { useProfile } from "@/context/ProfileContext";
import ProfileSwitcher from "@/components/features/ProfileSwitcher";
import { Megaphone } from "lucide-react";
import { api } from "@/lib/api";

import DemoRibbon from "@/components/ui/DemoRibbon";
import { useIsDemo } from "@/lib/hooks/useIsDemo";

import ChatWidget from "@/components/features/AIChat/ChatWidget";
import FcmManager from "@/components/FcmManager";
import FeedbackButton from "@/components/features/FeedbackButton";
import WhatsNewModal from "@/components/features/WhatsNewModal";

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
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);
  const isDemo = useIsDemo();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const checkUnreadUpdates = async () => {
      try {
        const res = await api.getUnreadUpdatesStatus();
        if (res && res.hasUnread !== undefined) {
          setHasUnreadUpdates(res.hasUnread);
        }
      } catch (e) {
        console.error("Failed to check unread updates status", e);
      }
    };
    checkUnreadUpdates();
  }, [pathname]);

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
          <header className={`flex h-16 w-full items-center justify-between border-b border-neutral-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0B0E14]/40 backdrop-blur-md px-4 lg:px-8 sticky z-30 transition-all duration-300 ${isDemo ? 'top-10' : 'top-0'}`}>

            {/* Left: What's New Shortcut */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/profile/whats-new")}
                className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200/60 dark:border-white/10 hover:bg-neutral-100/80 dark:hover:bg-white/5 text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all active:scale-95 group bg-white/50 dark:bg-[#0B0E14]/30 text-xs font-semibold"
                title="What's New"
              >
                <Megaphone className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:scale-105 transition-transform" />
                <span className="hidden sm:inline-block">What&apos;s New</span>
                {hasUnreadUpdates && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary-500 border-2 border-white dark:border-[#0B0E14] rounded-full animate-pulse shadow-sm shadow-primary-500/50" />
                )}
              </button>
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
      <WhatsNewModal />
    </PrivacyProvider>
  );
}
