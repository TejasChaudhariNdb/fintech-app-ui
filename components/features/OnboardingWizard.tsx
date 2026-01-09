"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FileText, TrendingUp, ShieldCheck } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

export default function OnboardingWizard() {
  const router = useRouter();

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
            Your journey to wealth mastery starts here. Import your portfolio to
            get comprehensive insights.
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
            onClick={() => router.push("/profile")}
            variant="primary"
            className="px-8 py-4 text-lg rounded-xl shadow-xl shadow-primary-500/20">
            <FileText className="mr-2 h-5 w-5" />
            Import Portfolio (CAS)
          </Button>
          <Button
            onClick={() => {}} // Placeholder for Manual Add if implemented
            variant="outline"
            className="px-8 py-4 text-lg rounded-xl"
            disabled>
            Add Manually (Coming Soon)
          </Button>
        </div>
      </div>
    </div>
  );
}
