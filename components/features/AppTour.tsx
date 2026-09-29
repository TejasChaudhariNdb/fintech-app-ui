"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, ShieldCheck, TrendingUp, Compass, Sparkles, X, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";
import { useIsDemo } from "@/lib/hooks/useIsDemo";

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-profile-switcher",
    title: "Family & Personal Portfolios",
    description: "Switch seamlessly between individual portfolios or view your family's consolidated wealth in one tap.",
    icon: Users,
    badge: "Profiles",
  },
  {
    targetId: "tour-net-worth-card",
    title: "Live Net Worth & Privacy",
    description: "Real-time valuations across Mutual Funds and Stocks. Tap the eye icon to hide sensitive figures in public.",
    icon: ShieldCheck,
    badge: "Valuations",
  },
  {
    targetId: "tour-portfolio-summary",
    title: "Returns & Asset Allocation",
    description: "Track verified XIRR performance, AMC diversification, and individual family member contributions.",
    icon: TrendingUp,
    badge: "Analytics",
  },
  {
    targetId: "tour-navigation",
    title: "Holdings, Tax Reports & Goals",
    description: "Explore detailed scheme holdings, generate ITR-ready Capital Gains tax statements, or track family goals.",
    icon: Compass,
    badge: "Navigation",
  },
  {
    targetId: "tour-ai-chat",
    title: "Arthavi AI Wealth Copilot",
    description: "Ask your personal wealth copilot anytime about portfolio overlap, capital gains tax, and rebalancing.",
    icon: Sparkles,
    badge: "AI Copilot",
  },
];

export default function AppTour() {
  const router = useRouter();
  const isDemo = useIsDemo();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setHighlightRect(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("has_seen_app_tour", "true");
    }
  }, []);

  const handleRegisterFromDemo = () => {
    endTour();
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_email");
      sessionStorage.clear();
      router.push("/register");
    }
  };

  // Listen for custom trigger (e.g. from Profile "Take Interactive Tour")
  useEffect(() => {
    const handleTrigger = () => startTour();
    window.addEventListener("start-app-tour", handleTrigger);
    return () => window.removeEventListener("start-app-tour", handleTrigger);
  }, [startTour]);

  // Automatic trigger logic
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const hasSeen = localStorage.getItem("has_seen_app_tour");

    if (isDemo) {
      // In demo mode: trigger quickly to orient visitors
      const timer = setTimeout(() => {
        startTour();
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (!hasSeen) {
      // In real user mode: only trigger once dashboard is rendered
      const checkAndStart = () => {
        const netWorthEl = document.getElementById("tour-net-worth-card");
        if (netWorthEl) {
          startTour();
        }
      };

      const timer = setTimeout(checkAndStart, 1800);
      return () => clearTimeout(timer);
    }
  }, [isDemo, startTour]);

  // Position and highlight target element
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    let targetElementId = step.targetId;
    if (step.targetId === "tour-navigation") {
      const isMobile = typeof window !== "undefined" ? window.innerWidth < 1024 : false;
      targetElementId = isMobile ? "tour-bottom-nav" : "tour-side-nav";
    }

    const el = document.getElementById(targetElementId);
    if (!el) {
      setHighlightRect(null);
      return;
    }

    // Scroll element into view (except fixed elements like the floating AI button or nav bars)
    if (step.targetId !== "tour-ai-chat" && step.targetId !== "tour-navigation") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);
    };

    updateRect();
    const t1 = setTimeout(updateRect, 250);
    const t2 = setTimeout(updateRect, 500);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [isActive, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endTour();
      } else if (e.key === "ArrowRight") {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          endTour();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStep, endTour]);

  // Calculate dynamic card positioning:
  // If target element is in the lower half of screen, place card at the top.
  // If target element is in upper half, place card at the bottom (safely above bottom navigation).
  const isTargetInLowerHalf = useMemo(() => {
    if (!highlightRect || typeof window === "undefined") return false;
    return highlightRect.top > window.innerHeight * 0.45;
  }, [highlightRect]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Spotlight dimensions with comfortable 8px breathing room
  const PADDING = 8;
  const spotlightStyle = highlightRect
    ? {
        top: Math.max(4, highlightRect.top - PADDING),
        left: Math.max(4, highlightRect.left - PADDING),
        width: Math.min(
          typeof window !== "undefined" ? window.innerWidth - 8 : 400,
          highlightRect.width + PADDING * 2
        ),
        height: highlightRect.height + PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden">
      {/* Clickable Backdrop to dismiss cleanly */}
      <div
        className="fixed inset-0 z-30 pointer-events-auto"
        onClick={endTour}
        aria-label="Dismiss tour"
      />

      {/* Spotlight Cutout Overlay:
          A transparent window perfectly framing the target element,
          with a massive 9999px box shadow that darkens the rest of the UI.
          No element z-index hacking, no DOM mutations, completely crisp target visibility. */}
      {spotlightStyle ? (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out z-40 ring-2 ring-primary-500/80 ring-offset-2 ring-offset-black/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
          style={spotlightStyle}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity duration-300 z-40 pointer-events-none" />
      )}

      {/* Floating Tour Card:
          Smart dynamic vertical docking ensures the card NEVER obscures the highlighted target.
          On Mobile: Top or Bottom based on target Y position.
          On Desktop: Elegantly docked at Top-Right or Bottom-Right. */}
      <div
        className={`fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] pointer-events-auto z-50 transition-all duration-300 ease-out ${
          isTargetInLowerHalf
            ? "top-[max(1rem,env(safe-area-inset-top,16px))] sm:top-6 sm:bottom-auto animate-in slide-in-from-top-3 fade-in duration-200"
            : "bottom-[calc(4.75rem+env(safe-area-inset-bottom,12px))] sm:bottom-6 sm:top-auto animate-in slide-in-from-bottom-3 fade-in duration-200"
        }`}
      >
        <div className="relative overflow-hidden bg-white/95 dark:bg-[#11151F]/95 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 border border-neutral-200/80 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-neutral-900 dark:text-white">
          
          {/* Top Thin Progress Bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-neutral-100 dark:bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Header Row: Badge + Step Indicator + Close */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                {step.badge}
              </span>
              <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              {isDemo && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Demo
                </span>
              )}
            </div>

            <button
              onClick={endTour}
              className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Skip tour"
            >
              <X size={14} />
            </button>
          </div>

          {/* Title & Icon */}
          <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white mb-1.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Icon size={14} />
            </div>
            <span>{step.title}</span>
          </h3>

          {/* Clean, readable description */}
          <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {step.description}
          </p>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-white/5">
            {/* Skip text button */}
            <button
              onClick={endTour}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            >
              Skip
            </button>

            {/* Navigation Actions */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors flex items-center gap-0.5"
                >
                  <ChevronLeft size={13} />
                  <span>Back</span>
                </button>
              )}

              {isLastStep ? (
                isDemo ? (
                  <button
                    onClick={handleRegisterFromDemo}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl shadow-md shadow-primary-500/25 bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <span>Start Free</span>
                    <ArrowRight size={12} />
                  </button>
                ) : (
                  <button
                    onClick={endTour}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/25 active:scale-95 transition-all"
                  >
                    Got It 🎉
                  </button>
                )
              ) : (
                <button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/25 flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
