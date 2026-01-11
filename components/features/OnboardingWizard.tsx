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
} from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import { api } from "@/lib/api";

export default function OnboardingWizard() {
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="max-w-2xl w-full">
          <div className="mb-8">
            <div className="h-20 w-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <TrendingUp className="h-10 w-10 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Welcome to SMF Tracker
            </h1>
            <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
              Your journey to wealth mastery starts here. Import your portfolio
              to get comprehensive insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-10 text-left">
            <Card className="p-4 border border-neutral-200 dark:border-white/5">
              <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                Track Performance
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Real-time NAV updates and accurate XIRR calculations.
              </p>
            </Card>
            <Card className="p-4 border border-neutral-200 dark:border-white/5">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                Unified View
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                See all your mutual funds and stocks in one dashboard.
              </p>
            </Card>
            <Card className="p-4 border border-neutral-200 dark:border-white/5">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                Data Privacy
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Your data parses locally and stays secure on your instance.
              </p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setStep(2)}
              variant="primary"
              className="px-8 py-4 text-lg rounded-xl shadow-xl shadow-primary-500/20">
              <FileText className="mr-2 h-5 w-5" />
              Import Portfolio (CAS)
            </Button>
          </div>
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
                Select <strong>&quot;Detailed&quot;</strong> statement type.
              </li>
              <li>
                Select <strong>&quot;Specific Period&quot;</strong> (e.g., from
                Jan 2000 to Today) to get your full history.
              </li>
              <li>Enter your email formatted password.</li>
              <li>
                Download the PDF you receive in your email and upload it here.
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
