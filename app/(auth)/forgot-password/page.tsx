"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const RESEND_COOLDOWN_SECONDS = 30;
const RESET_EMAIL_KEY = "reset_email";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const STEPS = [
  {
    title: "Enter your email",
    body: "Use the address you signed up with.",
    icon: Mail,
    tone: "text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400",
  },
  {
    title: "Check your inbox",
    body: "We email you a 6-digit code. Check spam if it's not there.",
    icon: MailCheck,
    tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
  },
  {
    title: "Set a new password",
    body: "Enter the code, choose a new password, and you're back in.",
    icon: KeyRound,
    tone: "text-purple-600 bg-purple-500/10 border-purple-500/20 dark:text-purple-400",
  },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"REQUEST" | "CONFIRM">("REQUEST");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [mismatchError, setMismatchError] = useState("");
  const [toast, setToast] = useState({
    message: "",
    type: "error" as "success" | "error",
    isVisible: false,
  });

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      router.replace("/");
    }
  }, [router]);

  // Prefill the email the user already typed on the sign-in screen.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(RESET_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* storage unavailable: the user types the email */
    }
  }, []);

  // Hide the toast after a few seconds.
  useEffect(() => {
    if (!toast.isVisible) return;
    const timer = setTimeout(
      () => setToast((prev) => ({ ...prev, isVisible: false })),
      3000
    );
    return () => clearTimeout(timer);
  }, [toast.isVisible, toast.message]);

  // Countdown for the "resend code" button.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToast({ message: msg, type, isVisible: true });
  };

  const rememberEmail = (value: string) => {
    try {
      sessionStorage.setItem(RESET_EMAIL_KEY, value);
    } catch {
      /* storage unavailable */
    }
  };

  const sendCode = async () => {
    await api.requestPasswordReset(email);
    setResendIn(RESEND_COOLDOWN_SECONDS);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await sendCode();
      rememberEmail(email);
      showToast("Reset code sent to your email", "success");
      setStep("CONFIRM");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to send reset code"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    try {
      await sendCode();
      showToast("A new code is on its way", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to resend code"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatchError("Passwords do not match");
      return;
    }
    setMismatchError("");
    setLoading(true);
    try {
      await api.confirmPasswordReset(email, token, newPassword);
      try {
        sessionStorage.removeItem(RESET_EMAIL_KEY);
      } catch {
        /* storage unavailable */
      }
      showToast("Password updated! Redirecting to sign in...", "success");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to reset password"), "error");
    } finally {
      setLoading(false);
    }
  };

  const goBackToRequest = () => {
    setStep("REQUEST");
    setToken("");
    setNewPassword("");
    setConfirmPassword("");
    setMismatchError("");
  };

  const stepNumber = step === "REQUEST" ? 1 : 2;

  return (
    <div className="relative min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-12 overflow-hidden transition-colors duration-300">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[560px] w-[560px] rounded-full bg-purple-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl" />

      {/* Toast */}
      {toast.isVisible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-green-500/30 bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              : "border-red-500/30 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-12">
        {/* ── Left: brand + how it works ── */}
        <div className="space-y-8 lg:col-span-7">
          <div className="flex items-center gap-3">
            <Image
              src="/icon-512x512.png"
              alt="Arthavi Logo"
              width={44}
              height={44}
              className="rounded-xl shadow-lg shadow-primary-500/25"
            />
            <span className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Arthavi
            </span>
          </div>

          <div className="space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
              <Sparkles className="h-3.5 w-3.5" />
              Account recovery
            </p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 dark:text-white xl:text-4xl">
              Locked out? Get back to{" "}
              <span className="bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                your portfolio
              </span>{" "}
              in minutes.
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 xl:text-base">
              Your family&apos;s wealth picture is one reset away. Three quick steps and you&apos;ll be signed in again.
            </p>
          </div>

          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.title}
                  className="flex items-start gap-3.5 rounded-2xl border border-neutral-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-white/5 dark:bg-white/[0.03]">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${s.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      <span className="mr-1.5 text-neutral-400 dark:text-neutral-500">{i + 1}.</span>
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-primary-500/10 to-purple-500/10 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              Your password is never sent by email. Only the one-time code is, and it can only be used to set a new password.
            </p>
          </div>
        </div>

        {/* ── Right: form card ── */}
        <div className="w-full max-w-md justify-self-center lg:col-span-5">
          <div className="relative animate-slide-up rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl shadow-neutral-200/60 dark:border-white/5 dark:bg-[#151A23] dark:shadow-black/40 sm:p-10">
            {/* Step indicator */}
            <div className="mb-6 flex items-center justify-center gap-2" aria-label={`Step ${stepNumber} of 2`}>
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    n === stepNumber
                      ? "w-8 bg-gradient-to-r from-primary-500 to-purple-500"
                      : n < stepNumber
                        ? "w-4 bg-primary-500/50"
                        : "w-4 bg-neutral-200 dark:bg-white/10"
                  }`}
                />
              ))}
            </div>

            <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {step === "REQUEST" ? "Reset your password" : "Enter your code"}
            </h1>
            <p className="mx-auto mb-8 max-w-xs text-center text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {step === "REQUEST" ? (
                "Enter the email linked to your account and we'll send you a 6-digit code."
              ) : (
                <>
                  We sent a code to{" "}
                  <span className="break-all font-medium text-neutral-800 dark:text-neutral-200">{email}</span>.
                </>
              )}
            </p>

            {step === "REQUEST" ? (
              <form onSubmit={handleRequestReset} className="space-y-6">
                <Input
                  type="email"
                  label="Email address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  leftIcon={<Mail className="h-5 w-5" />}
                  required
                />
                <Button type="submit" isLoading={loading} className="w-full py-3" variant="primary">
                  Send reset code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-5">
                <Input
                  type="text"
                  label="6-digit code"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\s/g, ""))}
                  placeholder="123456"
                  required
                  className="text-center text-lg font-semibold tracking-[0.5em]"
                />

                <Input
                  type="password"
                  label="New password"
                  name="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new password"
                  leftIcon={<Lock className="h-5 w-5" />}
                  required
                />

                <Input
                  type="password"
                  label="Confirm new password"
                  name="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (mismatchError) setMismatchError("");
                  }}
                  placeholder="Re-enter your new password"
                  leftIcon={<Lock className="h-5 w-5" />}
                  error={mismatchError}
                  required
                />

                <Button type="submit" isLoading={loading} className="w-full py-3" variant="primary">
                  Reset password
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={goBackToRequest}
                    className="text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                    Wrong email?
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendIn > 0 || loading}
                    className="font-medium text-primary-600 transition-colors hover:text-primary-500 disabled:cursor-not-allowed disabled:text-neutral-400 dark:text-primary-400 dark:disabled:text-neutral-500">
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 border-t border-neutral-200 pt-6 text-center dark:border-white/5">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Didn&apos;t get the email? Check spam, then resend after the countdown.
          </p>
        </div>
      </div>
    </div>
  );
}
