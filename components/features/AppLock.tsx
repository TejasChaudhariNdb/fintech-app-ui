"use client";

import { useState, useEffect } from "react";
import { Lock, Fingerprint, ScanFace } from "lucide-react";
import Button from "@/components/ui/Button";

interface AppLockProps {
  onUnlock: () => void;
  isEnabled: boolean;
}

export default function AppLock({ onUnlock, isEnabled }: AppLockProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState("");

  // Check initial lock state
  useEffect(() => {
    if (!isEnabled) return;

    const isSessionUnlocked = sessionStorage.getItem("app_unlocked") === "true";
    if (isSessionUnlocked) {
      setIsLocked(false);
    } else {
      setIsLocked(true);
    }
  }, [isEnabled]);

  const authenticate = async () => {
    setError("");
    setIsAuthenticating(true);

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: "required",
        },
      });

      // If successful (no error thrown), we unlock
      sessionStorage.setItem("app_unlocked", "true");
      setIsLocked(false);
      onUnlock();
    } catch (err: any) {
      console.error("Auth failed:", err);
      // If it looks like a "NotAllowedError" or cancelled, show message
      setError("Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isEnabled || !isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-center p-6 animate-fade-in text-white">
      <div className="w-20 h-20 bg-primary-600/20 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
        <Lock size={40} className="text-primary-500" />
      </div>

      <h1 className="text-2xl font-bold mb-2">App Locked</h1>
      <p className="text-neutral-400 mb-8 text-center max-w-xs">
        Please authenticate to access your portfolio.
      </p>

      {error && (
        <p className="text-red-400 text-sm mb-6 bg-red-500/10 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      <Button
        onClick={authenticate}
        isLoading={isAuthenticating}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 text-lg"
        variant="primary">
        <ScanFace size={24} />
        Unlock with Face ID
      </Button>

      <button
        onClick={authenticate}
        className="mt-6 text-sm text-neutral-500 hover:text-white transition-colors flex items-center gap-2">
        <Fingerprint size={16} />
        Use Touch ID or Passcode
      </button>
    </div>
  );
}
