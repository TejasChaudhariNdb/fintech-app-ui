"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  CheckCircle2,
  UserPlus,
  LogIn,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = "email" | "login" | "register";

// ─── Main form component ──────────────────────────────────────────────────────
function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);


  // ── Auth guard, error from URL & page-view tracking ─────────────────────
  useEffect(() => {
    const impersonateToken = searchParams.get("impersonate_token");
    if (impersonateToken) {
      localStorage.setItem("access_token", impersonateToken);
      router.replace("/");
      return;
    }
    const errorParam = searchParams.get("error");
    if (errorParam) setError(decodeURIComponent(errorParam));
    const sessionExpired = searchParams.get("session_expired");
    if (sessionExpired === "true") {
      setError("Your session has expired. Please sign in again.");
    }
    document.title = "Sign In — Arthavi";
    if (localStorage.getItem("access_token")) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
      // Track that the user landed on the auth page
      analytics.track({
        name: "auth_page_viewed",
        properties: { referrer: document.referrer || undefined },
      });
    }
  }, [router, searchParams]);

  // ── Google OAuth ─────────────────────────────────────────────────────────
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

  const onGoogleClick = () => {
    analytics.track({ name: "auth_google_clicked", properties: { step: "email" } });
    handleGoogleLogin();
  };

  // ── Smooth step transition ────────────────────────────────────────────────
  const transitionTo = (next: Step) => {
    setAnimating(true);
    setError("");
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  };

  // ── Step 1: Email submitted ───────────────────────────────────────────────
  // Calls /auth/check-email → backend does a simple DB read and returns
  // {exists: true}  → show the Login (password) step
  // {exists: false} → show the Register (create password) step
  // No account is ever created here. No junk data sent.
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    // We only track the domain (e.g. "gmail.com"), never the full email
    const emailDomain = email.trim().toLowerCase().split("@")[1] ?? "unknown";
    analytics.track({ name: "auth_email_submitted", properties: { email_domain: emailDomain } });

    try {
      const { exists } = await api.checkEmail(email.trim().toLowerCase());
      if (exists) {
        analytics.track({ name: "auth_existing_user_detected", properties: { email_domain: emailDomain } });
        transitionTo("login");
      } else {
        analytics.track({ name: "auth_new_user_detected", properties: { email_domain: emailDomain } });
        analytics.track({ name: "signup_started" });
        transitionTo("register");
      }
    } catch (err: any) {
      analytics.track({ name: "auth_email_check_failed", properties: { reason: err.message || "unknown" } });
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2a: Login ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowReactivate(false);
    try {
      const data = await api.login(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      analytics.identifyUser(email, email);
      analytics.track({ name: "auth_login_success", properties: { method: "email" } });
      window.location.href = "/";
    } catch (err: any) {
      const reason = err.message || "Incorrect password";
      analytics.track({ name: "auth_login_failed", properties: { method: "email", reason } });
      if (err.message === "Account is deactivated") {
        setError("Your account is deactivated/deleted. Would you like to reactivate it?");
        setShowReactivate(true);
      } else {
        setError(reason + ". Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.reactivate(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      analytics.identifyUser(email, email);
      analytics.track({ name: "auth_reactivation_success", properties: { method: "email" } });
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Failed to reactivate account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2b: Register ─────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.register(email, password, "other");
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);
      analytics.identifyUser(email, email, { signup_source: "other" });
      analytics.track({ name: "auth_register_success", properties: { method: "email" } });
      analytics.track({ name: "signup_completed", properties: { email, signup_source: "other" } });
      window.location.href = "/";
    } catch (err: any) {
      const reason = err.message || "Registration failed";
      analytics.track({ name: "auth_register_failed", properties: { method: "email", reason } });
      setError(reason + ". Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    analytics.track({ name: "auth_back_clicked", properties: { from_step: step as "login" | "register" } });
    setAnimating(true);
    setError("");
    setPassword("");
    setTimeout(() => {
      setStep("email");
      setAnimating(false);
    }, 220);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Step metadata ─────────────────────────────────────────────────────────
  const stepMeta = {
    email: {
      heading: "Welcome to Arthavi",
      sub: "Enter your email to get started",
      icon: null,
    },
    login: {
      heading: "Welcome back 👋",
      sub: `Signing in as ${email}`,
      icon: <LogIn className="w-4 h-4 text-primary-500" />,
    },
    register: {
      heading: "Create your account 🚀",
      sub: `Setting up account for ${email}`,
      icon: <UserPlus className="w-4 h-4 text-emerald-500" />,
    },
  };

  const meta = stepMeta[step];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-12 overflow-y-auto relative transition-colors duration-300">
      {/* Ambient background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-700" />
      <div
        className={`absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none transition-all duration-700 ${step === "register"
          ? "bg-emerald-500/10"
          : "bg-indigo-500/10"
          }`}
      />

      <div className="w-full max-w-5xl my-auto z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* ── Left Side: Desktop Value Showcase (Hidden on Mobile) ── */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 pr-4">
          {/* Logo & Brand Pill */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary-500/25 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-60" />
              <Image
                src="/icon-512x512.png"
                alt="Arthavi Logo"
                width={52}
                height={52}
                className="rounded-2xl relative shadow-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Arthavi</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                  Wealth OS
                </span>
              </div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Smart Family Wealth &amp; Portfolio Intelligence</p>
            </div>
          </div>

          {/* Value Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight">
              Track family wealth.{" "}
              <span className="bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                Beat inflation.
              </span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm xl:text-base leading-relaxed">
              Consolidated real-time analytics for Mutual Funds, Indian Equities, and Multi-Member family portfolios with true XIRR tracking.
            </p>
          </div>

          {/* Feature Highlights Cards */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 backdrop-blur-md shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Multi-Member Family Tracking</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Toggle between individual accounts and consolidated family wealth in 1 tap.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 backdrop-blur-md shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">ITR-Ready Capital Gains Statements</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Instant automated LTCG &amp; STCG calculations ready for tax season.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/5 backdrop-blur-md shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Arthavi AI Wealth Copilot</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Ask questions anytime about portfolio overlap, asset allocation, or tax tips.</p>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="pt-2 flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bank-grade 256-bit encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary-500" />
              <span>10,000+ Smart Investors</span>
            </div>
          </div>
        </div>

        {/* ── Right Side: Auth Card (Mobile & Desktop) ── */}
        <div className="w-full max-w-md mx-auto lg:col-span-5">
          <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl shadow-neutral-200/60 dark:shadow-black/40 backdrop-blur-xl animate-slide-up">

            {/* Mobile Logo */}
            <div className="flex lg:hidden justify-center mb-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary-500/25 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-60" />
                <Image
                  src="/icon-512x512.png"
                  alt="Arthavi Logo"
                  width={48}
                  height={48}
                  className="rounded-2xl relative shadow-lg"
                />
              </div>
            </div>

            {/* Tagline — only shown on Step 1 on mobile */}
            {step === "email" && (
              <div className="text-center lg:hidden mb-4">
                <p className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                  Track wealth.{" "}
                  <span className="bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent">
                    Beat the market.
                  </span>
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  Join 10,000+ investors tracking net worth for free
                </p>
              </div>
            )}

            {/* Step indicator pills */}
            <div className="flex justify-center gap-1.5 mb-5">
              {(["email", step === "login" ? "login" : "register"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${(step === "email" && i === 0) || (step !== "email" && i === 1)
                    ? step === "register"
                      ? "w-8 bg-emerald-500"
                      : "w-8 bg-primary-500"
                    : "w-4 bg-neutral-200 dark:bg-neutral-700"
                    }`}
                />
              ))}
            </div>

            {/* Heading area */}
            <div
              className={`text-center mb-5 transition-all duration-200 ${animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
            >
              {/* Email badge (shown after email step) */}
              {step !== "email" && (
                <div className="flex items-center justify-center gap-2 mb-2.5">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${step === "login"
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-500/20"
                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      }`}
                  >
                    {meta.icon}
                    {step === "login" ? "Existing account" : "New account"}
                  </div>
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {meta.heading}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-1 truncate px-2">
                {meta.sub}
              </p>
            </div>

            {/* ── Google button (only on email step) ── */}
            {step === "email" && (
              <>
                <button
                  type="button"
                  id="auth-google-btn"
                  onClick={onGoogleClick}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-all duration-200 text-neutral-700 dark:text-white font-medium bg-white dark:bg-transparent group mb-4 text-sm"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white dark:bg-[#151A23] text-neutral-400">or continue with email</span>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 1: Email input ── */}
            <div className={`transition-all duration-200 ${animating ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email Address"
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
                leftIcon={<Mail className="w-5 h-5" />}
                className="bg-neutral-50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40"
              />

              {error && <ErrorBox message={error} />}

              <Button
                type="submit"
                isLoading={loading}
                id="auth-email-submit"
                className="w-full text-base py-3.5 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300"
                variant="primary"
              >
                Continue
                {!loading && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
              </Button>

              {/* Trust line — answers "is this worth my email?" */}
              <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 flex items-center justify-center gap-2">
                <span>✓ Free forever</span>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span>✓ No credit card</span>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span>✓ 5-sec signup</span>
              </p>

              <button
                type="button"
                id="auth-demo-btn"
                onClick={() => {
                  analytics.track({ name: "auth_demo_clicked" });
                  router.push("/demo");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border border-indigo-200 dark:border-indigo-500/30 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-transparent group"
              >
                <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                Try Demo Account
              </button>
            </form>
          )}

          {/* ── STEP 2a: Login (existing user) ── */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email display chip (read-only) */}
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-100 dark:bg-black/20 border border-neutral-200 dark:border-neutral-800">
                <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate flex-1">{email}</span>
                <button
                  type="button"
                  onClick={goBack}
                  className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              <div>
                <Input
                  type="password"
                  label="Password"
                  id="auth-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  leftIcon={<Lock className="w-5 h-5" />}
                  className="bg-neutral-50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {error && <ErrorBox message={error} />}

              {showReactivate ? (
                <Button
                  type="button"
                  onClick={handleReactivate}
                  isLoading={loading}
                  className="w-full text-base py-3.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 !bg-emerald-600 hover:!bg-emerald-700"
                >
                  Reactivate Account
                  {!loading && <CheckCircle2 className="w-5 h-5 ml-2 inline-block" />}
                </Button>
              ) : (
                <Button
                  type="submit"
                  isLoading={loading}
                  id="auth-login-submit"
                  className="w-full text-base py-3.5 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300"
                  variant="primary"
                >
                  Sign In
                  {!loading && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
                </Button>
              )}

              <button
                type="button"
                onClick={goBack}
                className="w-full flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors py-2 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
                Use a different email or Google
              </button>
            </form>
          )}

          {/* ── STEP 2b: Register (new user) ── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Email display chip */}
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate flex-1">{email}</span>
                <button
                  type="button"
                  onClick={goBack}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              <div>
                <Input
                  type="password"
                  label="Create Password"
                  id="auth-new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  autoFocus
                  leftIcon={<Lock className="w-5 h-5" />}
                  className="bg-neutral-50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40"
                />
                {password && password.length < 6 && (
                  <p className="text-xs text-amber-500 mt-1.5 ml-1">Must be at least 6 characters</p>
                )}
                {password.length >= 6 && (
                  <p className="text-xs text-emerald-500 mt-1.5 ml-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Looks good!
                  </p>
                )}
              </div>

              {error && <ErrorBox message={error} />}

              <Button
                type="submit"
                isLoading={loading}
                id="auth-register-submit"
                className="w-full text-base py-3.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 !bg-emerald-600 hover:!bg-emerald-700"
                variant="primary"
              >
                Create Account
                {!loading && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
              </Button>

              <button
                type="button"
                onClick={goBack}
                className="w-full flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors py-2 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
                Use a different email or Google
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Terms & Privacy */}
      <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-4 text-center">
        By continuing, you agree to Arthavi&apos;s{" "}
        <span className="underline underline-offset-2 cursor-pointer hover:text-neutral-500 transition-colors">Terms</span>{" "}
        &amp;{" "}
        <span className="underline underline-offset-2 cursor-pointer hover:text-neutral-500 transition-colors">Privacy Policy</span>.
      </p>
    </div>
  </div>
</div>
  );
}

// ─── Reusable error box ───────────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-shake">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Loading…</p>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
