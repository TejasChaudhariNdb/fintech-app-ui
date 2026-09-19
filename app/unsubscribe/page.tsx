"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Bell,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  FileText,
  Lock,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/api";

type NotificationPreferences = {
  masked_email: string;
  token: string;
  email_daily_nudge: boolean;
  email_weekly_summary: boolean;
  email_product_updates: boolean;
  email_marketing: boolean;
  email_security_alerts: boolean;
  email_cas_reports: boolean;
  push_daily_nudge: boolean;
  push_market_predictions: boolean;
  push_product_updates: boolean;
  push_security_alerts: boolean;
  unsubscribed_all_marketing: boolean;
  unsubscribe_reason: string | null;
  unsubscribed_at: string | null;
};

const UNENSUBSCRIBE_REASONS = [
  { value: "too_frequent", label: "Emails are sent too frequently" },
  { value: "not_relevant", label: "Content is not relevant to me" },
  { value: "use_app_only", label: "I check my portfolio directly in the app" },
  { value: "no_longer_investing", label: "I am no longer actively investing" },
  { value: "too_many_emails", label: "My inbox is too crowded" },
  { value: "other", label: "Other reason" },
];

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [showSurvey, setShowSurvey] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    masked_email: "your account",
    token: "",
    email_daily_nudge: true,
    email_weekly_summary: true,
    email_product_updates: true,
    email_marketing: true,
    email_security_alerts: true,
    email_cas_reports: true,
    push_daily_nudge: true,
    push_market_predictions: true,
    push_product_updates: true,
    push_security_alerts: true,
    unsubscribed_all_marketing: false,
    unsubscribe_reason: null,
    unsubscribed_at: null,
  });

  useEffect(() => {
    async function loadPreferences() {
      if (!token) {
        // If no token, attempt to check if logged in
        try {
          const authPrefs = await api.getNotificationPreferences();
          setPrefs({
            ...authPrefs,
            masked_email: authPrefs.email,
          });
          setLoading(false);
          return;
        } catch {
          setError("No valid unsubscribe token found. Please use the link provided in your email.");
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        const data = await api.getPublicNotificationPreferences(token);
        setPrefs(data);
        if (data.unsubscribe_reason) {
          setSelectedReason(data.unsubscribe_reason);
        }
      } catch (err: any) {
        setError(err.message || "Invalid or expired link. Please try opening the link from your latest email.");
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [token]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      // If user toggles any marketing email ON, clear the global unsubscribed flag
      if (
        !prev[key] &&
        (key === "email_daily_nudge" ||
          key === "email_weekly_summary" ||
          key === "email_product_updates" ||
          key === "email_marketing")
      ) {
        updated.unsubscribed_all_marketing = false;
      }
      return updated;
    });
    setSuccessMessage(null);
  };

  const handleSavePreferences = async (customPrefs?: NotificationPreferences, reason?: string) => {
    setSaving(true);
    setSuccessMessage(null);
    setError(null);

    const payload = customPrefs || prefs;
    const finalReason = reason !== undefined ? reason : selectedReason;

    try {
      if (token) {
        const res = await api.updatePublicNotificationPreferences({
          ...payload,
          token,
          unsubscribe_reason: finalReason || null,
        });
        setPrefs(res);
      } else {
        const res = await api.updateNotificationPreferences({
          ...payload,
          unsubscribe_reason: finalReason || null,
        });
        setPrefs({
          ...res,
          masked_email: res.email,
        });
      }
      setSuccessMessage("Your email & notification preferences have been saved successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleOneClickUnsubscribeAll = async () => {
    const updated: NotificationPreferences = {
      ...prefs,
      unsubscribed_all_marketing: true,
      email_daily_nudge: false,
      email_weekly_summary: false,
      email_product_updates: false,
      email_marketing: false,
    };
    setPrefs(updated);
    setShowSurvey(true);
    await handleSavePreferences(updated, selectedReason);
  };

  const handleResubscribeAll = async () => {
    const updated: NotificationPreferences = {
      ...prefs,
      unsubscribed_all_marketing: false,
      email_daily_nudge: true,
      email_weekly_summary: true,
      email_product_updates: true,
      email_marketing: true,
      email_cas_reports: true,
      email_security_alerts: true,
    };
    setPrefs(updated);
    setShowSurvey(false);
    await handleSavePreferences(updated, "");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Loading your preferences...
        </p>
      </div>
    );
  }

  if (error && !prefs.token && !prefs.masked_email) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-900/40 dark:bg-neutral-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          Link Expired or Invalid
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {error}
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row justify-center">
          <Link
            href="https://app.arthavi.com"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-500"
          >
            Go to Arthavi App <ArrowRight size={16} />
          </Link>
          <a
            href="mailto:support@arthavi.com"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Main Card */}
      <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/90">
        
        {/* Header Banner */}
        <div className="border-b border-neutral-100 bg-linear-to-br from-indigo-900 via-indigo-950 to-neutral-950 p-6 sm:p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-white/10">
                <Mail size={20} />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                Arthavi Email Settings
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
              <ShieldCheck size={14} /> Verified Subscriber
            </span>
          </div>

          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Manage Email &amp; Notification Preferences
          </h1>
          <p className="mt-2 text-sm text-indigo-200/80">
            Customize which emails you receive for <strong className="text-white font-semibold">{prefs.masked_email}</strong>. You are always in full control.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Status Banners */}
          {successMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="text-sm font-medium">{successMessage}</div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={20} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          {/* Quick Action Master Box */}
          <div className={`rounded-2xl border p-5 transition-all ${
            prefs.unsubscribed_all_marketing
              ? "border-amber-300/80 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20"
              : "border-neutral-200 bg-neutral-50/60 dark:border-white/5 dark:bg-white/5"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-neutral-900 dark:text-white">
                    {prefs.unsubscribed_all_marketing
                      ? "Unsubscribed from All Non-Critical Emails"
                      : "Unsubscribe from All Marketing Emails"}
                  </span>
                  {prefs.unsubscribed_all_marketing && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Active Opt-Out
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {prefs.unsubscribed_all_marketing
                    ? "You will only receive critical transactional emails (like Password Reset and CAS verification)."
                    : "Pause all daily nudges, weekly summaries, and product updates with 1 click."}
                </p>
              </div>

              {prefs.unsubscribed_all_marketing ? (
                <button
                  type="button"
                  onClick={handleResubscribeAll}
                  disabled={saving}
                  className="shrink-0 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary-500 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Resubscribe to All"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOneClickUnsubscribeAll}
                  disabled={saving}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition-all hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/50 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Unsubscribing..." : "Unsubscribe from All"}
                </button>
              )}
            </div>

            {/* Optional Reason Survey */}
            {(showSurvey || prefs.unsubscribed_all_marketing) && (
              <div className="mt-4 pt-4 border-t border-neutral-200/80 dark:border-white/10">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Help us improve (Optional): Why are you unsubscribing?
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedReason}
                    onChange={(e) => {
                      setSelectedReason(e.target.value);
                      handleSavePreferences(undefined, e.target.value);
                    }}
                    className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    <option value="">Select a reason...</option>
                    {UNENSUBSCRIBE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Granular Preferences Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Customize Specific Email Channels
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Toggle exactly what you want in your inbox.
              </p>
            </div>

            <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-neutral-900/50">
              
              {/* Daily Nudge */}
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="mt-0.5 rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      Daily Market &amp; Portfolio Nudge
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Morning market brief and end-of-day portfolio movement highlights.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.email_daily_nudge && !prefs.unsubscribed_all_marketing}
                    onChange={() => handleToggle("email_daily_nudge")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Weekly Summary */}
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="mt-0.5 rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      Weekly Wealth Snapshot
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Every Sunday: total gains, stock &amp; MF performance breakdown, and net worth insights.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.email_weekly_summary && !prefs.unsubscribed_all_marketing}
                    onChange={() => handleToggle("email_weekly_summary")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Product Updates */}
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="mt-0.5 rounded-xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <Bell size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      Product Releases &amp; New Features
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Be the first to know about new tools, AI insights, and tracker improvements.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.email_product_updates && !prefs.unsubscribed_all_marketing}
                    onChange={() => handleToggle("email_product_updates")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* CAS Statement & Reports */}
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="mt-0.5 rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      CAS Import Confirmations &amp; Reports
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Automated receipts and notifications when your statements are parsed and synced.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.email_cas_reports}
                    onChange={() => handleToggle("email_cas_reports")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Security & Login Alerts */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-neutral-50/50 dark:bg-white/2">
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="mt-0.5 rounded-xl bg-neutral-100 p-2.5 text-neutral-700 dark:bg-white/10 dark:text-neutral-300">
                    <Lock size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        Security &amp; Account Protection
                      </span>
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-white/10 dark:text-neutral-300">
                        Important
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Login alerts, password changes, and security verification. Recommended to stay ON.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={prefs.email_security_alerts}
                    onChange={() => handleToggle("email_security_alerts")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleSavePreferences()}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Saving Changes...
                </>
              ) : (
                "Save Preferences"
              )}
            </button>

            <Link
              href="https://app.arthavi.com"
              className="text-xs font-semibold text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 inline-flex items-center gap-1"
            >
              Open Arthavi App <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Support Info */}
      <div className="text-center space-y-3 p-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Need assistance or want complete account deletion?{" "}
          <a
            href="https://wa.me/919158110065?text=Hi%20Arthavi%20Support,%20I%20have%20a%20question%20about%20my%20email%20preferences"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
          >
            <MessageCircle size={13} /> WhatsApp Support (+91 91581 10065)
          </a>
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400 dark:text-neutral-500">
          <a href="https://arthavi.com/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="https://arthavi.com/terms.html" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Terms of Service
          </a>
          <span>•</span>
          <a href="mailto:support@arthavi.com" className="hover:underline">
            support@arthavi.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-neutral-100/60 px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}
