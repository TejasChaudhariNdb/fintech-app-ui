"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Calendar, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";

interface AppUpdateData {
  id: number;
  title: string;
  description: string;
  cta_text?: string;
  cta_link?: string;
  created_at: string;
}

export default function WhatsNewPage() {
  const router = useRouter();
  const [updates, setUpdates] = useState<AppUpdateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUpdates = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Fetch updates
        const data = await api.getUpdates();
        setUpdates(data || []);
        
        // Mark all as read immediately to clear sidebar badges
        if (data && data.length > 0) {
          await api.markUpdatesAsSeen();
        }
      } catch (e: any) {
        console.error("Failed to load updates:", e);
        setError("Unable to load product updates. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadUpdates();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleCtaClick = (link?: string) => {
    if (!link) return;
    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      router.push(link);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header section */}
      <header className="flex items-center gap-4 py-4">
        <button
          onClick={() => router.push("/profile")}
          className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors text-neutral-600 dark:text-neutral-300"
          aria-label="Back to Settings"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" /> What&apos;s New
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Discover the latest features and platform updates in Arthavi
          </p>
        </div>
      </header>

      {/* Main content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
          <p className="text-sm text-neutral-500">Loading product updates...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl text-center space-y-3">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          <Button size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : updates.length === 0 ? (
        <div className="p-10 border border-dashed border-neutral-200 dark:border-white/10 rounded-3xl text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400">
            <Sparkles size={20} />
          </div>
          <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">Up to date!</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You are running the latest version of Arthavi. We will announce new features here as they roll out.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-neutral-200 dark:border-white/10 pl-6 ml-3 space-y-10 py-2">
          {updates.map((update) => (
            <div key={update.id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white dark:border-[#0B0E14] bg-neutral-300 dark:bg-neutral-800 group-hover:bg-primary-500 group-hover:scale-110 transition-all duration-300" />

              {/* Update Card */}
              <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-white/15 transition-all shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {update.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                    <Calendar size={12} />
                    <span>{formatDate(update.created_at)}</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
                  {update.description}
                </p>

                {update.cta_link && (
                  <div className="pt-2 flex justify-start">
                    <button
                      onClick={() => handleCtaClick(update.cta_link)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-all"
                    >
                      {update.cta_text || "Explore Features"}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
