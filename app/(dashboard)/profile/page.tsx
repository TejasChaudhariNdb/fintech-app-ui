"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import ContactSupportModal from "@/components/features/ContactSupportModal";
import Button from "@/components/ui/Button";
import {
  Unlock,
  CreditCard,
  Smartphone,
  Mail,
  User,
  FileText,
  Trash2,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Download,
  Lock,
  Bell,
  MessageCircle,
  Copy,
  Gift,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePrivacy } from "@/context/PrivacyContext";
import useFcmToken from "@/hooks/useFcmToken";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [mounted, setMounted] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { permission, requestPermission } = useFcmToken();

  // Profile State
  const [userProfile, setUserProfile] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    pan_card: "",
    referral_code: "",
    referral_count: 0,
    ai_chats_used: 0,
    is_ai_unlocked: false,
    feature_flags: {} as Record<string, boolean>,
    referred_by: "",
    profile_completion_score: 0,
    kyc_nudges: [] as Array<{ key: string; title: string; message: string }>,
  });
  const [referralInput, setReferralInput] = useState("");
  const [referralError, setReferralError] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<any>(null); // For cancel

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as any,
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" | "info" = "info",
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
  };

  useEffect(() => {
    setMounted(true);
    // Check initial state
    const lock = localStorage.getItem("app_lock_enabled") === "true";
    setAppLockEnabled(lock);
    const optedOut = localStorage.getItem("fcm_opt_out") === "true";
    const allowed =
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted";
    setNotificationsEnabled(allowed && !optedOut);

    loadUserProfile();

    // PWA Install Prompt Listener
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const ios = /iphone|ipad|ipod/i.test(ua);
      const standalone =
        (window.matchMedia &&
          window.matchMedia("(display-mode: standalone)").matches) ||
        (navigator as any).standalone === true;
      setIsIos(ios);
      setIsStandalone(standalone);

      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationsEnabled(false);
      return;
    }
    const optedOut = localStorage.getItem("fcm_opt_out") === "true";
    if (permission === "granted" && !optedOut) {
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  }, [permission]);

  const loadUserProfile = async () => {
    try {
      const data = await api.getUserProfile();
      setUserProfile({
        email: data.email || "",
        full_name: data.full_name || "",
        phone_number: data.phone_number || "",
        pan_card: data.pan_card || "",
        referral_code: data.referral_code || "",
        referral_count: data.referral_count || 0,
        ai_chats_used: data.ai_chats_used || 0,
        feature_flags: data.feature_flags || {},
        is_ai_unlocked: data.feature_flags?.ai_unlocked || false,
        referred_by: data.referred_by || "",
        profile_completion_score: data.profile_completion_score || 0,
        kyc_nudges: data.kyc_nudges || [],
      });
      setOriginalProfile(data);
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.updateUserProfile({
        full_name: userProfile.full_name,
        phone_number: userProfile.phone_number,
        pan_card: userProfile.pan_card,
      });
      showToast("Profile updated successfully", "success");
      setShowProfileModal(false); // Close modal on success
      await loadUserProfile();
    } catch (err: any) {
      showToast("Failed to update profile", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCloseProfileModal = () => {
    // Reset to original values on close
    if (originalProfile) {
      setUserProfile({
        email: originalProfile.email || "",
        full_name: originalProfile.full_name || "",
        phone_number: originalProfile.phone_number || "",
        pan_card: originalProfile.pan_card || "",
        referral_code: originalProfile.referral_code || "",
        referral_count: originalProfile.referral_count || 0,
        ai_chats_used: originalProfile.ai_chats_used || 0,
        feature_flags: originalProfile.feature_flags || {},
        is_ai_unlocked: originalProfile.feature_flags?.ai_unlocked || false,
        referred_by: originalProfile.referred_by || "",
        profile_completion_score: originalProfile.profile_completion_score || 0,
        kyc_nudges: originalProfile.kyc_nudges || [],
      });
    }
    setShowProfileModal(false);
  };

  const toggleAppLock = async () => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      showToast("Biometrics not supported", "error");
      return;
    }

    if (appLockEnabled) {
      setAppLockEnabled(false);
      localStorage.setItem("app_lock_enabled", "false");
      showToast("Biometric Lock Disabled", "success");
      return;
    }

    try {
      showToast("Verifying identity...", "loading");
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "SMF Tracker" },
          user: {
            id: userId,
            name: "owner",
            displayName: "Owner",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      });

      setAppLockEnabled(true);
      localStorage.setItem("app_lock_enabled", "true");
      showToast("Biometric Lock Enabled", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Setup failed or cancelled", "error");
    }
  };

  const toggleNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("Notifications not supported", "error");
      return;
    }

    if (notificationsEnabled) {
      localStorage.setItem("fcm_opt_out", "true");
      setNotificationsEnabled(false);
      showToast("Notifications Disabled", "success");
      return;
    }

    localStorage.removeItem("fcm_opt_out");
    await requestPermission();
    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      showToast("Notifications Enabled", "success");
    } else if (Notification.permission === "denied") {
      showToast("Notification permission denied", "error");
    }
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) return;
    setIsApplyingReferral(true);
    setReferralError("");
    try {
      const res = await api.applyReferralCode(referralInput.trim());
      if (res.status === "already_applied") {
        setReferralError("You have already applied a referral code.");
        showToast("You have already applied a referral code.", "info");
      } else {
        showToast(
          "Referral code applied! Premium features unlocked.",
          "success",
        );
        loadUserProfile(); // Refresh to show unlocked status
        setReferralInput("");
      }
    } catch (err: any) {
      let msg = err.message || "Invalid referral code";
      try {
        // Try to parse JSON error if it comes as stringified JSON
        if (msg.startsWith("{")) {
          const parsed = JSON.parse(msg);
          msg = parsed.detail || msg;
        }
      } catch (e) {
        // ignore parse error
      }
      setReferralError(msg);
      showToast(msg, "error");
    } finally {
      setIsApplyingReferral(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  };

  const handleLogout = () => {
    showToast("Logging out...", "loading");
    // Clear Auth
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");

    // Clear Dashboard Cache (to prevent showing old data on next login)
    localStorage.removeItem("net-worth");
    localStorage.removeItem("portfolio-summary");
    localStorage.removeItem("goals");
    localStorage.removeItem("portfolio-history");
    localStorage.removeItem("xirr");
    localStorage.removeItem("insights");
    // Also clear app lock setting just in case? Or keep it? Keeping it is usually better UX.

    setTimeout(() => router.push("/login"), 500);
  };

  const handleReset = async (type: "ALL" | "MF" | "STOCKS" = "ALL") => {
    // Confirmation
    const msg =
      type === "ALL"
        ? "⚠️ This will delete ALL portfolio data. This action cannot be undone. Continue?"
        : `⚠️ This will delete ALL ${
            type === "MF" ? "Mutual Fund" : "Stock"
          } data. Continue?`;

    if (!confirm(msg)) return;

    try {
      showToast("Resetting portfolio...", "loading");
      await api.resetPortfolio(type);
      showToast(
        `${type === "ALL" ? "Portfolio" : type} reset successfully`,
        "success",
      );
      setShowResetModal(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showToast("Reset failed: " + err.message, "error");
    }
  };

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-900 dark:to-[#0B0E14] border-b border-white/5 px-4 pt-12 pb-8 transition-colors duration-300">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-primary-500/20 flex items-center justify-center text-3xl border border-white/30 dark:border-primary-500/30 backdrop-blur-sm shrink-0">
              <User className="text-white dark:text-primary-400 h-8 w-8" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Profile</h1>
              <p className="text-white/80 dark:text-neutral-400 text-sm mt-1">
                {userProfile.email || "Loading..."}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              document
                .getElementById("refer-earn-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors text-xs font-medium text-white backdrop-blur-sm shrink-0">
            <Gift size={14} className="text-yellow-300" />
            Refer &amp; Earn
          </button>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {userProfile.kyc_nudges.length > 0 && (
          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Profile {userProfile.profile_completion_score}% complete
                </p>
                <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden mt-2">
                  <div
                    className="h-full bg-linear-to-r from-primary-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${userProfile.profile_completion_score}%`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {userProfile.kyc_nudges.map((nudge) => (
                    <span
                      key={nudge.key}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Missing {nudge.key === "pan_card" ? "PAN" : "Phone"}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/25 transition-colors shrink-0">
                Complete
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">
            Account
          </p>
          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            {/* Personal Details */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <User size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm dark:text-white">
                    Personal Details
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Name, Phone, PAN
                    </p>
                    {userProfile.kyc_nudges.length === 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle size={9} />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight
                className="text-neutral-300 dark:text-neutral-600"
                size={18}
              />
            </button>

            {/* Upload CAS */}
            <button
              onClick={() => router.push("/holdings/mutual-funds?import=1")}
              className="w-full flex items-center justify-between p-4 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm dark:text-white">
                    Upload CAS Statement
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Import mutual fund data
                  </p>
                </div>
              </div>
              <ChevronRight
                className="text-neutral-300 dark:text-neutral-600"
                size={18}
              />
            </button>
          </div>
        </div>

        {/* ── PREFERENCES ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">
            Preferences
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Appearance toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                    {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                  </div>
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${theme === "dark" ? "bg-primary-600" : "bg-neutral-200"}`}>
                    <span
                      className={`${theme === "dark" ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">
                    Appearance
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </p>
                </div>
              </button>
            )}

            {/* Privacy */}
            <button
              onClick={togglePrivacyMode}
              className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                  {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPrivacyMode ? "bg-primary-600" : "bg-neutral-200"}`}>
                  <span
                    className={`${isPrivacyMode ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold dark:text-white">
                  Privacy Mode
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {isPrivacyMode ? "Values Hidden" : "Values Visible"}
                </p>
              </div>
            </button>

            {/* Biometric */}
            <button
              onClick={toggleAppLock}
              className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                  {appLockEnabled ? <Lock size={16} /> : <Unlock size={16} />}
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${appLockEnabled ? "bg-primary-600" : "bg-neutral-200"}`}>
                  <span
                    className={`${appLockEnabled ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold dark:text-white">
                  Biometric Lock
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {appLockEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </button>

            {/* Notifications */}
            <button
              onClick={toggleNotifications}
              className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                  <Bell size={16} />
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notificationsEnabled ? "bg-primary-600" : "bg-neutral-200"}`}>
                  <span
                    className={`${notificationsEnabled ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold dark:text-white">
                  Notifications
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {notificationsEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ── MORE ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 px-1">
            More
          </p>
          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            {/* Contact Support */}
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <MessageCircle size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm dark:text-white">
                    Contact Support
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Get help or share feedback
                  </p>
                </div>
              </div>
              <ChevronRight
                className="text-neutral-300 dark:text-neutral-600"
                size={18}
              />
            </button>

            {/* Install App (conditional) */}
            {(deferredPrompt || (isIos && !isStandalone)) && (
              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === "accepted") setDeferredPrompt(null);
                  } else if (isIos) {
                    setShowInstallModal(true);
                  }
                }}
                className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Download size={18} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                      Install App
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Add to home screen
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="text-neutral-300 dark:text-neutral-600"
                  size={18}
                />
              </button>
            )}

            {/* About / Version */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm dark:text-white">
                    About Arthavi
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Made with ❤️ for Indian investors
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full">
                v1.2.2
              </span>
            </div>
          </div>
        </div>

        {/* Data Privacy Promise */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldCheck
            className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
            size={18}
          />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Your Data is Yours
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              We don&apos;t sell your data. We don&apos;t spam. Your financial
              data is encrypted.
            </p>
          </div>
        </div>

        {/* Refer & Earn Card */}
        <div
          id="refer-earn-section"
          className="bg-linear-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-20 h-20 bg-black/10 rounded-full blur-xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="text-yellow-300" size={20} />
                <h2 className="text-lg font-bold">Refer &amp; Earn</h2>
              </div>
              {userProfile.is_ai_unlocked ? (
                <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-white/30">
                  <Unlock size={10} /> Premium Unlocked
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/30">
                  {5 - userProfile.ai_chats_used} Free Chats Left
                </div>
              )}
            </div>

            <p className="text-indigo-100 text-xs mb-4 max-w-sm leading-relaxed">
              Invite friends to Arthavi. Get unlimited AI chats and unlock
              upcoming premium features for both of you!
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-indigo-200 uppercase font-semibold mb-1 tracking-wider">
                  Your Code
                </p>
                <code className="text-xl font-mono font-bold tracking-wider">
                  {userProfile.referral_code || "..."}
                </code>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => copyToClipboard(userProfile.referral_code)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95 bg-white/10">
                  <Copy size={16} />
                </button>
                <div className="text-[10px] text-indigo-200 flex items-center gap-1">
                  <User size={10} />
                  <span>{userProfile.referral_count} referred</span>
                </div>
              </div>
            </div>

            {!userProfile.referred_by && !userProfile.is_ai_unlocked && (
              <div className="flex flex-col gap-1">
                <div className="bg-black/20 rounded-xl p-1 flex items-center">
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => {
                      setReferralInput(e.target.value);
                      setReferralError("");
                    }}
                    placeholder="Enter friend's code"
                    className="bg-transparent border-none text-white placeholder:text-white/40 text-xs focus:ring-0 w-full px-3 py-1.5"
                  />
                  <button
                    onClick={handleApplyReferral}
                    disabled={isApplyingReferral || !referralInput.trim()}
                    className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors shrink-0">
                    {isApplyingReferral ? "..." : "Apply"}
                  </button>
                </div>
                {referralError && (
                  <p className="text-[10px] text-red-300 px-2 font-medium bg-red-500/10 rounded-md py-0.5">
                    {referralError}
                  </p>
                )}
              </div>
            )}
            {userProfile.referred_by && (
              <div className="text-[10px] text-indigo-200 flex items-center gap-1 mt-2">
                <CheckCircle size={10} className="text-green-400" />
                Referred by {userProfile.referred_by}
              </div>
            )}
          </div>
        </div>

        {/* ── DANGER ZONE ── */}
        <div>
          <p className="text-xs font-semibold text-red-400/70 dark:text-red-500/60 uppercase tracking-widest mb-2 px-1">
            Danger Zone
          </p>
          <div className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-red-50 dark:active:bg-red-500/5 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                  <Trash2 size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                    Reset Portfolio
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Clear MF, Stocks, or Everything
                  </p>
                </div>
              </div>
              <ChevronRight
                className="text-red-300 dark:text-red-600"
                size={18}
              />
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400">
                <LogOut size={18} />
              </div>
              <p className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
                Log Out
              </p>
            </button>
          </div>
        </div>

        <div className="h-2" />
      </div>

      {/* Profile Edit Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={handleCloseProfileModal}
        title="Personal Details">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl mb-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <User size={20} />
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              Update your personal information accurately.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
              Full Name
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={userProfile.full_name}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, full_name: e.target.value })
                }
                placeholder="Enter your name"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="email"
                disabled
                value={userProfile.email}
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-neutral-100 dark:bg-white/5 border border-transparent text-neutral-500 dark:text-neutral-400 cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                Phone Number
              </label>
              <div className="relative">
                <Smartphone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="tel"
                  value={userProfile.phone_number}
                  onChange={(e) =>
                    setUserProfile({
                      ...userProfile,
                      phone_number: e.target.value,
                    })
                  }
                  placeholder="+91..."
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            {/* PAN */}
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                PAN Card
              </label>
              <div className="relative">
                <CreditCard
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={userProfile.pan_card}
                  onChange={(e) =>
                    setUserProfile({
                      ...userProfile,
                      pan_card: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="ABCDE1234F"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none uppercase bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              isLoading={isSavingProfile}
              className="w-full"
              variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contact Support Modal */}
      <ContactSupportModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      {/* Reset Portfolio Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Portfolio Data">
        <div className="p-1 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl text-sm text-red-700 dark:text-red-300 mb-4">
            <p className="font-bold flex items-center gap-2 mb-1">
              <Trash2 size={16} /> Warning: Irreversible Action
            </p>
            <p>
              Deleting data helps you start fresh, but explicitly entered
              transactions or imported files will be lost forever.
            </p>
          </div>

          <div className="grid gap-3">
            <button
              onClick={() => handleReset("MF")}
              className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors text-left">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Reset Mutual Funds
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Clear all folios, schemes, and SIPs
                </p>
              </div>
              <ChevronRight className="text-neutral-400" size={18} />
            </button>

            <button
              onClick={() => handleReset("STOCKS")}
              className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors text-left">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Reset Stocks
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Clear all equity holdings and trades
                </p>
              </div>
              <ChevronRight className="text-neutral-400" size={18} />
            </button>

            <button
              onClick={() => handleReset("ALL")}
              className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-left group">
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-400 group-hover:text-red-800 dark:group-hover:text-red-300">
                  Reset Everything
                </h3>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  Delete ALL portfolio data completely
                </p>
              </div>
              <Trash2 className="text-red-500 dark:text-red-400" size={18} />
            </button>
          </div>
        </div>
      </Modal>

      {/* iOS Install Modal */}
      <Modal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        title="Install Arthavi on iPhone">
        <div className="space-y-5">
          {/* Header banner */}
          <div className="bg-linear-to-r from-indigo-500/15 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/15 border border-indigo-200/60 dark:border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
              <Download size={16} className="text-white" />
            </div>
            <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-snug">
              Open this page in <span className="font-semibold">Safari</span>,
              then follow these 3 steps to add Arthavi to your Home Screen.
            </p>
          </div>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5">
              <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">
                    Tap the Share button
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Bottom toolbar in Safari (box with arrow pointing up)
                  </p>
                </div>
              </div>
              <div className="relative mx-3 mb-3 rounded-xl overflow-hidden ring-2 ring-indigo-400/60">
                <img
                  src="/ios_add/first.PNG"
                  alt="Safari share button"
                  className="w-full object-cover"
                  style={{ height: "160px", objectPosition: "50% 75%" }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-indigo-600/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                  ↑ Tap Share here
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="w-0.5 h-3 bg-neutral-200 dark:bg-white/15 rounded-full" />
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5">
              <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">
                    Tap{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      &quot;More&quot;
                    </span>{" "}
                    in the share sheet
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Scroll right in the second row of icons
                  </p>
                </div>
              </div>
              <div className="relative mx-3 mb-3 rounded-xl overflow-hidden ring-2 ring-emerald-400/60">
                <img
                  src="/ios_add/second.jpg"
                  alt="Share sheet with More option"
                  className="w-full object-cover object-center"
                  style={{ height: "110px" }}
                />
                <div className="absolute inset-0 bg-linear-to-l from-emerald-600/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                  Tap More →
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="w-0.5 h-3 bg-neutral-200 dark:bg-white/15 rounded-full" />
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5">
              <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">
                    Tap{" "}
                    <span className="text-amber-600 dark:text-amber-400">
                      &quot;Add to Home Screen&quot;
                    </span>
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Then tap &quot;Add&quot; in the top-right corner to confirm
                  </p>
                </div>
              </div>
              <div className="relative mx-3 mb-3 rounded-xl overflow-hidden ring-2 ring-amber-400/60">
                <img
                  src="/ios_add/third.PNG"
                  alt="Add to Home Screen option"
                  className="w-full object-cover"
                  style={{ height: "160px", objectPosition: "50% 55%" }}
                />
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-amber-500/10 pointer-events-none" />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                  ← Tap this
                </div>
              </div>
            </div>
          </div>

          {/* Footer tip */}
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-white/5 rounded-xl px-3 py-2.5 border border-neutral-100 dark:border-white/5">
            <span className="text-sm">💡</span>
            <p>
              After adding, open Arthavi from your Home Screen for the full app
              experience.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
