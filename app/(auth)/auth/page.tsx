"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Mail,
  Lock,
  ArrowRight,
  LayoutDashboard,
  Loader2,
  User,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type AuthTab = "signin" | "signup";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial tab from URL param (?tab=signup)
  const initialTab: AuthTab =
    searchParams.get("tab") === "signup" ? "signup" : "signin";

  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({});
  const signinRef = useRef<HTMLButtonElement>(null);
  const signupRef = useRef<HTMLButtonElement>(null);

  // Animate the sliding pill indicator under the tabs
  useEffect(() => {
    const el = activeTab === "signin" ? signinRef.current : signupRef.current;
    if (el) {
      setTabIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const impersonateToken = searchParams.get("impersonate_token");
    if (impersonateToken) {
      localStorage.setItem("access_token", impersonateToken);
      router.replace("/");
      return;
    }
    const errorParam = searchParams.get("error");
    if (errorParam) setError(decodeURIComponent(errorParam));

    document.title = "Sign In — Arthavi";

    if (localStorage.getItem("access_token")) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
    }
  }, [router, searchParams]);

  // Track signup_started when switching to signup tab
  useEffect(() => {
    if (!isCheckingAuth && activeTab === "signup") {
      analytics.track({ name: "signup_started" });
    }
    setError("");
    setSuccessMsg("");
  }, [activeTab, isCheckingAuth]);

  const handleGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri:
      typeof window !== "undefined"
        ? window.location.origin + "/google-callback"
        : undefined,
    prompt: "select_account",
    onError: () => setError("Google sign-in failed. Please try again."),
  } as any);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.login(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      analytics.identifyUser(email, email);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.register(email, password, "other");
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      analytics.identifyUser(email, email, { signup_source: "other" });
      analytics.track({
        name: "signup_completed",
        properties: { email, signup_source: "other" },
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setPassword("");
    setError("");
    setSuccessMsg("");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">
          Checking session…
        </p>
      </div>
    );
  }

  const isSignIn = activeTab === "signin";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4 overflow-hidden relative transition-colors duration-300">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl p-8 lg:p-10 w-full max-w-md z-10 shadow-2xl shadow-neutral-200/60 dark:shadow-black/40 backdrop-blur-xl animate-slide-up">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary-500/25 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-60" />
            <Image
              src="/icon-512x512.png"
              alt="Arthavi Logo"
              width={64}
              height={64}
              className="rounded-2xl relative shadow-lg"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="relative flex bg-neutral-100 dark:bg-black/30 rounded-2xl p-1 mb-8 gap-1">
          {/* Sliding pill */}
          <div
            className="absolute top-1 bottom-1 bg-white dark:bg-[#1E2533] rounded-xl shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={tabIndicatorStyle}
          />
          <button
            ref={signinRef}
            id="auth-tab-signin"
            type="button"
            onClick={() => switchTab("signin")}
            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 z-10 ${
              isSignIn
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Sign In
          </button>
          <button
            ref={signupRef}
            id="auth-tab-signup"
            type="button"
            onClick={() => switchTab("signup")}
            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 z-10 ${
              !isSignIn
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Heading */}
        <div className="text-center mb-7">
          <h1
            key={activeTab}
            className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight transition-all duration-200 animate-slide-up"
          >
            {isSignIn ? "Welcome back 👋" : "Join Arthavi 🚀"}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            {isSignIn
              ? "Sign in to manage your wealth"
              : "Track your wealth, investments & more"}
          </p>
        </div>

        {/* Google Button */}
        <button
          type="button"
          id="auth-google-btn"
          onClick={() => handleGoogleLogin()}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-all duration-200 text-neutral-700 dark:text-white font-medium bg-white dark:bg-transparent group mb-5"
        >
          <svg
            className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
            viewBox="0 0 24 24"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {isSignIn ? "Sign in with Google" : "Sign up with Google"}
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white dark:bg-[#151A23] text-neutral-400">
              or continue with email
            </span>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={isSignIn ? handleSignIn : handleSignUp}
          className="space-y-4"
        >
          <Input
            type="email"
            label="Email Address"
            id="auth-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            leftIcon={<Mail className="w-5 h-5" />}
            className="bg-neutral-50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40"
          />

          <div>
            <Input
              type="password"
              label="Password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignIn ? "••••••••" : "Create a strong password"}
              required
              leftIcon={<Lock className="w-5 h-5" />}
              className="bg-neutral-50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40"
            />

            {/* Password hint for signup */}
            {!isSignIn && password && password.length < 6 && (
              <p className="text-xs text-amber-500 mt-1.5 ml-1 flex items-center gap-1">
                Must be at least 6 characters
              </p>
            )}

            {/* Forgot password — only on signin */}
            {isSignIn && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-shake">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* CTA */}
          <Button
            type="submit"
            isLoading={loading}
            id="auth-submit-btn"
            className="w-full text-base py-3.5 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300"
            variant="primary"
          >
            {isSignIn ? "Sign In" : "Create Account"}
            {!loading && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
          </Button>

          {/* Demo button — only on signin */}
          {isSignIn && (
            <button
              type="button"
              id="auth-demo-btn"
              onClick={() => router.push("/demo")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border border-indigo-200 dark:border-indigo-500/30 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-transparent group"
            >
              <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              Try Demo Account
            </button>
          )}
        </form>

        {/* Switch tab hint */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
          {isSignIn ? (
            <>
              New to Arthavi?{" "}
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className="text-primary-600 dark:text-primary-400 font-bold hover:text-primary-700 dark:hover:text-primary-300 transition-colors underline underline-offset-2"
              >
                Create a free account →
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchTab("signin")}
                className="text-primary-600 dark:text-primary-400 font-bold hover:text-primary-700 dark:hover:text-primary-300 transition-colors underline underline-offset-2"
              >
                Sign in →
              </button>
            </>
          )}
        </p>
      </div>

      {/* Footer tagline */}
      <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-6 z-10 text-center">
        By continuing, you agree to Arthavi&apos;s{" "}
        <span className="underline underline-offset-2 cursor-pointer hover:text-neutral-500 transition-colors">
          Terms
        </span>{" "}
        &amp;{" "}
        <span className="underline underline-offset-2 cursor-pointer hover:text-neutral-500 transition-colors">
          Privacy Policy
        </span>
        .
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">
            Loading…
          </p>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
