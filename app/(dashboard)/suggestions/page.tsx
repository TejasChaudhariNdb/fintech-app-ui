"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { 
  Lightbulb, 
  Plus, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send,
  MessageCircle,
  HelpCircle,
  Bug
} from "lucide-react";

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("feature"); // "feature", "bug", "feedback"

  const [toast, setToast] = useState({
    message: "",
    type: "info" as "success" | "error" | "loading" | "info",
    isVisible: false,
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "loading" = "success",
  ) => {
    setToast({ message, type, isVisible: true });
    if (type !== "loading") {
      setTimeout(
        () => setToast((prev) => ({ ...prev, isVisible: false })),
        3000,
      );
    }
  };

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const data = await api.getUserFeedback();
      setSuggestions(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load suggestions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await api.submitFeedback({
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      setTitle("");
      setBody("");
      setType("feature");
      showToast("Suggestion submitted successfully!", "success");
      loadSuggestions();
    } catch (err) {
      console.error(err);
      showToast("Failed to submit suggestion", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format status text nicely
  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress": return "In Progress";
      case "not_feasible": return "Not Feasible";
      case "new": return "New";
      case "accepted": return "Accepted";
      case "resolved": return "Action Taken";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Status badge styling helper
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "in_progress":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "not_feasible":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
    }
  };

  // Type badge styling helper
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "bug":
        return "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400";
      case "feature":
        return "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default:
        return "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
    }
  };

  // Filter suggestions
  const filteredSuggestions = suggestions.filter((item) => {
    if (activeFilter === "all") return true;
    return item.status === activeFilter;
  });

  const filterTabs = [
    { id: "all", label: "All Suggestions" },
    { id: "new", label: "New" },
    { id: "accepted", label: "Accepted" },
    { id: "in_progress", label: "In Progress" },
    { id: "resolved", label: "Action Taken" },
    { id: "not_feasible", label: "Not Feasible" },
  ];

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white px-4">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Header */}
      <div className="pt-8 pb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Lightbulb className="w-7 h-7 text-yellow-500 animate-pulse" />
          Investor Suggestions
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Share your ideas, feature requests, or report bugs to help elevate the Arthavi platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Card */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              New Suggestion
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "feature", label: "Feature", icon: Lightbulb },
                    { id: "bug", label: "Bug", icon: Bug },
                    { id: "feedback", label: "General", icon: MessageCircle }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setType(opt.id)}
                        className={`flex flex-col items-center gap-1 py-2 border rounded-xl transition-all ${
                          type === opt.id
                            ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400 font-medium"
                            : "border-neutral-200 dark:border-white/5 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[10px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your suggestion..."
                required
                autoComplete="off"
              />

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Detailed Description (Optional)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe your request in detail, including why it would be helpful..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl outline-none transition-all text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send size={16} />
                    Submit Suggestion
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Library Board */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar select-none">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                  activeFilter === tab.id
                    ? "bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-500/20"
                    : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Suggestions List */}
          {loading ? (
            <AppSkeleton />
          ) : filteredSuggestions.length > 0 ? (
            <div className="space-y-4">
              {filteredSuggestions.map((item) => (
                <Card
                  key={item.id}
                  className="p-5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-2xl flex flex-col gap-3.5 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {/* Status Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${getTypeBadgeStyle(item.type)}`}>
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeStyle(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {item.created_at}
                    </span>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    {item.body && (
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                        {item.body}
                      </p>
                    )}
                  </div>

                  {/* Team Response / Action Taken */}
                  {item.action_taken && (
                    <div className="mt-2.5 p-4 rounded-xl bg-primary-50/50 dark:bg-primary-500/5 border border-primary-500/10 dark:border-primary-500/20 text-xs text-neutral-600 dark:text-neutral-300">
                      <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-bold mb-1.5">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span>Response from Arthavi Team</span>
                      </div>
                      <p className="leading-relaxed font-medium italic">
                        &ldquo;{item.action_taken}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Card bottom spacing */}
                  <div className="mt-1" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-3xl space-y-2">
              <HelpCircle className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-sm font-semibold">No suggestions found</p>
              <p className="text-xs text-neutral-400">Be the first to submit a suggestion using the form!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
