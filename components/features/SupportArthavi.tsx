"use client";

import React, { useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import { api } from "@/lib/api";

const SupportArthavi = () => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!formRef.current) return;
    
    // Check if the script is already added to prevent duplicates in React Strict Mode
    if (formRef.current.querySelector('script')) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.setAttribute("data-payment_button_id", "pl_SiE7rcPLrynvsT");
    script.async = true;

    formRef.current.appendChild(script);
  }, []);

  const handleIntentTrack = async () => {
    try {
      // Record click silently in background
      await api.trackSupportClick("razorpay");
    } catch {
      // ignore
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
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 px-2 leading-relaxed">
        If Arthavi helps you track and grow your investments, you can support
        us. It helps us build better features.
      </p>

      <div className="flex justify-center min-h-[50px]" onClick={handleIntentTrack}>
        {/* Razorpay Button Container */}
        <form ref={formRef} className="w-full flex justify-center items-center m-0"></form>
      </div>
    </div>
  );
};

export default SupportArthavi;
