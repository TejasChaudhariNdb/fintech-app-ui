"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";

interface SupportArthaviProps {
  vpa?: string; // Your UPI ID (e.g., tejas@okaxis)
  name?: string; // Your Name or 'Arthavi'
  amount?: string; // Optional: preset amount
}

const SupportArthavi = ({
  vpa = "9158110065@ybl",
  name = "Tejas Chaudhari",
  amount,
}: SupportArthaviProps) => {
  const [showQR, setShowQR] = useState(false);

  // Construct the UPI Deep Link
  const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}${amount ? `&am=${amount}` : ""}&cu=INR&tn=${encodeURIComponent("Support Arthavi")}`;

  const handlePayment = () => {
    // Basic mobile detection
    const isMobile =
      typeof window !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = upiUrl;
    } else {
      setShowQR(!showQR);
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 border border-pink-100 dark:border-pink-500/10 rounded-2xl p-5 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center mx-auto mb-3">
        <Heart className="text-pink-500" size={24} fill="currentColor" />
      </div>
      <h3 className="font-bold text-neutral-900 dark:text-white mb-2">
        Support Arthavi
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 px-2 leading-relaxed">
        If Arthavi helps you track and grow your investments, you can support
        us. It helps us build better features.
      </p>

      <button
        onClick={handlePayment}
        className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-current"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
        Donate via UPI
      </button>

      {showQR && (
        <div className="mt-4 p-4 border border-dashed border-neutral-300 dark:border-white/20 rounded-xl bg-neutral-50 dark:bg-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            Scan QR code to donate
          </p>
          {/* USER: Replace the div placeholder with your QR code image */}
          <div className="w-40 h-40 bg-neutral-200 dark:bg-white/10 mx-auto rounded-lg flex items-center justify-center relative overflow-hidden">
            <img
              src="/tejas_qr_phonepe.jpg"
              alt="UPI QR"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs font-mono mt-3 text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-white/10 py-1 px-2 rounded-md inline-block">
            {vpa}
          </p>
        </div>
      )}
    </div>
  );
};

export default SupportArthavi;
