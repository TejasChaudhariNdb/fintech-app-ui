"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Download, X, Share2, Sparkles } from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import download from "downloadjs";
import Button from "@/components/ui/Button";
import { usePrivacy } from "@/context/PrivacyContext";

interface ShareStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    symbol: string;
    pnl_pct: number;
    value?: number;
  } | null;
}

export default function ShareStockModal({
  isOpen,
  onClose,
  stock,
}: ShareStockModalProps) {
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { isPrivacyMode } = usePrivacy();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll with fixed positioning for iOS Safari / Mobile
  useEffect(() => {
    if (isOpen && stock) {
      const scrollY = window.scrollY;
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, stock]);

  if (!mounted || !isOpen || !stock) return null;

  const isPositive = stock.pnl_pct >= 0;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000",
      });
      download(dataUrl, `${stock.symbol.replace(/\s+/g, "_")}_performance.png`);
    } catch (err) {
      console.error("Failed to generate image", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000",
      });

      if (!blob) throw new Error("Failed to create blob");

      const file = new File([blob], `${stock.symbol.replace(/\s+/g, "_")}_performance.png`, {
        type: "image/png",
      });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `My ${stock.symbol} Performance`,
          text: `Check out my returns on ${stock.symbol}! 🚀 #Arthavi #Investing`,
        });
      } else {
        download(URL.createObjectURL(blob), `${stock.symbol.replace(/\s+/g, "_")}_performance.png`);
      }
    } catch (err) {
      console.error("Failed to share image", err);
      handleDownload();
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none overscroll-none animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <div
        className="bg-white dark:bg-[#13161f] border-t sm:border border-neutral-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl relative flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden touch-pan-y overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile top handle bar */}
        <div className="sm:hidden pt-2.5 pb-0 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-[#13161f]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white leading-tight">
                Share Achievement
              </h2>
              <p className="text-[10px] sm:text-[11px] text-neutral-400">
                Showcase your investment performance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Card Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 flex flex-col items-center justify-center touch-pan-y overscroll-contain">
          {/* Card that gets captured */}
          <div
            ref={cardRef}
            className="relative w-full max-w-[320px] aspect-[4/5] rounded-3xl overflow-hidden flex flex-col p-5 bg-[#0B0E14] border border-white/10 shadow-2xl shrink-0"
          >
            {/* Ambient Background Glows */}
            <div
              className={`absolute top-0 right-0 w-[280px] h-[280px] rounded-full blur-[80px] opacity-25 pointer-events-none ${
                isPositive ? "bg-emerald-500" : "bg-rose-500"
              } -translate-y-1/2 translate-x-1/2`}
            />
            <div className="absolute bottom-0 left-0 w-[220px] h-[220px] rounded-full bg-blue-600/15 blur-[60px] opacity-35 pointer-events-none -translate-x-1/2 translate-y-1/2" />

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col h-full items-center text-center">
              {/* Branding */}
              <div className="flex items-center gap-1.5 mb-2 opacity-80">
                <div className="w-5 h-5 bg-white/10 rounded-md flex items-center justify-center backdrop-blur-sm">
                  <Image
                    src="/icon-512x512.png"
                    width={12}
                    height={12}
                    alt="Logo"
                  />
                </div>
                <span className="font-bold text-white tracking-widest text-[11px] uppercase">
                  Arthavi
                </span>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                <p className="text-[9px] text-neutral-400 font-bold tracking-[0.2em] uppercase mb-2 border border-white/10 px-2.5 py-0.5 rounded-full">
                  Performance Snapshot
                </p>

                {/* Title */}
                <div className="min-h-[2.5rem] flex items-center justify-center w-full px-2 mb-3">
                  <h1 className="text-base font-bold text-white leading-snug text-center line-clamp-2">
                    {stock.symbol}
                  </h1>
                </div>

                {/* Returns Score Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md w-full max-w-[220px] shadow-xl relative overflow-hidden">
                  <div
                    className={`absolute inset-0 opacity-15 bg-gradient-to-br ${
                      isPositive
                        ? "from-emerald-500 to-transparent"
                        : "from-rose-500 to-transparent"
                    }`}
                  />
                  <p
                    className={`text-3xl sm:text-4xl font-black mb-0.5 bg-clip-text text-transparent bg-gradient-to-r ${
                      isPositive
                        ? "from-emerald-400 to-green-300"
                        : "from-rose-400 to-red-300"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {stock.pnl_pct.toFixed(2)}%
                  </p>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mt-1">
                    {isPositive ? "All Time Gain" : "Current Returns"}
                  </p>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="w-full mt-auto pt-3">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex items-center justify-between backdrop-blur-md">
                  <div className="text-left">
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-0.5 font-semibold">
                      Current Value
                    </p>
                    <p className="text-sm font-bold text-white font-mono">
                      {isPrivacyMode || !stock.value
                        ? "₹ •••••"
                        : `₹${stock.value.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-0.5 font-semibold">
                      Date
                    </p>
                    <p className="text-xs font-medium text-white/80">
                      {new Date().toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-neutral-100 dark:border-white/5 bg-neutral-50/80 dark:bg-[#13161f]/95 backdrop-blur-sm flex flex-col gap-2 shrink-0 z-10 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5">
          <Button
            onClick={handleShare}
            isLoading={downloading}
            className="w-full py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 active:scale-95 transition-all border-0 rounded-xl cursor-pointer"
            variant="primary"
          >
            <Share2 size={15} />
            <span>Share Image</span>
          </Button>

          <Button
            onClick={handleDownload}
            isLoading={downloading}
            className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 rounded-xl cursor-pointer"
            variant="outline"
          >
            <Download size={14} />
            <span>Save to Device</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
