"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Download,
  X,
  Share2,
  Rocket,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import download from "downloadjs";
import Button from "@/components/ui/Button";

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

  if (!isOpen || !stock) return null;

  const isPositive = stock.pnl_pct >= 0;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // High resolution
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
        pixelRatio: 3,
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
      <div className="bg-[#0B0E14] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white z-20">
          <X size={24} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            Share Achievement
          </h3>

          {/* This is the card that gets captured */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden flex flex-col items-center justify-between p-8 bg-gradient-to-br from-[#1a1f2e] via-[#0B0E14] to-[#000000] border border-white/10 shadow-2xl">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary-500/10 blur-[80px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-500/10 blur-[80px]" />

            {/* Header Logo */}
            <div className="flex items-center gap-2 z-10 opacity-80">
              <Image
                src="/icon-512x512.png"
                width={24}
                height={24}
                alt="Logo"
                className="rounded-lg"
              />
              <span className="font-bold text-white tracking-wide text-sm">
                Arthavi
              </span>
            </div>

            {/* Main Content */}
            <div className="z-10 text-center space-y-6">
              <div className="space-y-2">
                <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider">
                  Portfolio Highlight
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight line-clamp-3">
                  {stock.symbol}
                </h1>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className={`text-5xl font-bold ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}>
                    {isPositive ? "+" : ""}
                    {stock.pnl_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-lg">
                  <span>{isPositive ? "To the Moon" : "Buying the Dip"}</span>
                  {isPositive ? (
                    <Rocket className="text-yellow-400 fill-yellow-400 animate-pulse" />
                  ) : (
                    <TrendingDown className="text-red-400" />
                  )}
                </div>
              </div>

              {/* Privacy-focused value */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-neutral-500 text-xs uppercase">
                  Current Value
                </span>
                <span className="text-white/40 text-xl font-mono blur-sm select-none">
                  ₹XX,XXX
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="z-10 w-full pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-neutral-500">
                Generated by Arthavi
              </span>
              <span className="text-[10px] text-neutral-500">
                {new Date().toLocaleDateString()}
              </span>
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
              Share on Instagram Story
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownload}
                isLoading={downloading}
                className="w-full flex items-center justify-center gap-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white"
                variant="outline">
                <Download size={18} />
                Save Image
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full border border-transparent hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
