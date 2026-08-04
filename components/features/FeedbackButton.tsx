"use client";

import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";

export default function FeedbackButton() {
  return (
    <Link
      href="/suggestions"
      title="Send Feedback"
      className="bottom-40 flex fixed right-4 lg:bottom-24 z-30 items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2.5 rounded-full shadow-lg shadow-primary-500/30 transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-medium">
      <MessageSquarePlus className="w-4 h-4" />
      <span>Feedback</span>
    </Link>
  );
}
