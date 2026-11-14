"use client";

// Small ⓘ button that shows a popover with details (real estate summary cards, 2026-11-14).
// Opens on tap/click, or on hover with a mouse. Fixed-positioned from the button so it never runs
// off the screen, whatever column the card is in. Closes on outside click, Escape, scroll or resize.
// Rendered in a portal on <body>: a transformed parent (animations) would otherwise move a fixed box.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const WIDTH = 288;
const GAP = 8;

export default function InfoPopover({ label, children }: { label: string; children: React.ReactNode }) {
  const [pinned, setPinned] = useState(false); // opened by click / tap
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = pinned || hovered;

  // Hover: a short grace period so the pointer can move from the icon into the box.
  const hoverIn = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const hoverOut = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(false), 150);
  };

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(WIDTH, window.innerWidth - 2 * GAP);
    // Open to the right of the icon when it fits, else end at the icon; always inside the screen.
    const preferred = r.left - 12 + w <= window.innerWidth - GAP ? r.left - 12 : r.right - w;
    const left = Math.min(Math.max(preferred, GAP), window.innerWidth - w - GAP);
    setPos({ top: r.bottom + GAP, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setPinned(false);
      setHovered(false);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || boxRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const canHover = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;

  return (
    <span
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        if (!canHover()) return;
        place();
        hoverIn();
      }}
      onMouseLeave={hoverOut}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        onClick={() => {
          place();
          setPinned((p) => !p);
        }}
        className={`p-0.5 rounded-full transition-colors ${open ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400"}`}
      >
        <Info size={14} />
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={boxRef}
          role="dialog"
          aria-label={label}
          onMouseEnter={() => canHover() && hoverIn()}
          onMouseLeave={hoverOut}
          onClick={(e) => e.stopPropagation()}
          style={{ top: pos.top, left: pos.left, width: Math.min(WIDTH, typeof window !== "undefined" ? window.innerWidth - 2 * GAP : WIDTH) }}
          className="fixed z-[60] rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#151A23] shadow-xl p-3 text-left text-xs font-normal normal-case tracking-normal text-neutral-700 dark:text-neutral-300 cursor-auto"
        >
          {children}
        </div>,
        document.body
      )}
    </span>
  );
}

/** One label / value line inside a popover. */
export function PopRow({ label, value, tone, strong }: { label: React.ReactNode; value: React.ReactNode; tone?: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-0.5 ${strong ? "border-t border-neutral-100 dark:border-white/10 mt-1 pt-1.5 font-semibold text-neutral-900 dark:text-white" : ""}`}>
      <span className="min-w-0">{label}</span>
      <span className={`font-mono whitespace-nowrap ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
