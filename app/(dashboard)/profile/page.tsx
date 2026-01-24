"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePrivacy } from "@/context/PrivacyContext";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [mounted, setMounted] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Profile State
  const [userProfile, setUserProfile] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    pan_card: "",
  });
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

    loadUserProfile();

    // PWA Install Prompt Listener
    if (typeof window !== "undefined") {
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const data = await api.getUserProfile();
      setUserProfile({
        email: data.email || "",
        full_name: data.full_name || "",
        phone_number: data.phone_number || "",
        pan_card: data.pan_card || "",
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
      setOriginalProfile(userProfile);
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

  const handleLogout = () => {
    showToast("Logging out...", "loading");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setTimeout(() => router.push("/login"), 500);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !password) return;

    setUploading(true);
    showToast("Processing CAS file...", "loading");
    try {
      await api.uploadCAS(file, password);
      setShowUploadModal(false);
      setFile(null);
      setPassword("");
      showToast("CAS uploaded successfully!", "success");
      // Delay refresh to show toast
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
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
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-primary-500/20 flex items-center justify-center text-3xl border border-white/30 dark:border-primary-500/30 backdrop-blur-sm">
            <User className="text-white dark:text-primary-400 h-8 w-8" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Profile</h1>
            <p className="text-white/80 dark:text-neutral-400 text-sm mt-1">
              {userProfile.email || "Loading..."}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {/* Actions Group */}
        <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
          {/* Personal Details Button */}
          <button
            onClick={() => {
              setShowProfileModal(true);
            }}
            className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <User size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">
                  Personal Details
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Name, Phone, PAN
                </p>
              </div>
            </div>
            <ChevronRight className="text-neutral-400" size={20} />
          </button>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                {mounted && theme === "dark" ? (
                  <Moon size={20} />
                ) : (
                  <Sun size={20} />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">Appearance</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {mounted && theme === "dark" ? "Dark Mode" : "Light Mode"}
                </p>
              </div>
            </div>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  theme === "dark" ? "bg-primary-600" : "bg-neutral-200"
                }`}>
                <span
                  className={`${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            )}
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">Privacy Mode</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {isPrivacyMode
                    ? "Prices & Values Hidden"
                    : "Prices & Values Visible"}
                </p>
              </div>
            </div>
            <button
              onClick={togglePrivacyMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isPrivacyMode ? "bg-primary-600" : "bg-neutral-200"
              }`}>
              <span
                className={`${
                  isPrivacyMode ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>

          {/* App Lock Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                {appLockEnabled ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">Biometric Lock</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {appLockEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAppLock}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                appLockEnabled ? "bg-primary-600" : "bg-neutral-200"
              }`}>
              <span
                className={`${
                  appLockEnabled ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white">
                <FileText size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold dark:text-white">
                  Upload CAS Statement
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Import mutual fund data
                </p>
              </div>
            </div>
            <ChevronRight className="text-neutral-400" size={20} />
          </button>

          {deferredPrompt && (
            <button
              onClick={async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") {
                  setDeferredPrompt(null);
                }
              }}
              className="w-full flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/5 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    Install App
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Add to home screen
                  </p>
                </div>
              </div>
              <ChevronRight className="text-neutral-400" size={20} />
            </button>
          )}

          <button
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center justify-between p-4 active:bg-neutral-50 dark:active:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                <Trash2 size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  Reset Portfolio
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Clear MF, Stocks, or Everything
                </p>
              </div>
            </div>
            <ChevronRight className="text-neutral-400" size={20} />
          </button>
        </div>

        {/* Data Privacy Promise */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldCheck
            className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
            size={20}
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

        {/* App Info */}
        <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3 dark:text-white">About</h3>
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <p>Version 1.2.1</p>
            <p>Made with ❤️ for Indian investors</p>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="danger"
          className="w-full flex items-center justify-center gap-2">
          <LogOut size={18} />
          Logout
        </Button>
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

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload CAS">
        {/* ... existing upload modal content ... */}
        <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl mb-4 text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">How to get your CAS?</p>
          <p>
            Download detailed statement from{" "}
            <a
              href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement"
              target="_blank"
              className="underline font-bold"
              rel="noreferrer">
              CAMS Online
            </a>
            . Select &quot;Detailed&quot; and specific period.
          </p>
        </div>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3 text-neutral-700 dark:text-neutral-300">
              Upload Statement (PDF)
            </label>

            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                id="cas-file-upload"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                required
              />
              <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                  file
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                    : "border-neutral-300 dark:border-white/20 hover:border-primary-400 dark:hover:border-primary-400"
                }`}>
                {file ? (
                  <>
                    <div className="p-3 bg-primary-100 dark:bg-primary-500/20 rounded-full mb-3">
                      <FileText
                        className="text-primary-600 dark:text-primary-400"
                        size={24}
                      />
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-white text-center break-all">
                      {file.name}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                      Tap to change
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-neutral-100 dark:bg-white/10 rounded-full mb-3">
                      <FileText
                        className="text-neutral-500 dark:text-neutral-400"
                        size={24}
                      />
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                      Tap to select PDF
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                      Select the CAS PDF sent by CAMS/KFintech
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <Input
              label="PDF Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter PDF password"
              required
              className="dark:bg-black/20 dark:border-white/10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500 dark:text-neutral-400 -mt-2">
            <ShieldCheck size={12} className="text-green-500" />
            <span>
              Files are processed securely. We don&apos;t store your password.
            </span>
          </div>

          <Button
            type="submit"
            isLoading={uploading}
            className="w-full"
            variant="primary">
            {uploading ? "Uploading..." : "Upload CAS"}
          </Button>
        </form>
      </Modal>

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
    </div>
  );
}
