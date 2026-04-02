"use client";

import React, { useState } from "react";
import { Heart, X, Link as LinkIcon } from "lucide-react";

interface SupportArthaviProps {
  vpa?: string; // Your UPI ID
  name?: string; // Your Name or 'Arthavi'
  amount?: string; // Optional: preset amount
}

const SupportArthavi = ({
  vpa = "9158110065@ybl",
  name = "Tejas Chaudhari",
  amount,
}: SupportArthaviProps) => {
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const getUpiUrl = (scheme: string) => {
    return `${scheme}?pa=${vpa}&pn=${encodeURIComponent(name)}${amount ? `&am=${amount}` : ""}&cu=INR&tn=${encodeURIComponent("Support Arthavi")}`;
  };

  const handleAppSelect = (scheme: string) => {
    window.location.assign(getUpiUrl(scheme));
    setShowPaymentSheet(false);
  };

  const paymentApps = [
    {
      id: "phonepe",
      name: "PhonePe",
      scheme: "phonepe://pay",
      color: "bg-[#5f259f] text-white border-transparent",
    },
    {
      id: "gpay",
      name: "Google Pay",
      scheme: "tez://upi/pay",
      color:
        "bg-white text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700",
    },
    {
      id: "paytm",
      name: "Paytm",
      scheme: "paytmmp://pay",
      color: "bg-[#002e6e] text-white border-transparent",
    },
    {
      id: "cred",
      name: "CRED",
      scheme: "credpay://upi/pay",
      color:
        "bg-black text-white border-transparent dark:bg-neutral-800 dark:border-neutral-700",
    },
    {
      id: "other",
      name: "Other UPI Apps",
      scheme: "upi://pay",
      color:
        "bg-neutral-100 text-neutral-800 border-transparent dark:bg-white/10 dark:text-white",
    },
  ];

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
        onClick={() => setShowPaymentSheet(true)}
        className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-current"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
        Donate via UPI
      </button>

      {/* QR Code is always visible now */}
      <div className="mt-5 p-4 border border-dashed border-neutral-300 dark:border-white/20 rounded-xl bg-neutral-50 dark:bg-white/5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">
          Or scan QR code to donate
        </p>
        <div className="w-40 h-40 bg-neutral-200 dark:bg-white/10 mx-auto rounded-lg flex items-center justify-center relative overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10">
          <img
            src="/tejas_qr_phonepe.jpg"
            alt="UPI QR"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xs font-mono mt-3 text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-white/10 py-1.5 px-3 rounded-lg inline-block select-all">
          {vpa}
        </p>
      </div>

      {/* Modern Bottom Sheet Payment Options */}
      {showPaymentSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50 transition-opacity backdrop-blur-sm"
            onClick={() => setShowPaymentSheet(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] rounded-t-3xl z-50 p-6 pb-safe animate-in slide-in-from-bottom duration-300 border-t border-white/10 shadow-2xl">
            {/* Handle */}
            <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-6" />

            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                Choose Payment App
              </h4>
              <button
                onClick={() => setShowPaymentSheet(false)}
                className="p-2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/20 transition-colors">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 text-left">
              Select any UPI app below to proceed securely.
            </p>

            <div className="space-y-3">
              {paymentApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleAppSelect(app.scheme)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border font-semibold text-sm transition-transform active:scale-[0.98] ${app.color}`}>
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-black/5 dark:border-white/10">
                    {/* USER: Add your 1:1 square aspect ratio logos inside public/logos/ directory */}
                    {app.id === "other" ? (
                      <LinkIcon
                        size={16}
                        className="text-neutral-500 dark:text-neutral-400"
                      />
                    ) : (
                      <img
                        src={`/upiapps/${app.id}.webp`}
                        alt={`${app.name} logo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to a default icon if the image fails to load
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  {app.name}
                </button>
              ))}
            </div>

            <div className="mt-8 mb-2 pb-6 flex justify-center">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 fill-current"
                  xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                100% Safe & Secure UPI Payment
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SupportArthavi;
