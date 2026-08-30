import React from "react";

// Individual shimmer block
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export default function AppSkeleton() {
  return (
    <div className="px-4 pt-8 pb-32 space-y-6 w-full max-w-7xl mx-auto" aria-busy="true" aria-label="Loading">
      {/* 1. Page Header */}
      <div className="space-y-3 mb-8">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-32" />
      </div>

      {/* 2. Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/5 h-64 w-full bg-neutral-100 dark:bg-white/[0.03]">
        {/* Shimmer overlay — sweeps across the whole card */}
        <div className="absolute inset-0 shimmer rounded-2xl" />
        <div className="absolute top-6 left-6 h-4 w-32 bg-neutral-300/60 dark:bg-white/10 rounded" />
        <div className="absolute top-16 left-6 h-10 w-48 bg-neutral-300/60 dark:bg-white/10 rounded-lg" />
        <div className="absolute bottom-6 left-6 right-6 flex gap-4">
          <div className="h-16 flex-1 bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="h-16 flex-1 bg-black/5 dark:bg-white/5 rounded-xl" />
        </div>
      </div>

      {/* 3. Secondary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-40 rounded-2xl border border-neutral-200 dark:border-white/5 p-4 overflow-hidden relative"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute inset-0 shimmer rounded-2xl" />
            <Bone className="h-4 w-24 mb-4 relative z-10" />
            <Bone className="h-20 w-full relative z-10" />
          </div>
        ))}
      </div>

      {/* 4. List Items */}
      <div className="space-y-3 pt-2">
        <Bone className="h-5 w-32 mb-4" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center p-4 rounded-xl border border-neutral-200 dark:border-white/5 gap-4 overflow-hidden relative"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="absolute inset-0 shimmer rounded-xl" />
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10 flex-shrink-0 relative z-10" />
            {/* Text lines */}
            <div className="flex-1 space-y-2 relative z-10">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
            {/* Right value */}
            <Bone className="h-5 w-16 relative z-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
