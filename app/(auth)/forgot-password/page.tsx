"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-900/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="glass-card rounded-3xl p-10 w-full max-w-md z-10 animate-slide-up">
        {/* Back Button */}
        <button
          onClick={() => router.push("/login")}
          className="mb-8 flex items-center text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          Back to Login
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/icon-512x512.png"
              alt="Arthavi Logo"
              width={64}
              height={64}
              className="rounded-2xl shadow-xl shadow-primary-500/20"
            />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white">Reset Password</h1>
          <p className="text-neutral-400">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-6 rounded-2xl text-center">
            <h3 className="font-semibold text-lg mb-2">Check your email</h3>
            <p className="text-sm opacity-90 mb-6">
              If an account exists for {email}, we have sent a password reset
              link.
            </p>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="bg-black/20"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full text-lg py-4"
              variant="primary">
              Send Reset Link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
