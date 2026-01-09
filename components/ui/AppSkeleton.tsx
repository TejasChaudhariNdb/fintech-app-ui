import React from "react";

export default function AppSkeleton() {
  return (
    <div className="px-4 pt-8 pb-32 space-y-6 animate-pulse w-full max-w-7xl mx-auto">
      {/* 1. Page Header (Title + Subtitle) */}
      <div className="space-y-3 mb-8">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-32 bg-neutral-200 dark:bg-white/5 rounded-lg" />
      </div>

      {/* 2. Hero Card (Net Worth / Main Summary) - Big & Premium */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-white/5 h-64 w-full border border-neutral-200 dark:border-white/5">
        <div className="absolute top-6 left-6 h-4 w-32 bg-neutral-300 dark:bg-white/10 rounded" />
        <div className="absolute top-16 left-6 h-10 w-48 bg-neutral-300 dark:bg-white/10 rounded-lg" />

        {/* Bottom stats row */}
        <div className="absolute bottom-6 left-6 right-6 flex gap-4">
          <div className="h-16 flex-1 bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="h-16 flex-1 bg-black/5 dark:bg-white/5 rounded-xl" />
        </div>
      </div>

      {/* 3. Secondary Grid (Charts / Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 p-4">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-white/10 rounded mb-4" />
          <div className="h-20 w-full bg-neutral-200 dark:bg-white/5 rounded" />
        </div>
        <div className="h-40 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 p-4">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-white/10 rounded mb-4" />
          <div className="flex gap-2 h-20 items-end">
            <div className="w-1/4 h-full bg-neutral-200 dark:bg-white/5 rounded-t" />
            <div className="w-1/4 h-3/4 bg-neutral-200 dark:bg-white/5 rounded-t" />
            <div className="w-1/4 h-1/2 bg-neutral-200 dark:bg-white/5 rounded-t" />
            <div className="w-1/4 h-2/3 bg-neutral-200 dark:bg-white/5 rounded-t" />
          </div>
        </div>
      </div>

      {/* 4. List Items (Transactions / Goals / Holdings) */}
      <div className="space-y-4 pt-4">
        <div className="h-6 w-32 bg-neutral-200 dark:bg-white/10 rounded mb-2" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
            <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10 mr-4" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-neutral-200 dark:bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-neutral-200 dark:bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
