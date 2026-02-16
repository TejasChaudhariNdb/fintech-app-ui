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
} from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface OnboardingWizardProps {
  userProfile?: any;
}

export default function OnboardingWizard({
  userProfile,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Intro, 2: Upload
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !password) return;

    setUploading(true);
    setError("");

    try {
      await api.uploadCAS(file, password);
      // Success!
      setTimeout(() => {
        window.location.reload(); // Reload to fetch fresh data and exit onboarding
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Upload failed. Check your password.");
      setUploading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-900/20 rounded-3xl mb-6 shadow-sm ring-1 ring-primary-100 dark:ring-white/10">
              <TrendingUp className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4 tracking-tight">
              Welcome to Arthavi
            </h1>
            <p className="text-xl md:text-2xl font-medium text-neutral-800 dark:text-neutral-200 mb-4 max-w-3xl mx-auto leading-tight">
              The only app you need to track all your{" "}
              <span className="text-primary-600 dark:text-primary-400">
                Mutual Funds
              </span>{" "}
              &{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Stocks
              </span>{" "}
              in one place.
            </p>
            <p className="text-base text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
              Stop juggling multiple platforms. Simplify your wealth journey
              today.
            </p>
          </div>

          {/* Referral Banner (Growth) */}
          {userProfile && !userProfile.is_ai_unlocked && (
            <div className="max-w-xl mx-auto mb-10">
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
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-16">
            {/* Option 1: Mutual Funds */}
            <button
              onClick={() => setStep(2)}
              className="group relative flex flex-col items-start p-6 md:p-8 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300 transform hover:-translate-y-1 text-left h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    Import Mutual Funds
                  </h3>
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm leading-relaxed">
                Upload your CAS PDF to unlock deep analytics, XIRR tracking, and
                automatic portfolio insights.
              </p>
              <div className="mt-auto w-full flex items-center justify-between font-semibold text-primary-600 dark:text-primary-400 text-sm bg-primary-50 dark:bg-primary-500/5 p-3 rounded-xl group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 transition-colors">
                Start Import <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            {/* Option 2: Stocks */}
            <button
              onClick={() => router.push("/holdings/stocks")}
              className="group relative flex flex-col items-start p-6 md:p-8 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 transform hover:-translate-y-1 text-left h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Track Stocks
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Manual / CSV
                  </span>
                </div>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm leading-relaxed">
                Manually add transactions or upload a broker CSV file to manage
                your equity portfolio directly.
              </p>
              <div className="mt-auto w-full flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                Go to Stocks <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>

          {/* Feature Highlights (Restored) */}
          <div className="mb-12">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-400 mb-8">
              Why use Arthavi?
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              <Card className="p-5 border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-[#151A23] transition-colors">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  Track Performance
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Real-time NAV updates and accurate XIRR calculations for all
                  investments.
                </p>
              </Card>
              <Card className="p-5 border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-[#151A23] transition-colors">
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  Unified View
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Consolidate your entire financial portfolio (MFs + Stocks) in
                  one place.
                </p>
              </Card>
            </div>
          </div>

          {/* Privacy Note */}
        </div>
      </div>
    );
  }

  // STEP 2: Upload & Instructions
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-start">
        {/* Helper Column */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Get your Portfolio
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              We use the standard Consolidated Account Statement (CAS) to import
              your history securely.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
              <ExternalLink size={18} />
              How to download CAS?
            </h3>
            <ol className="list-decimal list-outside ml-4 space-y-3 text-sm text-blue-700 dark:text-blue-200/80">
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
                <span className="font-medium">
                  (Includes transaction listing)
                </span>{" "}
                statement type.
              </li>
              <li>
                Select <strong>&quot;Specific Period&quot;</strong> (e.g., from
                Jan 2000 to Today).
              </li>
              <li>Enter your email formatted password.</li>
              <li>
                Download the PDF you receive in your email and upload it here.
              </li>
              <li className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-500/20">
                IMPORTANT: Do NOT upload the &quot;Summary&quot; statement. Only
                the &quot;Detailed&quot; statement has the data needed for
                analysis.
              </li>
            </ol>
          </div>

          <button
            onClick={() => setStep(1)}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline">
            Back to Intro
          </button>
        </div>

        {/* Upload Column */}
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
                PDF format only
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
                      : "border-neutral-300 dark:border-white/20 hover:border-primary-400 dark:hover:border-primary-400"
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
                        Or drag and drop here
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
                placeholder="Enter password"
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
              {uploading ? "Importing Data..." : "Upload & Analyze"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
              <ShieldCheck size={12} className="text-green-500" />
              <span>We don&apos;t store your password or file.</span>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
