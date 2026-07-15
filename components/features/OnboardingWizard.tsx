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
} from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false); // Success state
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false); // Toggle instructions
  const [signupSource, setSignupSource] = useState("other");
  const [userEmail, setUserEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = userProfile || await api.getUserProfile();
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
    if (!file || !password) return;
    if (!selectedProfileId) {
      setError("Please select a specific profile to import data into.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      await api.uploadCAS(file, password, selectedProfileId);
      
      // Track portfolio creation event
      analytics.track({
        name: "portfolio_created",
        properties: { source: "cams", asset_count: 0 },
      });

      // Success!
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
      setError(err.message || "Upload failed. Check your password.");
      setUploading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in text-neutral-900 dark:text-white">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-900/20 rounded-3xl mb-6 shadow-sm ring-1 ring-primary-100 dark:ring-white/10">
              <TrendingUp className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Welcome to Arthavi
            </h1>
            <p className="text-xl md:text-2xl font-medium text-neutral-600 dark:text-neutral-300 mb-4 max-w-3xl mx-auto leading-tight">
              One place for all your{" "}
              <span className="text-primary-600 dark:text-primary-400">
                Mutual Funds
              </span>{" "}
              &{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Stocks
              </span>
              .
            </p>
          </div>



          {/* Main Actions */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto mb-12">
            {/* Option 1: Mutual Funds */}
            <button
              onClick={() => setStep(2)}
              className="group relative flex flex-col text-left p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300">
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <FileText size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Import Portfolio (CAMS)
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 grow">
                Upload your detailed CAS PDF to verify and track all mutual
                funds instantly.
              </p>
              <div className="w-full flex items-center justify-between font-semibold text-primary-600 dark:text-primary-400 text-sm">
                Start Import{" "}
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Option 2: Stocks */}
            <button
              onClick={() => router.push("/holdings/stocks")}
              className="group relative flex flex-col text-left p-6 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                  Manual
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Track Stocks
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 grow">
                Manually add transactions or upload a CSV to track your equity
                portfolio.
              </p>
              <div className="w-full flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                Add Stocks{" "}
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Marketing Attribution Chips */}
          <div className="max-w-xl mx-auto mt-12 text-center animate-fade-in border-t border-neutral-200/50 dark:border-white/5 pt-6">
            <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3.5">
              How did you hear about us?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Reddit", value: "reddit" },
                { label: "YouTube", value: "youtube" },
                { label: "Google Search", value: "google" },
                { label: "X / Twitter", value: "twitter" },
                { label: "Other", value: "other" },
              ].map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => handleSignupSource(source.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 cursor-pointer ${
                    signupSource === source.value
                      ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/25"
                      : "border-neutral-200 dark:border-white/10 hover:border-neutral-350 dark:hover:border-white/20 bg-white dark:bg-[#151A23] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 shadow-xs"
                  }`}>
                  {source.label}
                </button>
              ))}
            </div>
          </div>
        </div>
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
          Import Successful!
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-sm">
          We are analyzing your portfolio. You will be redirected shortly...
        </p>
      </div>
    );
  }

  // STEP 2: Upload & Instructions
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-4xl w-full">
        {/* Header - Moved to Top for Mobile Visibility */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Get your Portfolio
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            We use the standard Consolidated Account Statement (CAS) from CAMS
            to securely import your full history.
          </p>

          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 md:p-6 text-left">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between text-left font-semibold text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-2">
                <ExternalLink size={18} />
                Don&apos;t have your CAS PDF?
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-500/20 px-2 py-1 rounded">
                {showInstructions ? "Hide" : "View Steps"}
              </span>
            </button>

            <div
              className={`space-y-4 text-sm text-neutral-700 dark:text-neutral-300 transition-all overflow-hidden ${showInstructions ? "max-h-[800px] opacity-100 mt-4" : "max-h-0 opacity-0 md:max-h-none md:opacity-100 md:mt-0"}`}>
              {userEmail && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-100/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200/40 dark:border-blue-900/30">
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Registered Email to request CAS</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-200 truncate mt-0.5">{userEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition-colors">
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

              <div className="space-y-3">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Step 1: Open the CAMS registry site</p>
                <a
                  href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-white/10 rounded-xl font-bold text-xs text-neutral-800 dark:text-neutral-200 transition-all text-center">
                  CAMS Online <ExternalLink size={12} />
                </a>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Step 2: Request the statement</p>
                <ol className="list-decimal list-outside ml-4 space-y-2 text-xs md:text-sm text-blue-900/80 dark:text-blue-200/80">
                  <li>
                    Select <strong>&quot;Detailed&quot;</strong> (do NOT select Summary).
                  </li>
                  <li>
                    Select <strong>&quot;Specific Period&quot;</strong> (e.g. from <strong>Jan 2000 to Today</strong> to fetch your full history).
                  </li>
                  <li>
                    Paste your copied email, set a PDF password of your choice, and submit.
                  </li>
                  <li>
                    Within 5 minutes, download the PDF from your email and upload it below.
                  </li>
                  <li className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30 mt-2 block text-xs">
                    ⚠️ IMPORTANT: Do NOT upload the &quot;Summary&quot; statement. It must be the &quot;Detailed&quot; statement to include transaction history.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Column (Centered) */}
        <div className="max-w-xl mx-auto">
          <Card className="p-6 md:p-8 border border-neutral-200 dark:border-white/5 shadow-xl shadow-neutral-200/50 dark:shadow-none bg-white dark:bg-[#151A23]">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="text-center mb-6">
                <div className="mx-auto h-12 w-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Upload CAS File
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Import your &quot;Detailed&quot; CAS PDF
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
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
                  className="w-full bg-neutral-50 dark:bg-black/20 border border-transparent focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all dark:text-white"
                >
                  <option value="" disabled>Select Target Profile</option>
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
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    required
                  />
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                      file
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-neutral-300 dark:border-white/20 hover:border-primary-400 dark:hover:border-400"
                    }`}>
                    {file ? (
                      <>
                        <div className="p-2 bg-primary-100 dark:bg-primary-500/20 rounded-full mb-2">
                          <CheckCircle
                            className="text-primary-600 dark:text-primary-400"
                            size={20}
                          />
                        </div>
                        <p className="font-medium text-neutral-900 dark:text-white text-center break-all text-sm">
                          {file.name}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                          Tap to change
                        </p>
                      </>
                    ) : (
                      <>
                        <Download className="text-neutral-400 mb-2" size={24} />
                        <p className="font-medium text-neutral-900 dark:text-white text-sm mb-1">
                          Select PDF
                        </p>
                        <p className="text-xs text-neutral-400 text-center">
                          Or drag & drop
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
                  placeholder="********"
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

              <Button
                type="submit"
                isLoading={uploading}
                className="w-full py-3 text-base"
                variant="primary">
                {uploading ? "Importing Data..." : "Import Portfolio"}
              </Button>

              <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 px-3 py-2">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Need help uploading CAS?
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <a
                    href="https://wa.me/919158110065"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                    WhatsApp
                  </a>
                  <span className="text-neutral-300 dark:text-neutral-600">|</span>
                  <a
                    href="mailto:arthaviapp@gmail.com"
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                    Email Support
                  </a>
                </div>
              </div>

              <div className="flex justify-between md:hidden">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline mt-2">
                  Back
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2 border-t border-neutral-100 dark:border-white/5">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>We don&apos;t store your password or file.</span>
              </div>
            </form>
          </Card>

          <div className="hidden md:flex items-center justify-between mt-6">
            {onClose ? (
              <button
                onClick={onClose}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline">
                Cancel
              </button>
            ) : (
              <button
                onClick={() => setStep(1)}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline">
                Back to Intro
              </button>
            )}

            {onAddTransactionClick && (
              <button
                onClick={onAddTransactionClick}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 px-3 py-2 rounded-lg transition-colors">
                <Plus size={16} /> Manual Entry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
