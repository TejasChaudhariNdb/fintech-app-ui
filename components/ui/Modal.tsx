"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Drag-to-dismiss state
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setAnimating(false);
      setDragOffset(0);
    } else if (visible) {
      // Animate out
      setAnimating(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimating(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock scroll
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Swipe-to-dismiss handlers ──────────────────────────────
  const onDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragCurrentY.current = clientY;
    setIsDragging(true);
  }, []);

  const onDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, clientY - dragStartY.current); // only downward
    dragCurrentY.current = clientY;
    setDragOffset(delta);
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartY.current = null;
    // Dismiss if dragged more than 120px or velocity is high
    if (dragOffset > 120) {
      onClose();
    } else {
      setDragOffset(0);
    }
  }, [dragOffset, onClose]);

  if (!visible || typeof document === "undefined") return null;

  const isClosing = animating || (!isOpen && visible);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 pointer-events-auto`}
      style={{
        background: isClosing
          ? "rgba(0,0,0,0)"
          : "rgba(0,0,0,0.55)",
        backdropFilter: isClosing ? "blur(0px)" : "blur(6px)",
        transition: "background 250ms ease, backdrop-filter 250ms ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={sheetRef}
        className={`
          bg-white dark:bg-[#151A23] dark:border dark:border-white/10
          rounded-t-3xl sm:rounded-3xl w-full max-w-md
          transition-colors duration-200
          max-h-[90vh] flex flex-col shadow-2xl
          ${isClosing ? "animate-none" : ""}
        `}
        style={{
          transform: isClosing
            ? "translateY(100%)"
            : `translateY(${dragOffset}px)`,
          opacity: isClosing ? 0 : Math.max(0, 1 - dragOffset / 280),
          transition: isDragging
            ? "none"
            : isClosing
              ? "transform 250ms cubic-bezier(0.36, 0, 0.66, -0.3), opacity 200ms ease"
              : "transform 350ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease",
          willChange: "transform",
        }}
        // Touch events
        onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
        // Mouse events (desktop)
        onMouseDown={(e) => onDragStart(e.clientY)}
        onMouseMove={(e) => { if (dragStartY.current !== null) onDragMove(e.clientY); }}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        {/* Drag handle pill — signals swipeable */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-neutral-300 dark:bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 pb-4 pt-2 flex-shrink-0 border-b border-neutral-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            onPointerDown={onClose}
            aria-label="Close modal"
            className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-white w-8 h-8 flex items-center justify-center transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 active:scale-90 touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4 scroll-native">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
