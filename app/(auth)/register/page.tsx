"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGoogleLogin } from "@react-oauth/google";
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

  useEffect(() => {
    // Redirect if already logged in
    if (localStorage.getItem("access_token")) {
      router.replace("/");
    }
  }, [router]);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setError("");
        const data = await api.googleLogin(tokenResponse.access_token);
        localStorage.setItem("access_token", data.access_token);
        router.push("/");
      } catch (err: any) {
        setError(err.message || "Google Signup Failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google Signup Failed"),
  });

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
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 overflow-hidden relative">
      {/* ... */}

      <div className="glass-card rounded-3xl p-10 w-full max-w-md z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Image
              src="/icon-512x512.png"
              alt="Arthavi Logo"
              width={80}
              height={80}
              className="rounded-2xl shadow-2xl shadow-primary-500/20"
            />
          </div>
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#151a23] text-neutral-500">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-700 rounded-xl hover:bg-white/5 transition-colors text-white font-medium">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={() => router.push("/demo")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-colors text-indigo-300 font-medium bg-transparent mt-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Try Demo Account
          </button>
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
