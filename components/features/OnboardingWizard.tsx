"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  TrendingUp,
  ShieldCheck,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Plus,
  Copy,
  Check,
  FileSpreadsheet,
  Zap,
  Sparkles,
} from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import AddTransactionModal from "./AddTransactionModal";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";

interface OnboardingWizardProps {
  userProfile?: any;
  initialStep?: number;
  onAddTransactionClick?: () => void;
  onClose?: () => void;
}

export default function OnboardingWizard({
  userProfile,
  initialStep = 1,
  onAddTransactionClick,
  onClose,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep); // 1: Intro, 2: Upload
  const [file, setFile] = useState<File | null>(null);
  const [uploadFormat, setUploadFormat] = useState<"CAS" | "CSV">("CAS");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [signupSource, setSignupSource] = useState("other");
  const [userEmail, setUserEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Track step shown
  useEffect(() => {
    analytics.track({
      name: "onboarding_step_shown",
      properties: {
        step: step,
        step_name: step === 1 ? "choose_method" : "upload_statement",
      },
    });
    if (step === 2) {
      analytics.track({
        name: "import_screen_viewed",
        properties: { source: "onboarding_wizard" },
      });
    }
  }, [step]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = userProfile || (await api.getUserProfile());
        if (profile?.signup_source) {
          setSignupSource(profile.signup_source);
        }
        if (profile?.email) {
          setUserEmail(profile.email);
        }
      } catch (e) {
        console.error("Failed to load user profile in wizard", e);
      }
    };
    fetchProfile();
  }, [userProfile]);

  const handleCopyEmail = () => {
    if (!userEmail) return;
    navigator.clipboard.writeText(userEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignupSource = async (value: string) => {
    setSignupSource(value);
    try {
      await api.updateUserProfile({ signup_source: value });
      api.clearCache(["user-profile"]);
    } catch (err) {
      console.error("Failed to update signup source", err);
    }
  };

  const { profiles, activeProfileId } = useProfile();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    if (activeProfileId && activeProfileId !== "all") return activeProfileId;
    return profiles[0]?.id ? String(profiles[0].id) : "";
  });

  useEffect(() => {
    if (profiles.length > 0) {
      if (activeProfileId && activeProfileId !== "all") {
        setSelectedProfileId(activeProfileId);
      } else if (!selectedProfileId) {
        setSelectedProfileId(String(profiles[0].id));
      }
    }
  }, [profiles, activeProfileId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (uploadFormat === "CAS" && !password) return;
    if (!selectedProfileId) {
      setError("Please select a specific profile to import data into.");
      return;
    }

    setUploading(true);
    setError("");

    analytics.track({
      name: "cas_upload_started",
      properties: {
        format: uploadFormat,
        file_size: file.size,
      },
    });

    try {
      if (uploadFormat === "CAS") {
        await api.uploadCAS(file, password, selectedProfileId);
      } else {
        await api.importMFTransactionsCSV(file, selectedProfileId);
      }

      analytics.track({
        name: "cas_upload_succeeded",
        properties: { format: uploadFormat },
      });

      analytics.track({
        name: "portfolio_created",
        properties: {
          source: uploadFormat === "CAS" ? "cams" : "csv",
          asset_count: 1,
        },
      });

      analytics.track({
        name: "activation_completed",
        properties: {
          activation_type: "mf",
          source: uploadFormat === "CAS" ? "cams" : "csv",
        },
      });

      analytics.track({
        name: "onboarding_step_completed",
        properties: {
          step: 2,
          method: uploadFormat === "CAS" ? "cams" : "csv",
        },
      });

      setUploading(false);
      setSuccess(true);
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
        router.replace("/holdings/mutual-funds");
        router.refresh();
      }, 2000);
    } catch (err: any) {
      const errorMsg =
        err.message ||
        (uploadFormat === "CAS"
          ? "Upload failed. Check your password."
          : "Upload failed. Check your CSV file format.");
      setError(errorMsg);
      analytics.track({
        name: "cas_upload_failed",
        properties: {
          format: uploadFormat,
          reason: errorMsg,
        },
      });
      setUploading(false);
    }
  };

  const handleManualSuccess = (customMsg?: string) => {
    analytics.track({
      name: "portfolio_created",
      properties: { source: "manual", asset_count: 1 },
    });
    analytics.track({
      name: "activation_completed",
      properties: { activation_type: "mf", source: "manual" },
    });
    analytics.track({
      name: "onboarding_step_completed",
      properties: { step: 1, method: "manual" },
    });
    setShowManualModal(false);
    if (onClose) onClose();
    router.replace("/holdings/mutual-funds");
    router.refresh();
  };

  if (step === 1) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 py-8 animate-fade-in text-neutral-900 dark:text-white">
        <div className="max-w-4xl w-full">
          {/* Hero Header */}
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 text-primary-700 dark:text-primary-300 text-xs font-bold mb-4 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span>Activation in under 60 seconds</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">
              Welcome to Arthavi
            </h1>
            <p className="text-base md:text-xl font-medium text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
              Choose how you want to build your portfolio. You can import your complete history or start by adding a single holding.
            </p>
          </div>

          {/* High Conversion Action Cards */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto mb-10">
            {/* Card 1: Instant Quick Search (Fastest) */}
            <div
              onClick={() => {
                if (onAddTransactionClick) {
                  onAddTransactionClick();
                } else {
                  setShowManualModal(true);
                }
              }}
              className="group relative flex flex-col p-6 bg-gradient-to-b from-primary-500/[0.07] to-transparent bg-white dark:bg-[#151A23] border-2 border-primary-500/40 dark:border-primary-500/30 rounded-3xl hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-500/15 transition-all duration-300 cursor-pointer text-left">
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="h-12 w-12 bg-primary-100 dark:bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Zap size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white bg-primary-600 px-2.5 py-1 rounded-full shadow-sm">
                  ⚡ Fastest • 15s
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Add Holding Instantly
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mb-6 grow leading-relaxed">
                Search any Mutual Fund or Stock by name and see live returns &amp; XIRR immediately.
              </p>
              <div className="w-full flex items-center justify-between font-bold text-primary-600 dark:text-primary-400 text-sm pt-2 border-t border-primary-100 dark:border-white/5">
                <span>Search &amp; Add</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: CAMS CAS Import */}
            <div
              onClick={() => {
                setStep(2);
                setUploadFormat("CAS");
              }}
              className="group relative flex flex-col p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer text-left">
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <FileText size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 rounded-full">
                  All History
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Import CAS Statement
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mb-6 grow leading-relaxed">
                Upload your CAMS / KFintech PDF to sync all your mutual funds from day one.
              </p>
              <div className="w-full flex items-center justify-between font-bold text-blue-600 dark:text-blue-400 text-sm pt-2 border-t border-neutral-100 dark:border-white/5">
                <span>Upload CAS PDF</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Broker CSV / Stocks */}
            <div
              onClick={() => {
                router.push("/holdings/stocks");
              }}
              className="group relative flex flex-col p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer text-left">
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 rounded-full">
                  Equities
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Track Direct Stocks
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mb-6 grow leading-relaxed">
                Import trades from Zerodha, Groww, INDmoney or add stock transactions manually.
              </p>
              <div className="w-full flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400 text-sm pt-2 border-t border-neutral-100 dark:border-white/5">
                <span>Add Stocks</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Demo Preview Option */}
          <div className="text-center mb-8">
            <button
              type="button"
              onClick={() => {
                analytics.track({ name: "auth_demo_clicked" });
                router.push("/demo");
              }}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-colors cursor-pointer py-1 px-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5">
              <span>Want to preview first?</span>
              <span className="text-primary-600 dark:text-primary-400 underline font-bold">
                Explore Demo Dashboard with sample data →
              </span>
            </button>
          </div>

          {/* Marketing Attribution Chips */}
          <div className="max-w-xl mx-auto text-center border-t border-neutral-200/60 dark:border-white/5 pt-6">
            <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
              How did you hear about Arthavi?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Reddit", value: "reddit" },
                { label: "YouTube", value: "youtube" },
                { label: "Google Search", value: "google" },
                { label: "X / Twitter", value: "twitter" },
                { label: "Friend / Referral", value: "other" },
              ].map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => handleSignupSource(source.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-95 cursor-pointer ${
                    signupSource === source.value
                      ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                      : "border-neutral-200 dark:border-white/10 hover:border-neutral-350 dark:hover:border-white/20 bg-white dark:bg-[#151A23] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5"
                  }`}>
                  {source.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inline Manual Add Modal */}
        {showManualModal && (
          <AddTransactionModal
            isOpen={showManualModal}
            onClose={() => setShowManualModal(false)}
            onSuccess={handleManualSuccess}
            initialTab="MANUAL"
          />
        )}
      </div>
    );
  }

  // SUCCESS STATE
  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-fade-in text-center">
        <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Import Successful! 🚀
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-sm">
          We have calculated your portfolio values and analytics. Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  // STEP 2: Upload & Instructions
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 py-8 animate-fade-in">
      <div className="max-w-4xl w-full">
        {/* Step Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/5">
            ← Back to Options
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Prefer manual entry?</span>
            <button
              type="button"
              onClick={() => {
                if (onAddTransactionClick) {
                  onAddTransactionClick();
                } else {
                  setShowManualModal(true);
                }
              }}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer">
              <Zap size={12} /> Add in 15 seconds
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Import CAS Statement
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            We use the standard Consolidated Account Statement (CAS) from CAMS to securely import your full mutual fund history with zero manual work.
          </p>

          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 md:p-6 text-left">
            <div className="flex items-center justify-between text-left font-bold text-blue-900 dark:text-blue-200 mb-3">
              <span className="flex items-center gap-2">
                <ExternalLink size={18} className="text-blue-600 dark:text-blue-400" />
                How to get your free CAMS Statement:
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                Takes 60 seconds
              </span>
            </div>

            <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
              {userEmail && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-100/50 dark:bg-blue-950/40 rounded-xl border border-blue-200/50 dark:border-blue-900/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                      Your registered email for CAS
                    </p>
                    <p className="text-sm font-bold text-blue-950 dark:text-blue-100 truncate mt-0.5">
                      {userEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shrink-0">
                    {copied ? (
                      <>
                        <Check size={14} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Email
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white/80 dark:bg-black/20 p-3.5 rounded-xl border border-blue-100 dark:border-white/5 space-y-2">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">
                    Step 1: Open CAMS Online
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    Click below to open the official CAMS statement generator page.
                  </p>
                  <a
                    href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded-lg transition-all text-center cursor-pointer shadow-sm">
                    Open CAMS Online <ExternalLink size={12} />
                  </a>
                </div>

                <div className="bg-white/80 dark:bg-black/20 p-3.5 rounded-xl border border-blue-100 dark:border-white/5 space-y-2">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">
                    Step 2: Select Statement Options
                  </p>
                  <ul className="text-xs space-y-1 text-neutral-600 dark:text-neutral-300">
                    <li>• Select <strong>&quot;Detailed&quot;</strong> (do not select Summary)</li>
                    <li>• Period: <strong>&quot;Specific Period&quot;</strong> (Jan 2000 to Today)</li>
                    <li>• Paste your email and set any password of your choice</li>
                    <li>• Download the PDF from your inbox within 5 mins</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Column (Centered) */}
        <div className="max-w-xl mx-auto">
          <Card className="p-6 md:p-8 border border-neutral-200 dark:border-white/5 shadow-xl shadow-neutral-200/50 dark:shadow-none bg-white dark:bg-[#151A23]">
            <form onSubmit={handleUpload} className="space-y-6">
              {/* Format Toggle */}
              <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUploadFormat("CAS");
                    setFile(null);
                    setError("");
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    uploadFormat === "CAS"
                      ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}>
                  <FileText className="w-4 h-4" />
                  CAS Statement (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadFormat("CSV");
                    setFile(null);
                    setError("");
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    uploadFormat === "CSV"
                      ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  Transaction CSV
                </button>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {uploadFormat === "CAS" ? "Upload Detailed CAS PDF" : "Upload Transaction CSV"}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {uploadFormat === "CAS"
                    ? "Upload your password-protected CAS statement from CAMS / KFintech"
                    : "Upload mutual fund transactions from spreadsheet or broker export"}
                </p>
              </div>

              {uploadFormat === "CSV" && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3">
                  <span>Columns: Date, Scheme Name, Type (Buy/SIP/Sell), Units, NAV, Amount.</span>
                  <a
                    href="/assets/mf_transaction_template.csv"
                    download="mf_transaction_template.csv"
                    className="flex items-center gap-1 font-semibold bg-white dark:bg-white/10 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors shrink-0 shadow-sm">
                    <Download size={12} />
                    Sample CSV
                  </a>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle size={16} />
                    <span>Upload issue:</span>
                  </div>
                  <p className="pl-6">{error}</p>
                  {uploadFormat === "CAS" && (
                    <p className="pl-6 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      💡 Tip: CAMS PDF password is the custom password you entered when requesting the statement, or your PAN in UPPERCASE.
                    </p>
                  )}
                </div>
              )}

              {/* Target Profile Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Import Into Profile
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  required
                  className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all dark:text-white">
                  <option value="" disabled>
                    Select Target Profile
                  </option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="relative">
                  <input
                    type="file"
                    accept={uploadFormat === "CAS" ? ".pdf" : ".csv"}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    required
                  />
                  <div
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                      file
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-neutral-300 dark:border-white/20 hover:border-primary-400 dark:hover:border-primary-400"
                    }`}>
                    {file ? (
                      <>
                        <div className="p-2 bg-primary-100 dark:bg-primary-500/20 rounded-full mb-2">
                          <CheckCircle className="text-primary-600 dark:text-primary-400" size={20} />
                        </div>
                        <p className="font-bold text-neutral-900 dark:text-white text-center break-all text-sm">
                          {file.name}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                          Tap to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <Download className="text-neutral-400 mb-2" size={24} />
                        <p className="font-bold text-neutral-900 dark:text-white text-sm mb-1">
                          {uploadFormat === "CAS" ? "Choose CAS PDF File" : "Choose CSV File"}
                        </p>
                        <p className="text-xs text-neutral-400 text-center">
                          Click to browse or drag &amp; drop
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {uploadFormat === "CAS" && (
                <div className="relative">
                  <Input
                    label="PDF Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password set on CAMS portal"
                    required
                    className="dark:bg-black/20 dark:border-white/10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                isLoading={uploading}
                className="w-full py-3.5 text-base font-bold shadow-lg shadow-primary-500/20"
                variant="primary">
                {uploading ? "Analyzing & Importing..." : "Import Portfolio"}
              </Button>

              <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 px-3.5 py-2.5">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Need help uploading CAS?
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <a
                    href="https://wa.me/919158110065"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                    WhatsApp Support
                  </a>
                  <span className="text-neutral-300 dark:text-neutral-600">|</span>
                  <a
                    href="mailto:arthaviapp@gmail.com"
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                    Email Support
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2 border-t border-neutral-100 dark:border-white/5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Zero spam. We never sell your financial data.</span>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* Inline Manual Add Modal */}
      {showManualModal && (
        <AddTransactionModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onSuccess={handleManualSuccess}
          initialTab="MANUAL"
        />
      )}
    </div>
  );
}
