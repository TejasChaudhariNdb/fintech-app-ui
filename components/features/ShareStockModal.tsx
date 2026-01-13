"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Download, X, Share2 } from "lucide-react";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { isPrivacyMode } = usePrivacy();

  if (!isOpen || !stock) return null;

  const isPositive = stock.pnl_pct >= 0;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution but safe for mobile
        backgroundColor: "#000", // Ensure dark bg
      });
      download(dataUrl, `${stock.symbol}-performance.png`);
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

      const file = new File([blob], `${stock.symbol}-performance.png`, {
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
        // Fallback to download if web share not supported
        download(URL.createObjectURL(blob), `${stock.symbol}-performance.png`);
      }
    } catch (err) {
      console.error("Failed to share image", err);
      // Fallback via existing handleDownload if blob sharing fails
      handleDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#0B0E14] border border-neutral-200 dark:border-white/10 rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white z-20">
          <X size={24} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 text-center">
            Share Achievement
          </h3>

          {/* This is the card that gets captured */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden flex flex-col p-6 bg-[#0B0E14] border border-white/10 shadow-2xl">
            {/* Ambient Background */}
            <div
              className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none ${
                isPositive ? "bg-emerald-500" : "bg-rose-500"
              } -translate-y-1/2 translate-x-1/2`}
            />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-blue-600/10 blur-[80px] opacity-30 pointer-events-none -translate-x-1/2 translate-y-1/2" />

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col h-full items-center text-center">
              {/* Branding */}
              <div className="flex items-center gap-2 mb-4 opacity-70">
                <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center backdrop-blur-sm">
                  <Image
                    src="/icon-512x512.png"
                    width={12}
                    height={12}
                    alt="Logo"
                  />
                </div>
                <span className="font-bold text-white tracking-widest text-xs uppercase">
                  Arthavi
                </span>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                <p className="text-[10px] text-neutral-400 font-bold tracking-[0.2em] uppercase mb-4 border border-white/10 px-3 py-1 rounded-full">
                  Portfolio Snapshot
                </p>

                {/* Fixed Height Container for Title */}
                <div className="h-[4.5rem] flex items-center justify-center w-full px-4 mb-6">
                  <h1 className="text-lg font-bold text-white leading-tight text-center line-clamp-2">
                    {stock.symbol}
                  </h1>
                </div>

                {/* Score Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md w-full max-w-[260px] shadow-2xl relative overflow-hidden group">
                  <div
                    className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
                      isPositive
                        ? "from-emerald-500 to-transparent"
                        : "from-rose-500 to-transparent"
                    }`}
                  />

                  <p
                    className={`text-5xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r ${
                      isPositive
                        ? "from-emerald-400 to-green-300"
                        : "from-rose-400 to-red-300"
                    }`}>
                    {isPositive ? "+" : ""}
                    {stock.pnl_pct.toFixed(2)}%
                  </p>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mt-2">
                    {isPositive ? "All Time High" : "Current Returns"}
                  </p>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="w-full mt-auto pt-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between backdrop-blur-md">
                  <div className="text-left">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                      Current Value
                    </p>
                    <p className="text-lg font-bold text-white font-mono">
                      {isPrivacyMode || !stock.value
                        ? "₹ •••••"
                        : `₹${stock.value.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                      Date
                    </p>
                    <p className="text-sm font-medium text-white/80">
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

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={handleShare}
              isLoading={downloading}
              className="w-full py-3.5 text-sm md:text-base font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all border-0 rounded-xl"
              variant="primary">
              <Share2 size={20} />
              Share
            </Button>

            <Button
              onClick={handleDownload}
              isLoading={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white rounded-xl"
              variant="outline">
              <Download size={18} />
              Save Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
