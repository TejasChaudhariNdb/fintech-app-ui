"use client";

import React, { useState } from "react";

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
  Gift,
  Plus,
} from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !password) return;

    setUploading(true);
    setError("");

    try {
      await api.uploadCAS(file, password);
      // Success!
      setUploading(false);
      setSuccess(true);
      setTimeout(() => {
        window.location.reload(); // Reload to fetch fresh data and exit onboarding
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

          {/* Referral Banner (Growth) */}
          {userProfile && !userProfile.is_ai_unlocked && (
            <div className="max-w-xl mx-auto mb-8">
              <button
                onClick={() => router.push("/profile")}
                className="w-full bg-linear-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Gift size={20} className="text-yellow-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">
                      No holdings yet? Invite friends!
                    </p>
                    <p className="text-xs text-indigo-100">
                      Unlock unlimited AI insights while you set up.
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                  <ArrowRight size={16} />
                </div>
              </button>
            </div>
          )}

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
              className={`space-y-3 text-sm text-blue-700 dark:text-blue-200/80 transition-all overflow-hidden ${showInstructions ? "max-h-[600px] opacity-100 mt-4" : "max-h-0 opacity-0 md:max-h-none md:opacity-100 md:mt-0"}`}>
              <div className="md:hidden text-xs text-blue-600/70 mb-2">
                Tap to see how to download.
              </div>
              <ol className="list-decimal list-outside ml-4 space-y-3">
                <li>
                  Go to{" "}
                  <a
                    href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline hover:text-blue-900 dark:hover:text-blue-100">
                    CAMS Online
                  </a>
                </li>
                <li>
                  Select <strong>&quot;Detailed&quot;</strong>{" "}
                  <span className="font-medium opacity-80 block text-xs">
                    (Includes transaction listing)
                  </span>
                </li>
                <li>
                  Select <strong>&quot;Specific Period&quot;</strong> (e.g., Jan
                  2000 to Today).
                </li>
                <li>Enter your email & set a password.</li>
                <li>Download the PDF from your email.</li>
                <li className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-500/20 mt-2 block">
                  IMPORTANT: Do NOT upload the &quot;Summary&quot; statement.
                </li>
              </ol>
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
                <p className="text-[10px] text-neutral-400 mt-1 ml-1">
                  Usually your PAN number (uppercase) or Date of Birth.
                </p>
              </div>

              <Button
                type="submit"
                isLoading={uploading}
                className="w-full py-3 text-base"
                variant="primary">
                {uploading ? "Importing Data..." : "Import Portfolio"}
              </Button>

              <div className="flex justify-between md:hidden">
                <button
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
