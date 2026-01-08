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
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as any,
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" = "info"
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
  };

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
            <p>Version 1.0.0</p>
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
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              Select CAS PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-500/10 dark:file:text-primary-400 hover:file:bg-primary-100 dark:hover:file:bg-primary-500/20"
              required
            />
          </div>

          <Input
            label="PDF Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password"
            required
            className="dark:bg-black/20 dark:border-white/10"
          />

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
