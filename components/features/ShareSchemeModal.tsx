"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Download, X, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import download from "downloadjs";
import Button from "@/components/ui/Button";
import { usePrivacy } from "@/context/PrivacyContext";

interface ShareSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: {
    name: string;
    amc?: string;
    currentValue: number;
    investedValue?: number;
    overallReturnPct: number;
    dayChange?: number;
    dayChangePct?: number;
    xirr?: number | null;
  } | null;
}

export default function ShareSchemeModal({
  isOpen,
  onClose,
  scheme,
}: ShareSchemeModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { isPrivacyMode } = usePrivacy();

  if (!isOpen || !scheme) return null;

  const isOverallPositive = scheme.overallReturnPct >= 0;
  const isDayPositive = (scheme.dayChange ?? 0) >= 0;
  const hasDayChange = scheme.dayChange !== undefined && scheme.dayChangePct !== undefined;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0B0E14",
      });
      download(dataUrl, `${scheme.name.replace(/\s+/g, "-")}-performance.png`);
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
        backgroundColor: "#0B0E14",
      });

      if (!blob) throw new Error("Failed to create blob");

      const file = new File([blob], `${scheme.name.replace(/\s+/g, "-")}-performance.png`, {
        type: "image/png",
      });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `My ${scheme.name} Performance`,
          text: `Check out my investment performance! ${isOverallPositive ? "📈" : "📉"} #Arthavi #Investing`,
        });
      } else {
        download(URL.createObjectURL(blob), `${scheme.name.replace(/\s+/g, "-")}-performance.png`);
      }
    } catch (err) {
      console.error("Failed to share image", err);
      handleDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#0B0E14] border border-neutral-200 dark:border-white/10 rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20 transition-all z-20"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-5 text-center">
            Share Your Returns
          </h3>

          {/* Shareable Card */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden flex flex-col bg-[#0B0E14]"
          >
            {/* Background Gradients */}
            <div
              className={`absolute top-0 right-0 w-[350px] h-[350px] rounded-full blur-[120px] opacity-25 pointer-events-none ${
                isOverallPositive ? "bg-emerald-500" : "bg-rose-500"
              } -translate-y-1/3 translate-x-1/3`}
            />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] rounded-full bg-blue-500/15 blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-5">
              {/* Header - Branding */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <Image
                      src="/icon-512x512.png"
                      width={16}
                      height={16}
                      alt="Logo"
                    />
                  </div>
                  <span className="font-bold text-white/80 tracking-wider text-[11px] uppercase">
                    Arthavi
                  </span>
                </div>
                <span className="text-[10px] text-white/40 font-medium">
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
                {/* Category Badge */}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-4">
                  {scheme.amc ? "Mutual Fund" : "Portfolio"}
                </span>

                {/* Scheme Name */}
                <div className="px-4 mb-6">
                  <h2 className="text-base font-bold text-white leading-snug line-clamp-2">
                    {scheme.name}
                  </h2>
                  {scheme.amc && (
                    <p className="text-[11px] text-white/40 mt-1.5 truncate">
                      {scheme.amc}
                    </p>
                  )}
                </div>

                {/* Returns Display - Both Overall and Day */}
                <div className="w-full max-w-[280px] bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                  {/* Overall Return - Main Focus */}
                  <div className="text-center mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">
                      Overall Return
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className={`p-1.5 rounded-full ${isOverallPositive ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                        {isOverallPositive ? (
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-rose-400" />
                        )}
                      </div>
                      <span
                        className={`text-4xl font-black tracking-tight ${
                          isOverallPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isOverallPositive ? "+" : ""}{scheme.overallReturnPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  {hasDayChange && (
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
                  )}

                  {/* Day Change - Secondary */}
                  {hasDayChange && (
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30 mb-1">
                          Today
                        </p>
                        <div className="flex items-center justify-center gap-1">
                          {isDayPositive ? (
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                          )}
                          <span className={`text-sm font-bold ${isDayPositive ? "text-emerald-400" : "text-rose-400"}`}>
                            {isDayPositive ? "+" : ""}₹{Math.abs(scheme.dayChange!).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30 mb-1">
                          Day %
                        </p>
                        <span className={`text-sm font-bold ${isDayPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isDayPositive ? "+" : ""}{scheme.dayChangePct!.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* XIRR if available */}
                {scheme.xirr !== undefined && scheme.xirr !== null && (
                  <div className="mt-3 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-semibold text-amber-400">
                      XIRR: {scheme.xirr >= 0 ? "+" : ""}{scheme.xirr.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Footer - Value */}
              <div className="mt-auto pt-4">
                <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider font-medium">
                      Current Value
                    </p>
                    <p className="text-lg font-bold text-white tabular-nums mt-0.5">
                      {isPrivacyMode
                        ? "₹ •••••"
                        : `₹${scheme.currentValue.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                  {scheme.investedValue && !isPrivacyMode && (
                    <div className="text-right">
                      <p className="text-[9px] text-white/40 uppercase tracking-wider font-medium">
                        Invested
                      </p>
                      <p className="text-sm font-semibold text-white/70 tabular-nums mt-0.5">
                        ₹{scheme.investedValue.toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 space-y-2.5">
            <Button
              onClick={handleShare}
              isLoading={downloading}
              className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 rounded-xl shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              variant="primary"
            >
              <Share2 size={18} />
              Share
            </Button>

            <Button
              onClick={handleDownload}
              isLoading={downloading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white rounded-xl transition-all"
              variant="outline"
            >
              <Download size={18} />
              Save Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
