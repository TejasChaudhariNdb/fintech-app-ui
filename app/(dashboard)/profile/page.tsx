"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
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
  Unlock,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePrivacy } from "@/context/PrivacyContext";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [mounted, setMounted] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as any,
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" | "info" = "info"
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
  };

  useEffect(() => {
    setMounted(true);
    // Check initial state
    const lock = localStorage.getItem("app_lock_enabled") === "true";
    setAppLockEnabled(lock);

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

  const toggleAppLock = () => {
    const newState = !appLockEnabled;
    setAppLockEnabled(newState);
    localStorage.setItem("app_lock_enabled", String(newState));
    showToast(`App Lock ${newState ? "Enabled" : "Disabled"}`, "success");
  };

  const email =
    typeof window !== "undefined" ? localStorage.getItem("user_email") : "";

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

  const handleReset = async () => {
    if (
      !confirm(
        "⚠️ This will delete ALL portfolio data. This action cannot be undone. Continue?"
      )
    ) {
      return;
    }

    try {
      showToast("Resetting portfolio...", "loading");
      await api.resetPortfolio();
      showToast("Portfolio reset successfully", "success");
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
              {email}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {/* Actions Group */}
        <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
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
                  {isPrivacyMode ? "Balances Hidden" : "Balances Visible"}
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
            onClick={handleReset}
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
                  Clear all data
                </p>
              </div>
            </div>
            <ChevronRight className="text-neutral-400" size={20} />
          </button>
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

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload CAS">
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
    </div>
  );
}
