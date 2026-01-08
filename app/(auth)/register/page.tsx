"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const data = await api.register(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);

      // On register, always direct to a Setup Wizard or Dashboard with empty state
      // For this MVP, we push to dashboard which now has better empty states.
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-900/20 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-900/10 blur-[100px]" />
      </div>

      <div className="glass-card rounded-3xl p-10 w-full max-w-md z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="text-6xl mb-6">🚀</div>
          <h1 className="text-3xl font-bold mb-3 text-white">Get Started</h1>
          <p className="text-neutral-400">Join thousands of smart investors</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="bg-black/20"
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {error}
            </div>
          )}

          <Button
            type="submit"
            isLoading={loading}
            className="w-full text-lg py-4"
            variant="primary">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-400 mt-8">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-primary-400 font-semibold hover:text-primary-300 transition-colors">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
