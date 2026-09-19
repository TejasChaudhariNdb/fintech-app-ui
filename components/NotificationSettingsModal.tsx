"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import {
  Bell,
  Mail,
  Smartphone,
  Sparkles,
  TrendingUp,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";

type NotificationPreferences = {
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
  unsubscribe_reason?: string | null;
  unsubscribed_at?: string | null;
};

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"email" | "push">("email");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
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
  });

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotificationPreferences();
      setPrefs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (!prev[key] && key.startsWith("email_") && key !== "email_security_alerts") {
        updated.unsubscribed_all_marketing = false;
      }
      return updated;
    });
  };

  const handleSave = async (overridePrefs?: NotificationPreferences) => {
    setSaving(true);
    setError(null);
    const payload = overridePrefs || prefs;
    try {
      const updated = await api.updateNotificationPreferences(payload);
      setPrefs(updated);
      onToast("Notification preferences updated!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePauseAllMarketing = () => {
    const nextState = !prefs.unsubscribed_all_marketing;
    const updated = {
      ...prefs,
      unsubscribed_all_marketing: nextState,
      email_daily_nudge: !nextState,
      email_weekly_summary: !nextState,
      email_product_updates: !nextState,
      email_marketing: !nextState,
    };
    setPrefs(updated);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notification & Email Settings">
      <div className="space-y-5">
        {/* Tab Channel Selector */}
        <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "email"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Mail size={15} />
            Email Digests &amp; Reports
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("push")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "push"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Smartphone size={15} />
            Push Notifications
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : activeTab === "email" ? (
          <div className="space-y-4">
            {/* Master Unsubscribe / Pause Toggle */}
            <div className={`p-3.5 rounded-xl border transition-colors ${
              prefs.unsubscribed_all_marketing
                ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
                : "bg-neutral-50 border-neutral-200 dark:bg-white/5 dark:border-white/5"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {prefs.unsubscribed_all_marketing ? "Non-Critical Emails Paused" : "Pause All Marketing & Nudges"}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Only security and CAS account alerts will be delivered.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePauseAllMarketing}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    prefs.unsubscribed_all_marketing
                      ? "bg-primary-600 text-white"
                      : "border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {prefs.unsubscribed_all_marketing ? "Resume Emails" : "Pause All"}
                </button>
              </div>
            </div>

            {/* Granular Email Options */}
            <div className="divide-y divide-neutral-100 dark:divide-white/5 rounded-xl border border-neutral-200 dark:border-white/5">
              {/* Daily Nudge */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Daily Portfolio Nudge
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Morning market updates and gain highlights.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.email_daily_nudge && !prefs.unsubscribed_all_marketing}
                    onChange={() => handleToggle("email_daily_nudge")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Weekly Summary */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Weekly Wealth Snapshot
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Sunday portfolio summary and gain breakdown.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.email_weekly_summary && !prefs.unsubscribed_all_marketing}
                    onChange={() => handleToggle("email_weekly_summary")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Product Releases */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Product Releases &amp; Features
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Announcements when new features launch.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.email_product_updates && !prefs.unsubscribed_all_marketing}
                    onChange={() => handleToggle("email_product_updates")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* CAS Statement Reports */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      CAS Statement Sync Results
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Receipts when CAS files are uploaded and synced.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.email_cas_reports}
                    onChange={() => handleToggle("email_cas_reports")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Security & Login Alerts */}
              <div className="flex items-center justify-between p-3 bg-neutral-50/50 dark:bg-white/2">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-neutral-100 p-2 text-neutral-700 dark:bg-white/10 dark:text-neutral-300">
                    <Lock size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      Security &amp; Login Alerts
                      <span className="text-[9px] font-bold bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 rounded text-neutral-600 dark:text-neutral-400">
                        Essential
                      </span>
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Alerts on new device logins and password updates.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.email_security_alerts}
                    onChange={() => handleToggle("email_security_alerts")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-neutral-100 dark:divide-white/5 rounded-xl border border-neutral-200 dark:border-white/5">
              {/* Daily Push */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Pre-Market &amp; Post-Market Push
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      9:00 AM market open and 3:45 PM closing performance alerts.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.push_daily_nudge}
                    onChange={() => handleToggle("push_daily_nudge")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Predictions Push */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Market Predictions &amp; Streaks
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Notifications when your Bull/Bear predictions win.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.push_market_predictions}
                    onChange={() => handleToggle("push_market_predictions")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Product Updates Push */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      App Updates &amp; Feature Announcements
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Direct alerts when major tracker improvements go live.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.push_product_updates}
                    onChange={() => handleToggle("push_product_updates")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-600 text-xs font-bold text-white shadow-xs hover:bg-primary-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
