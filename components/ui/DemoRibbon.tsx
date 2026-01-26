"use client";

import { useIsDemo } from "@/lib/hooks/useIsDemo";

export default function DemoRibbon() {
  const isDemo = useIsDemo();

  if (!isDemo) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[11px] lg:text-xs font-bold px-4 py-1.5 text-center shadow-md sticky top-0 z-[100] tracking-wide uppercase">
      Demo Account — View Only Mode
    </div>
  );
}
