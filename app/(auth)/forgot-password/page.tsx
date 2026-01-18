"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"REQUEST" | "CONFIRM">("REQUEST");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    type: "error",
    isVisible: false,
  });

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToast({ message: msg, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.requestPasswordReset(email);
      showToast("Reset code sent to your email", "success");
      setStep("CONFIRM");
    } catch (err: any) {
      showToast(err.message || "Failed to send reset code", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      await api.confirmPasswordReset(email, token, newPassword);
      showToast("Password updated! Redirecting to login...", "success");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      showToast(err.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-10 w-full max-w-md animate-slide-up">
        <div className="flex justify-center mb-6">
          <Image
            src="/icon-512x512.png"
            alt="Arthavi Logo"
            width={60}
            height={60}
            className="rounded-xl shadow-lg shadow-primary-500/20"
          />
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">
          {step === "REQUEST"
            ? "Reset Your Password"
            : "Verify OTP & Set Password"}
        </h1>
        <p className="text-center text-neutral-400 text-sm mb-8">
          {step === "REQUEST"
            ? "Enter your email associated with your account"
            : `Enter the code sent to ${email}`}
        </p>

        {step === "REQUEST" ? (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="bg-black/20"
            />
            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3"
              variant="primary">
              Send Reset Code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-6">
            <Input
              type="text"
              label="OTP Code from Email"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
              required
              className="bg-black/20 tracking-widest text-center text-lg"
            />

            <Input
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-black/20"
            />

            <Input
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-black/20"
            />

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3"
              variant="primary">
              Reset Password
            </Button>

            <button
              type="button"
              onClick={() => setStep("REQUEST")}
              className="w-full text-sm text-neutral-500 hover:text-white transition-colors">
              Wrong email? Go back
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-neutral-400 hover:text-primary-400 transition-colors">
            Back to Login
          </button>
        </div>

        {/* Simplistic Toast */}
        {toast.isVisible && (
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg transition-all ${
              toast.type === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
