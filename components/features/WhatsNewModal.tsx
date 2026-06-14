"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";

export default function WhatsNewModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);

  useEffect(() => {
    // Check if token exists in localStorage (only query if logged in)
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const checkAnnouncement = async () => {
      try {
        const data = await api.getLatestAnnouncement();
        if (data && data.id) {
          setAnnouncement(data);
          setIsOpen(true);
        }
      } catch (e) {
        console.error("Failed to fetch latest feature announcement:", e);
      }
    };

    // Delay checking slightly to allow initial dashboard render to complete smoothly
    const timer = setTimeout(checkAnnouncement, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = async () => {
    if (!announcement) return;
    try {
      await api.markUpdateAsSeen(announcement.id);
    } catch (e) {
      console.error("Failed to dismiss announcement:", e);
    }
    setIsOpen(false);
  };

  const handleExplore = async () => {
    if (!announcement) return;
    try {
      await api.markUpdateAsSeen(announcement.id);
      
      const link = announcement.cta_link || "/profile/whats-new";
      if (link.startsWith("http")) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        router.push(link);
      }
    } catch (e) {
      console.error("Failed to explore announcement:", e);
    }
    setIsOpen(false);
  };

  if (!announcement) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title="New in Arthavi">
      <div className="space-y-6 text-center py-2">
        {/* Animated icon decoration */}
        <div className="relative mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
          <Sparkles className="w-8 h-8 animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-primary-500/30 dark:border-primary-500/20 animate-ping opacity-75" style={{ animationDuration: "3s" }} />
        </div>

        {/* Content details */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {announcement.title}
          </h3>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed text-left max-w-sm mx-auto whitespace-pre-wrap px-4 font-normal bg-neutral-50 dark:bg-white/5 py-4 rounded-2xl border border-neutral-200/50 dark:border-white/5">
            {announcement.description}
          </div>
        </div>

        {/* Control actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 px-4">
          <Button
            onClick={handleExplore}
            className="flex-1 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/20"
          >
            {announcement.cta_text || "Explore"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1 w-full border border-neutral-300 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-500 dark:text-neutral-400 font-medium py-2.5 rounded-xl transition-all"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Modal>
  );
}
