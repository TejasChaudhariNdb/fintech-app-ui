"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import ContactSupportModal from "@/components/features/ContactSupportModal";
import SupportArthavi from "@/components/features/SupportArthavi";
import Button from "@/components/ui/Button";
import {
  Unlock,
  CreditCard,
  Smartphone,
  Mail,
  User,
  Trash2,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  ChevronDown,
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
  Users,
  Plus,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePrivacy } from "@/context/PrivacyContext";
import useFcmToken from "@/hooks/useFcmToken";
import { useProfile } from "@/context/ProfileContext";
import Toast from "@/components/ui/Toast";

function SectionCard({
  title,
  subtitle,
  summary,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  summary: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl bg-neutral-100 p-2.5 text-neutral-700 dark:bg-white/10 dark:text-white">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
            <p className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400">
              {summary}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
            {isOpen ? "Hide" : "View"}
          </span>
          <ChevronDown
            size={18}
            className={`text-neutral-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      {isOpen && <div className="border-t border-neutral-200 p-4 dark:border-white/5">{children}</div>}
    </section>
  );
}

function InfoRow({
  title,
  subtitle,
  icon,
  onClick,
  rightSlot,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onClick?: () => void;
  rightSlot?: ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-neutral-100 p-2 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </p>
        </div>
      </div>
      {rightSlot ?? (
        <ChevronRight
          className="shrink-0 text-neutral-300 dark:text-neutral-600"
          size={18}
        />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      {content}
    </div>
  );
}

function cleanErrorMessage(err: any, fallback = "An error occurred"): string {
  let msg = err.message || fallback;
  const startIdx = msg.indexOf("{");
  const endIdx = msg.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      const jsonStr = msg.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed.detail) {
        return parsed.detail;
      }
    } catch {}
  }
  return msg;
}

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
  const [expandedSections, setExpandedSections] = useState({
    account: true,
    familyProfiles: true,
    ai: true,
    security: true,
    app: true,
    danger: true,
  });
  const { permission, requestPermission } = useFcmToken();

  // Family Profile State
  const { profiles, refreshProfiles, setDefault, activeProfileId, changeActiveProfile } = useProfile();
  const [showAddFamilyProfileModal, setShowAddFamilyProfileModal] = useState(false);
  const [familyRelationChoice, setFamilyRelationChoice] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyRelation, setNewFamilyRelation] = useState("");
  const [newFamilyPan, setNewFamilyPan] = useState("");
  const [newFamilyProfileType, setNewFamilyProfileType] = useState("INDIVIDUAL");
  const [isSavingFamilyProfile, setIsSavingFamilyProfile] = useState(false);
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);

  // Archive Modal State
  const [profileToArchive, setProfileToArchive] = useState<any>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchivingInProgress, setIsArchivingInProgress] = useState(false);

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
    refreshProfiles();

    const checkUpdates = async () => {
      try {
        const res = await api.getUnreadUpdatesStatus();
        if (res && res.hasUnread !== undefined) {
          setHasUnreadUpdates(res.hasUnread);
        }
      } catch (e) {
        console.error("Failed to check unread updates status", e);
      }
    };
    checkUpdates();

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
      const msg = cleanErrorMessage(err, "Invalid referral code");
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
    if (activeProfileId === "all") {
      showToast("Reset is disabled when viewing 'All Family'. Please select a specific profile to reset.", "error");
      return;
    }

    const currentProfile = profiles.find(p => String(p.id) === activeProfileId);
    const profileName = currentProfile ? currentProfile.name : "this profile";

    // Confirmation
    const msg =
      type === "ALL"
        ? `⚠️ This will delete ALL portfolio data for profile "${profileName}". This action cannot be undone. Continue?`
        : `⚠️ This will delete ALL ${
            type === "MF" ? "Mutual Fund" : "Stock"
          } data for profile "${profileName}". Continue?`;

    if (!confirm(msg)) return;

    try {
      showToast("Resetting portfolio...", "loading");
      await api.resetPortfolio(type, activeProfileId);
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

  const toggleSection = (
    key: "account" | "familyProfiles" | "ai" | "security" | "app" | "danger",
  ) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getProfileColorClass = (relation: string) => {
    const rel = relation.toUpperCase();
    if (rel === "SELF") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (rel === "MOTHER") return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (rel === "FATHER") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (rel === "SPOUSE") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (rel === "CHILD") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
  };

  const getProfileBadgeColor = (relation: string) => {
    const rel = relation.toUpperCase();
    if (rel === "SELF") return "bg-blue-500";
    if (rel === "MOTHER") return "bg-purple-500";
    if (rel === "FATHER") return "bg-green-500";
    if (rel === "SPOUSE") return "bg-orange-500";
    if (rel === "CHILD") return "bg-yellow-500";
    return "bg-indigo-500";
  };

  const handleRelationChoice = (choice: string) => {
    setFamilyRelationChoice(choice);
    if (choice === "Me") {
      setNewFamilyRelation("Self");
      setNewFamilyName("Self");
      setNewFamilyProfileType("INDIVIDUAL");
    } else if (choice === "Other") {
      setNewFamilyRelation("");
      setNewFamilyName("");
      setNewFamilyProfileType("INDIVIDUAL");
    } else {
      setNewFamilyRelation(choice);
      setNewFamilyName(choice);
      setNewFamilyProfileType("INDIVIDUAL");
    }
  };

  const handleCreateFamilyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim() || !newFamilyRelation.trim()) {
      showToast("Name and Relation are required", "error");
      return;
    }
    setIsSavingFamilyProfile(true);
    try {
      await api.createProfile({
        name: newFamilyName.trim(),
        relation: newFamilyRelation.trim(),
        profile_type: newFamilyProfileType,
        pan: newFamilyPan.trim() || undefined,
      });
      showToast("Profile created successfully", "success");
      setShowAddFamilyProfileModal(false);
      setNewFamilyName("");
      setNewFamilyRelation("");
      setNewFamilyPan("");
      setFamilyRelationChoice("");
      await refreshProfiles();
    } catch (err: any) {
      const msg = cleanErrorMessage(err, "Failed to create profile");
      showToast(msg, "error");
    } finally {
      setIsSavingFamilyProfile(false);
    }
  };

  const handleConfirmArchive = async (id: number) => {
    setIsArchivingInProgress(true);
    try {
      showToast("Deleting profile...", "loading");
      await api.archiveProfile(id);
      showToast("Profile deleted successfully", "success");
      setShowArchiveModal(false);
      setProfileToArchive(null);
      await refreshProfiles();
    } catch (err: any) {
      const msg = cleanErrorMessage(err, "Failed to delete profile");
      showToast(msg, "error");
    } finally {
      setIsArchivingInProgress(false);
    }
  };

  const handleSetDefaultProfile = async (id: number) => {
    try {
      showToast("Setting default profile...", "loading");
      await setDefault(id);
      showToast("Default profile updated", "success");
    } catch (err: any) {
      const msg = cleanErrorMessage(err, "Failed to set default profile");
      showToast(msg, "error");
    }
  };

  const freeChatsLeft = Math.max(0, 15 - userProfile.ai_chats_used);

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Toast Notification */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-900 dark:to-[#0B0E14] border-b border-white/5 px-4 pt-10 pb-6 transition-colors duration-300">
        <div className="mx-auto max-w-3xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-3xl bg-white/15 dark:bg-primary-500/20 flex items-center justify-center text-3xl border border-white/20 dark:border-primary-500/30 backdrop-blur-sm shrink-0">
              <User className="text-white dark:text-primary-400 h-8 w-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-2xl font-bold leading-tight">Profile</h1>
              <p className="text-white/75 dark:text-neutral-400 text-sm mt-1 truncate">
                {userProfile.email || "Loading..."}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-col sm:items-end sm:text-right">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur-sm">
              <p className="font-semibold">
                {userProfile.is_ai_unlocked
                  ? "AI Unlocked"
                  : `${freeChatsLeft} chats left`}
              </p>
              <p className="mt-0.5 text-[10px] text-white/65">AI access</p>
            </div>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("refer-earn-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left text-xs text-white/90 backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <p className="font-semibold">
                Refer &amp; Earn
              </p>
              <p className="mt-0.5 text-[10px] text-white/65">
                {userProfile.referral_count} referred
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-5">
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

        <SectionCard
          title="Account"
          subtitle="Profile details and portfolio import"
          summary={
            userProfile.kyc_nudges.length === 0
              ? "Profile details complete"
              : `${userProfile.kyc_nudges.length} profile field(s) need attention`
          }
          icon={<User size={18} />}
          isOpen={expandedSections.account}
          onToggle={() => toggleSection("account")}
        >
          <div className="space-y-3">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-semibold dark:text-white">
                  Personal Details
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {userProfile.full_name || "Add your name"},{" "}
                    {userProfile.phone_number || "phone pending"},{" "}
                    {userProfile.pan_card || "PAN pending"}
                  </p>
                  {userProfile.kyc_nudges.length === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <CheckCircle size={9} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="text-neutral-300 dark:text-neutral-600" size={18} />
            </button>

            <button
              onClick={() => router.push("/holdings/mutual-funds?import=1")}
              className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-semibold dark:text-white">
                  Import Portfolio Data
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Add mutual funds or stocks to your portfolio
                </p>
              </div>
              <ChevronRight className="text-neutral-300 dark:text-neutral-600" size={18} />
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Family Profiles"
          subtitle="Manage investment profiles for family members"
          summary={`${profiles.length} active profile(s)`}
          icon={<Users size={18} />}
          isOpen={expandedSections.familyProfiles}
          onToggle={() => toggleSection("familyProfiles")}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-white/5">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Active Profiles
              </span>
              <button
                type="button"
                onClick={() => {
                  setFamilyRelationChoice("");
                  setNewFamilyName("");
                  setNewFamilyRelation("");
                  setNewFamilyPan("");
                  setNewFamilyProfileType("INDIVIDUAL");
                  setShowAddFamilyProfileModal(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <Plus size={14} className="stroke-[2.5]" /> Add Profile
              </button>
            </div>

            <div className="space-y-3">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${getProfileBadgeColor(
                        p.relation
                      )}`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {p.name}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border ${getProfileColorClass(
                            p.relation
                          )}`}
                        >
                          {p.relation}
                        </span>
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border bg-neutral-100/50 text-neutral-600 border-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:border-white/5"
                        >
                          {p.profile_type}
                        </span>
                        {p.is_default && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold border border-emerald-500/20">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        PAN: <span className="font-mono">{p.pan || "Not Provided"}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                        {p.portfolio_count !== undefined && p.portfolio_count > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {p.portfolio_count} MF Portfolio{p.portfolio_count > 1 ? "s" : ""}
                          </span>
                        )}
                        {p.holding_count !== undefined && p.holding_count > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {p.holding_count} Stock{p.holding_count > 1 ? "s" : ""}
                          </span>
                        )}
                        {p.goal_count !== undefined && p.goal_count > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {p.goal_count} Goal{p.goal_count > 1 ? "s" : ""}
                          </span>
                        )}

                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center self-end">
                    {!p.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultProfile(p.id)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/15 dark:hover:bg-white/25 text-neutral-700 dark:text-neutral-300 transition-colors"
                      >
                        Make Default
                      </button>
                    )}
                    {!p.is_default && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileToArchive(p);
                          setShowArchiveModal(true);
                        }}
                        className="text-xs font-semibold p-1.5 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Archive Profile"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Security & Privacy"
          subtitle="Visibility, biometric lock, and notifications"
          summary={`${isPrivacyMode ? "Privacy on" : "Privacy off"} • ${appLockEnabled ? "Biometric lock on" : "Biometric lock off"}`}
          icon={<ShieldCheck size={18} />}
          isOpen={expandedSections.security}
          onToggle={() => toggleSection("security")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={togglePrivacyMode}
              className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-white dark:bg-white/10 text-neutral-600 dark:text-white">
                  {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPrivacyMode ? "bg-primary-600" : "bg-neutral-200"}`}
                >
                  <span
                    className={`${isPrivacyMode ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold dark:text-white">Privacy Mode</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {isPrivacyMode ? "Values hidden" : "Values visible"}
                </p>
              </div>
            </button>

            <button
              onClick={toggleAppLock}
              className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-white dark:bg-white/10 text-neutral-600 dark:text-white">
                  {appLockEnabled ? <Lock size={16} /> : <Unlock size={16} />}
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${appLockEnabled ? "bg-primary-600" : "bg-neutral-200"}`}
                >
                  <span
                    className={`${appLockEnabled ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold dark:text-white">Biometric Lock</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {appLockEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </button>

            <button
              onClick={toggleNotifications}
              className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between text-left active:scale-[0.99] transition-all sm:col-span-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-white/10 text-neutral-600 dark:text-white">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">Notifications</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {notificationsEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <div
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notificationsEnabled ? "bg-primary-600" : "bg-neutral-200"}`}
              >
                <span
                  className={`${notificationsEnabled ? "translate-x-4" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm`}
                />
              </div>
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="App & Support"
          subtitle="Appearance, install, support, and app info"
          summary={`${mounted ? (theme === "dark" ? "Dark mode" : "Light mode") : "Theme"} • Help and install options`}
          icon={<Download size={18} />}
          isOpen={expandedSections.app}
          onToggle={() => toggleSection("app")}
        >
          <div className="space-y-3">
            <button
              onClick={() => router.push("/profile/whats-new")}
              className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold dark:text-white">What&apos;s New</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Discover recently released features
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnreadUpdates && (
                  <span className="text-[10px] bg-primary-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                    NEW
                  </span>
                )}
                <ChevronRight className="text-neutral-300 dark:text-neutral-600" size={18} />
              </div>
            </button>

            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                    {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold dark:text-white">Appearance</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {theme === "dark" ? "Dark Mode" : "Light Mode"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-neutral-300 dark:text-neutral-600" size={18} />
              </button>
            )}

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
                className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Download size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Install App
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Add Arthavi to your home screen
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-neutral-300 dark:text-neutral-600" size={18} />
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="AI & Referral"
          subtitle="Free chat usage, unlock status, and referral tools"
          summary={
            userProfile.is_ai_unlocked
              ? "Unlimited AI unlocked"
              : `${freeChatsLeft} of 15 free chats remaining`
          }
          icon={<Gift size={18} />}
          isOpen={expandedSections.ai}
          onToggle={() => toggleSection("ai")}
        >
          <div className="space-y-3">
            <div
              id="refer-earn-section"
              className="bg-linear-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden"
            >
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
                      {freeChatsLeft} Free Chats Left
                    </div>
                  )}
                </div>

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
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95 bg-white/10"
                    >
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
                        className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors shrink-0"
                      >
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
          </div>
        </SectionCard>

        <SectionCard
          title="Danger Zone"
          subtitle="Sensitive actions"
          summary="Reset options are kept separately for safety"
          icon={<Trash2 size={18} />}
          isOpen={expandedSections.danger}
          onToggle={() => toggleSection("danger")}
        >
          <div className="space-y-3">
            {activeProfileId === "all" ? (
              <div className="flex w-full items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-left dark:border-white/5 dark:bg-white/2 opacity-70">
                <div>
                  <p className="text-sm font-semibold text-neutral-400 dark:text-neutral-500">
                    Reset Portfolio (Disabled)
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 leading-snug">
                    Please switch from "All Family" to a specific family member in the header dropdown to reset their data.
                  </p>
                </div>
                <ChevronRight className="text-neutral-300 dark:text-neutral-600 shrink-0" size={18} />
              </div>
            ) : (
              <button
                onClick={() => setShowResetModal(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-red-100 p-4 text-left transition-colors hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/5"
              >
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    Reset Portfolio
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Clear mutual funds, stocks, or everything
                  </p>
                </div>
                <ChevronRight className="text-red-300 dark:text-red-600" size={18} />
              </button>
            )}
          </div>
        </SectionCard>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
        >
          <LogOut size={18} />
          Log Out
        </button>

        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
            More
          </p>

          <InfoRow
            title="Contact Support"
            subtitle="Get help or share feedback"
            icon={<MessageCircle size={18} />}
            onClick={() => setShowContactModal(true)}
          />

          <InfoRow
            title="Your Data is Yours"
            subtitle="Your financial data stays private and encrypted"
            icon={<ShieldCheck size={18} />}
            rightSlot={
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Private
              </span>
            }
          />

          <InfoRow
            title="About Arthavi"
            subtitle="Made with care for Indian investors"
            icon={<ShieldCheck size={18} />}
            rightSlot={
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-mono text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                v1.2.2
              </span>
            }
          />
        </div>

        <SupportArthavi />

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

      {/* Add Family Profile Modal */}
      <Modal
        isOpen={showAddFamilyProfileModal}
        onClose={() => setShowAddFamilyProfileModal(false)}
        title="Add Family Profile"
      >
        <form onSubmit={handleCreateFamilyProfile} className="space-y-5">
          {!familyRelationChoice ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Who is this profile for?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Me", relation: "Self", color: "from-blue-500 to-indigo-500" },
                  { label: "Mother", relation: "Mother", color: "from-purple-500 to-pink-500" },
                  { label: "Father", relation: "Father", color: "from-emerald-500 to-teal-500" },
                  { label: "Spouse", relation: "Spouse", color: "from-orange-500 to-amber-500" },
                  { label: "Child", relation: "Child", color: "from-yellow-500 to-orange-400" },
                  { label: "Other", relation: "Other", color: "from-slate-500 to-neutral-600" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleRelationChoice(option.label)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl border border-neutral-200 dark:border-white/10 hover:border-primary-500 dark:hover:border-primary-500 bg-neutral-50 dark:bg-white/5 transition-all text-center group active:scale-95 duration-150"
                  >
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center text-white font-bold text-xs shadow-md mb-2 group-hover:scale-110 transition-transform`}>
                      {option.label.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/5">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Profile Details for {familyRelationChoice}
                </span>
                <button
                  type="button"
                  onClick={() => setFamilyRelationChoice("")}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline text-left"
                >
                  Change relation
                </button>
              </div>

              {/* Profile Name */}
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  Profile Name
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    required
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="E.g. Mother's Portfolio, or Father's Name"
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Relation */}
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  Relation
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    required
                    value={newFamilyRelation}
                    disabled={familyRelationChoice !== "Other" && familyRelationChoice !== "Me"}
                    onChange={(e) => setNewFamilyRelation(e.target.value)}
                    placeholder="E.g. Mother, Father, Joint, etc."
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Profile Type */}
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  Profile Type
                </label>
                <select
                  value={newFamilyProfileType}
                  onChange={(e) => setNewFamilyProfileType(e.target.value)}
                  required
                  className="w-full px-3 py-3 rounded-xl text-sm transition-all outline-none bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
                >
                  <option value="INDIVIDUAL" className="bg-white dark:bg-[#151A23]">Individual</option>
                  <option value="JOINT" className="bg-white dark:bg-[#151A23]">Joint</option>
                  <option value="CUSTOM" className="bg-white dark:bg-[#151A23]">Custom</option>
                </select>
              </div>

              {/* PAN */}
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                  PAN Card (Optional)
                </label>
                <div className="relative">
                  <CreditCard
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={newFamilyPan}
                    onChange={(e) => setNewFamilyPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none uppercase bg-neutral-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-neutral-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  Optional, used to partition and map portfolios during CAS/CSV import matches.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setFamilyRelationChoice("")}
                  className="flex-1"
                  variant="secondary"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  isLoading={isSavingFamilyProfile}
                  className="flex-1"
                  variant="primary"
                >
                  Create Profile
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Profile Checklist Modal */}
      <Modal
        isOpen={showArchiveModal && !!profileToArchive}
        onClose={() => {
          if (!isArchivingInProgress) {
            setShowArchiveModal(false);
            setProfileToArchive(null);
          }
        }}
        title={`Delete Profile: ${profileToArchive?.name || ""}`}
      >
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200/60 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold">Safety Constraints Check</p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-normal">
                To prevent orphan records and data loss, profiles with active mutual funds, stocks, or financial goals cannot be deleted. Please resolve the issues shown below first.
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {/* Mutual Funds Check */}
            {(() => {
              const activeMfs = profileToArchive?.portfolio_count || 0;
              const isMfClean = activeMfs === 0;
              return (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${isMfClean ? "bg-emerald-500/5 border-emerald-500/25 dark:bg-emerald-500/5 dark:border-emerald-500/20" : "bg-red-500/5 border-red-500/25 dark:bg-red-500/5 dark:border-red-500/20"}`}>
                  <div className="mt-0.5">
                    {isMfClean ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs select-none">
                        ✓
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center font-bold text-xs select-none bg-red-500/10 dark:bg-red-500/20">
                        ✗
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Mutual Fund Portfolios
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {isMfClean ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">All cleared. No active portfolios.</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Found {activeMfs} active portfolio{activeMfs > 1 ? "s" : ""}. Deletion is blocked until they are deleted or re-assigned.
                        </span>
                      )}
                    </p>
                    {!isMfClean && (
                      <button
                        type="button"
                        onClick={() => {
                          changeActiveProfile(String(profileToArchive.id));
                          router.push("/holdings/mutual-funds");
                          setShowArchiveModal(false);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-100 dark:border-primary-500/20"
                      >
                        Unlink/Delete Mutual Funds <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stocks Check */}
            {(() => {
              const activeStocks = profileToArchive?.holding_count || 0;
              const isStocksClean = activeStocks === 0;
              return (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${isStocksClean ? "bg-emerald-500/5 border-emerald-500/25 dark:bg-emerald-500/5 dark:border-emerald-500/20" : "bg-red-500/5 border-red-500/25 dark:bg-red-500/5 dark:border-red-500/20"}`}>
                  <div className="mt-0.5">
                    {isStocksClean ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs select-none">
                        ✓
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center font-bold text-xs select-none bg-red-500/10 dark:bg-red-500/20">
                        ✗
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Stock Holdings
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {isStocksClean ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">All cleared. No active stock holdings.</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Found {activeStocks} active stock holding{activeStocks > 1 ? "s" : ""}. Deletion is blocked until they are deleted or sold.
                        </span>
                      )}
                    </p>
                    {!isStocksClean && (
                      <button
                        type="button"
                        onClick={() => {
                          changeActiveProfile(String(profileToArchive.id));
                          router.push("/holdings/stocks");
                          setShowArchiveModal(false);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-100 dark:border-primary-500/20"
                      >
                        Unlink/Delete Stocks <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Goals Check */}
            {(() => {
              const activeGoals = profileToArchive?.goal_count || 0;
              const isGoalsClean = activeGoals === 0;
              return (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${isGoalsClean ? "bg-emerald-500/5 border-emerald-500/25 dark:bg-emerald-500/5 dark:border-emerald-500/20" : "bg-red-500/5 border-red-500/25 dark:bg-red-500/5 dark:border-red-500/20"}`}>
                  <div className="mt-0.5">
                    {isGoalsClean ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs select-none">
                        ✓
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center font-bold text-xs select-none bg-red-500/10 dark:bg-red-500/20">
                        ✗
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Financial Goals
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {isGoalsClean ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">All cleared. No active goals.</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Found {activeGoals} active goal{activeGoals > 1 ? "s" : ""}. Deletion is blocked until they are deleted or re-assigned.
                        </span>
                      )}
                    </p>
                    {!isGoalsClean && (
                      <button
                        type="button"
                        onClick={() => {
                          changeActiveProfile(String(profileToArchive.id));
                          router.push("/goals");
                          setShowArchiveModal(false);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-100 dark:border-primary-500/20"
                      >
                        Unlink/Delete Goals <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Action Footer */}
          {(() => {
            const activeMfs = profileToArchive?.portfolio_count || 0;
            const activeStocks = profileToArchive?.holding_count || 0;
            const activeGoals = profileToArchive?.goal_count || 0;
            const canArchive = activeMfs === 0 && activeStocks === 0 && activeGoals === 0;

            if (canArchive) {
              return (
                <div className="pt-4 border-t border-neutral-200 dark:border-white/5 space-y-3">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    All safety checks passed. This profile and its inactive configurations will be permanently deleted.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowArchiveModal(false);
                        setProfileToArchive(null);
                      }}
                      className="flex-1"
                      variant="secondary"
                      disabled={isArchivingInProgress}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleConfirmArchive(profileToArchive.id)}
                      className="flex-1 !bg-red-600 hover:!bg-red-700 text-white"
                      variant="primary"
                      isLoading={isArchivingInProgress}
                    >
                      Delete Profile
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="pt-4 border-t border-neutral-200 dark:border-white/5 flex flex-col gap-3">
                <p className="text-xs text-red-500 dark:text-red-400/90 font-medium">
                  Please clear or re-assign all active items listed above to unlock profile deletion.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setShowArchiveModal(false);
                    setProfileToArchive(null);
                  }}
                  className="w-full"
                  variant="secondary"
                >
                  Close Safety Check
                </Button>
              </div>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
}
