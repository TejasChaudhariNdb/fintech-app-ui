"use client";

import { useEffect, useState } from "react";
import {
  MessageSquarePlus,
  X,
  Bug,
  Lightbulb,
  MessageCircle,
  Send,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

const TYPES = [
  {
    value: "bug",
    label: "Bug Report",
    icon: Bug,
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  {
    value: "feature",
    label: "Feature Request",
    icon: Lightbulb,
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  },
  {
    value: "feedback",
    label: "General Feedback",
    icon: MessageCircle,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
];

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const resetForm = () => {
    setType("feedback");
    setTitle("");
    setBody("");
    setError("");
    setSuccess(false);
    setActiveTab("submit");
    setHistory([]);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetForm, 300);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getUserFeedback();
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load feedback history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchHistory();
    }
  }, [isOpen, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError("");
    try {
      await api.submitFeedback({
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(handleClose, 2000);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpenFeedback = () => setIsOpen(true);
    window.addEventListener("arthavi-open-feedback", handleOpenFeedback);

    return () => {
      window.removeEventListener("arthavi-open-feedback", handleOpenFeedback);
    };
  }, []);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Send Feedback"
        className="bottom-40 flex fixed right-4 lg:bottom-24 z-30 items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2.5 rounded-full shadow-lg shadow-primary-500/30 transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-medium">
        <MessageSquarePlus className="w-4 h-4" />
        <span>Feedback</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}>
          <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            {/* Header */}
            <div className="flex flex-col border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Feedback Portal
                </h2>
                <button
                  onClick={handleClose}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex px-6 border-t border-neutral-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveTab("submit")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-colors ${
                    activeTab === "submit"
                      ? "border-primary-500 text-primary-600 dark:text-primary-400"
                      : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}>
                  Share Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-colors ${
                    activeTab === "history"
                      ? "border-primary-500 text-primary-600 dark:text-primary-400"
                      : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}>
                  My History
                </button>
              </div>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Feedback Sent!
                </h3>
                <p className="text-sm text-neutral-500">
                  We&apos;ll review it soon.
                </p>
              </div>
            ) : activeTab === "history" ? (
              <div className="p-6 max-h-[350px] overflow-y-auto space-y-3.5">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-neutral-400">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-neutral-400 font-medium">You haven&apos;t submitted any feedback yet.</p>
                  </div>
                ) : (
                  history.map((item) => {
                    const typeConfig = TYPES.find((t) => t.value === item.type) || TYPES[2];
                    const Icon = typeConfig.icon;
                    
                    // Status styling
                    let statusColor = "bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400";
                    let statusLabel = "Submitted";
                    if (item.status === "seen") {
                      statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
                      statusLabel = "Under Review";
                    } else if (item.status === "resolved") {
                      statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
                      statusLabel = "Resolved";
                    }

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-neutral-150 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${typeConfig.color}`}>
                            <Icon className="w-3 h-3" />
                            {typeConfig.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                            {item.title}
                          </h4>
                          {item.body && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-3">
                              {item.body}
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                          Submitted on {item.created_at || "Recent"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                          type === t.value
                            ? t.color
                            : "border-neutral-200 dark:border-white/10 text-neutral-500 hover:border-neutral-300 dark:hover:border-white/20"
                        }`}>
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Summary
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      type === "bug"
                        ? "e.g. Portfolio not loading on mobile"
                        : type === "feature"
                          ? "e.g. Add SIP calculator"
                          : "e.g. Love the app but..."
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Details{" "}
                    <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Tell us more..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition resize-none"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium transition-colors">
                  {loading ? "Submitting..." : "Submit"}
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
