"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { useProfile } from "@/context/ProfileContext";

import NetWorthCard from "@/components/features/NetWorthCard";
import PortfolioSummary from "@/components/features/PortfolioSummary";
import PerformanceChart from "@/components/features/PerformanceChart";
import GoalCard from "@/components/features/GoalCard";
import Button from "@/components/ui/Button";
import Toast, { ToastType } from "@/components/ui/Toast";
import OnboardingWizard from "@/components/features/OnboardingWizard";
import {
  FileText,
  AlertTriangle,
  ArrowRight,
  Gift,
  Loader2,
  TrendingUp,
  LineChart,
  Users,
  Plus,
} from "lucide-react";

import InsightsCard from "@/components/features/InsightsCard";
import PortfolioHealthCard from "@/components/features/PortfolioHealthCard";
import BenchmarkCard from "@/components/features/BenchmarkCard";
import MarketPredictionCard from "@/components/features/MarketPredictionCard";
import AssetAllocationCard from "@/components/features/AssetAllocationCard";

export default function HomePage() {
  const router = useRouter();
  const { activeProfileId, profiles } = useProfile();
  const [netWorth, setNetWorth] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [familySummary, setFamilySummary] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]); // New State
  const [userProfile, setUserProfile] = useState<any>(null); // New State

  const [benchmark, setBenchmark] = useState<any>(null); // New State
  const [loading, setLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  // Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: ToastType;
  }>({ show: false, message: "", type: "info" });

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  };

  // 1. One-time mount effect for UTM Analytics
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const utmCampaign = urlParams.get("utm_campaign");
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      
      if (
        utmCampaign === "weekly_summary" || 
        utmSource === "weekly_summary" || 
        urlParams.get("ref") === "weekly_summary"
      ) {
        analytics.track({
          name: "weekly_summary_clicked",
          properties: {
            medium: (utmMedium as "email" | "push") || "email",
            cohort_week: urlParams.get("cohort_week") || "unknown",
          },
        });
      }
    }
  }, []);

  // 2. Profile-aware data loading
  useEffect(() => {
    loadData();
  }, [activeProfileId]);

  const loadData = async () => {
    try {
      console.log("Loading dashboard data...", activeProfileId);
      setError("");

      const userEmail = localStorage.getItem("user_email") || "anonymous";
      const getCache = (key: string) => localStorage.getItem(`${userEmail}:${key}:${activeProfileId}`);

      if (activeProfileId === "all") {
        // --- ALL FAMILY DASHBOARD LOAD ---
        // 1. Try Cache
        const cachedFam = getCache("family-summary");
        const cachedGoals = getCache("goals");

        if (cachedFam) {
          try {
            const parsedFam = JSON.parse(cachedFam);
            setFamilySummary(parsedFam.data);
            if (cachedGoals) setGoals(JSON.parse(cachedGoals).data);
            setLoading(false);
          } catch (e) {
            console.warn("Invalid cached family summary", e);
          }
        }

        // 2. Fetch Fresh Data
        const [famData, g, up] = await Promise.all([
          api.getFamilySummary().catch((err) => {
            console.error("Family summary error:", err);
            return null;
          }),
          api.getGoals().catch((err) => {
            console.error("Goals error:", err);
            return [];
          }),
          api.getUserProfile().catch((err) => {
            console.error("Profile error:", err);
            return null;
          }),
        ]);

        if (famData) setFamilySummary(famData);
        setGoals(g);
        if (up) {
          setUserProfile(up);
          analytics.identifyUser(up.email || up.id, up.email, {
            full_name: up.full_name,
            phone_number: up.phone_number,
            signup_source: up.signup_source,
          });
        }
      } else {
        // --- INDIVIDUAL PROFILE DASHBOARD LOAD ---
        // 1. Try to load from cache first
        const cachedNw = getCache("net-worth");
        const cachedPs = getCache("portfolio-summary");
        const cachedGoals = getCache("goals");
        const cachedHistory = getCache("portfolio-history");
        const cachedXirr = getCache("xirr");
        const cachedInsights = getCache("insights");

        if (cachedNw && cachedPs) {
          try {
            const parsedNw = JSON.parse(cachedNw);
            const parsedXirr = cachedXirr ? JSON.parse(cachedXirr).data : null;
            setNetWorth(parsedNw.data);
            setSummary({
              ...JSON.parse(cachedPs).data,
              xirr: parsedXirr?.xirr || 0,
              mf_xirr: parsedXirr?.mf_xirr || 0,
              stock_xirr: parsedXirr?.stock_xirr || 0,
            });
            if (cachedGoals) setGoals(JSON.parse(cachedGoals).data);
            if (cachedHistory) setPerfData(JSON.parse(cachedHistory).data);
            if (cachedInsights) setInsights(JSON.parse(cachedInsights).data);

            setLoading(false);

            const cacheTimestamp = parsedNw.timestamp || 0;
            const hoursSinceCache = (Date.now() - cacheTimestamp) / (1000 * 60 * 60);
            if (hoursSinceCache > 6) {
              setIsBackgroundRefreshing(true);
            }
          } catch (e) {
            console.warn("Invalid cache data", e);
          }
        }

        // 2. Fetch Fresh Data in Background
        const [nw, ps, g, xirrData, history, ins, bm, up] = await Promise.all([
          api.getNetWorth().catch((err) => {
            console.error("Net worth error:", err);
            return { net_worth: 0, mutual_funds: 0, stocks: 0 };
          }),
          api.getPortfolioSummary().catch((err) => {
            console.error("Portfolio summary error:", err);
            return {
              invested: 0,
              current: 0,
              profit: 0,
              return_pct: 0,
              day_change: 0,
              day_change_pct: 0,
            };
          }),
          api.getGoals().catch((err) => {
            console.error("Goals error:", err);
            return [];
          }),
          api.getXIRR().catch((err) => {
            console.error("XIRR error:", err);
            return { xirr: 0 };
          }),
          api.getPortfolioHistory().catch((err) => {
            console.error("History error:", err);
            return [];
          }),
          api.getInsights().catch((err) => {
            console.error("Insights error:", err);
            return [];
          }),
          api.getBenchmark().catch((err) => {
            console.error("Benchmark error:", err);
            return null;
          }),
          api.getUserProfile().catch((err) => {
            console.error("Profile error:", err);
            return null;
          }),
        ]);

        setNetWorth(nw);
        setSummary({
          ...ps,
          xirr: xirrData?.xirr || 0,
          mf_xirr: xirrData?.mf_xirr || 0,
          stock_xirr: xirrData?.stock_xirr || 0,
        });
        setGoals(g);
        setPerfData(history);
        setInsights(ins);
        setBenchmark(bm);
        if (up) {
          setUserProfile(up);
          analytics.identifyUser(up.email || up.id, up.email, {
            full_name: up.full_name,
            phone_number: up.phone_number,
            signup_source: up.signup_source,
          });
        }
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setIsBackgroundRefreshing(false);
    }
  };

  const handleRefreshNAVs = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      showToast("Updating portfolio values...", "loading");

      // 1. Capture current "last updated" time (to compare against)
      const initialLastUpdated = netWorth?.last_updated
        ? new Date(netWorth.last_updated).getTime()
        : 0;

      // 2. Trigger Background Task
      await api.refreshNAVs();

      // 3. Start Polling for completion
      const pollInterval = setInterval(async () => {
        try {
          const latestNetWorth = await api.getNetWorth();
          const newLastUpdated = latestNetWorth.last_updated
            ? new Date(latestNetWorth.last_updated).getTime()
            : 0;

          // If timestamp is NEWER than what we started with, it's done!
          if (newLastUpdated > initialLastUpdated) {
            clearInterval(pollInterval);
            await loadData(); // Reload full dashboard
            setRefreshing(false);
            showToast("Portfolio updated successfully", "success");
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000); // Check every 2 seconds

      // 4. Safety Timeout (Stop polling after 30 seconds)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (refreshing) {
          setRefreshing(false);
          // Don't show success, just stop spinning. It might still be running or failed silently.
          // Or reload distinct data just in case.
          loadData();
        }
      }, 30000);
    } catch (err: any) {
      console.error("Failed to refresh NAVs:", err);
      showToast("Failed to trigger update", "error");
      setRefreshing(false);
    }
  };

  const renderFamilyDashboard = () => {
    if (!familySummary) return null;

    const familyGoals = goals.filter((g) => g.goal_type === "FAMILY");
    const personalGoals = goals.filter((g) => g.goal_type === "PERSONAL");

    const hasNoProfiles = profiles.length <= 1; // Only has "Self"
    
    if (familySummary.net_worth === 0 && hasNoProfiles) {
      // ONBOARDING EMPTY STATE
      return (
        <div className="px-4 pt-8 pb-32 max-w-3xl mx-auto text-center">
          <div className="glass-card rounded-3xl p-8 sm:p-12 border border-neutral-200 dark:border-white/5 bg-white/60 dark:bg-[#151A23]/60 backdrop-blur-xl shadow-xl flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 mb-6">
              <Users className="w-8 h-8 stroke-[2]" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4">
              Manage your family wealth in one place
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-8 text-sm sm:text-base leading-relaxed">
              Consolidate investments across your family members. Switch context to any profile, track personal goals, or aggregate to see family net worth and asset allocations.
            </p>

            <div className="w-full max-w-md border-t border-neutral-200/50 dark:border-white/5 pt-8">
              <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-6">
                Add your first family member to begin
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => router.push("/profile?add=MOTHER")}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-[#0B0E14] hover:bg-neutral-50 dark:hover:bg-white/5 text-sm font-semibold transition-all duration-200 justify-center group active:scale-98"
                >
                  <Plus size={16} className="text-purple-500 group-hover:scale-110 transition-transform" />
                  <span>Mother</span>
                </button>
                <button
                  onClick={() => router.push("/profile?add=FATHER")}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-[#0B0E14] hover:bg-neutral-50 dark:hover:bg-white/5 text-sm font-semibold transition-all duration-200 justify-center group active:scale-98"
                >
                  <Plus size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
                  <span>Father</span>
                </button>
                <button
                  onClick={() => router.push("/profile?add=SPOUSE")}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-[#0B0E14] hover:bg-neutral-50 dark:hover:bg-white/5 text-sm font-semibold transition-all duration-200 justify-center group active:scale-98"
                >
                  <Plus size={16} className="text-orange-500 group-hover:scale-110 transition-transform" />
                  <span>Spouse</span>
                </button>
                <button
                  onClick={() => router.push("/profile?add=CHILD")}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-[#0B0E14] hover:bg-neutral-50 dark:hover:bg-white/5 text-sm font-semibold transition-all duration-200 justify-center group active:scale-98"
                >
                  <Plus size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span>Child</span>
                </button>
              </div>

              <button
                onClick={() => router.push("/profile?add=OTHER")}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm shadow-md shadow-primary-500/20 hover:shadow-lg transition-all duration-200 active:scale-98"
              >
                Create Custom Profile
              </button>
            </div>
          </div>
        </div>
      );
    }

    const getProfileColorClasses = (color: string) => {
      if (color === "blue") return { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", indicator: "bg-blue-500" };
      if (color === "purple") return { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", indicator: "bg-purple-500" };
      if (color === "green") return { text: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", indicator: "bg-green-500" };
      if (color === "orange") return { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", indicator: "bg-orange-500" };
      if (color === "yellow") return { text: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", indicator: "bg-yellow-500" };
      return { text: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", indicator: "bg-indigo-500" };
    };

    return (
      <div className="px-4 pt-8 pb-32 animate-fade-in space-y-6">
        {/* Family Dashboard Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-primary-500/10 text-primary-500 border border-primary-500/20">
                ⭐ All Family Summary
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
              Family Portfolio Dashboard<span className="text-primary-600">.</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Profiles Tracking: <strong className="text-neutral-800 dark:text-neutral-200">{familySummary.profiles_count}</strong>
            </span>
          </div>
        </div>

        {/* Aggregate Net Worth Card */}
        <NetWorthCard
          netWorth={familySummary.net_worth}
          mfValue={familySummary.allocation.mutual_funds}
          stockValue={familySummary.allocation.stocks}
          onRefresh={handleRefreshNAVs}
          isRefreshing={refreshing}
          dayChangePct={0}
          lastUpdated={new Date().toISOString()}
          onAddMF={() => router.push("/holdings/mutual-funds")}
          onAddStock={() => router.push("/holdings/stocks")}
        />

        {/* Profile Breakdown (The "Wow" Section) */}
        <section className="glass-card rounded-2xl border border-neutral-200 dark:border-white/5 bg-white/70 dark:bg-[#151A23]/70 backdrop-blur-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-5">
            Profile Contributions
          </h3>
          
          <div className="space-y-4">
            {familySummary.profile_breakdown.map((p: any) => {
              const colors = getProfileColorClasses(p.color);
              const percentage = familySummary.net_worth > 0 
                ? Math.round((p.total_value / familySummary.net_worth) * 100)
                : 0;

              return (
                <div key={p.id} className="p-4 rounded-xl border border-neutral-200/50 dark:border-white/5 bg-neutral-50/50 dark:bg-white/2 hover:border-neutral-300 dark:hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colors.indicator}`} />
                      <span className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base">
                        {p.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase border ${colors.text} ${colors.bg} ${colors.border}`}>
                        {p.relation}
                      </span>
                      {p.is_default && (
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">
                          (Default)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-neutral-900 dark:text-white text-sm sm:text-base">
                        ₹{p.total_value.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-2 font-semibold">
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-200 dark:bg-white/5 h-1.5 rounded-full mb-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.indicator}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Allocation Split */}
                  <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Mutual Funds: <strong>₹{p.mutual_fund_value.toLocaleString("en-IN")}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Stocks: <strong>₹{p.stock_value.toLocaleString("en-IN")}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Global Asset Allocation */}
        <section className="grid gap-6 md:grid-cols-2">
          {familySummary.net_worth > 0 && (
            <AssetAllocationCard
              data={[
                {
                  category: "Mutual Funds",
                  value: familySummary.allocation.mutual_funds,
                  percentage: familySummary.net_worth > 0
                    ? Math.round((familySummary.allocation.mutual_funds / familySummary.net_worth) * 100)
                    : 0,
                },
                {
                  category: "Stocks",
                  value: familySummary.allocation.stocks,
                  percentage: familySummary.net_worth > 0
                    ? Math.round((familySummary.allocation.stocks / familySummary.net_worth) * 100)
                    : 0,
                },
              ]}
            />
          )}

          {/* Goal Progress Summary */}
          <section className="glass-card rounded-2xl border border-neutral-200 dark:border-white/5 bg-white/70 dark:bg-[#151A23]/70 backdrop-blur-xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                Family Goal Progress
              </h3>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Accumulated Corpus</p>
                  <p className="text-2xl font-black text-neutral-900 dark:text-white">
                    ₹{familySummary.goal_progress.total_current.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Combined Target</p>
                  <p className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                    ₹{familySummary.goal_progress.total_target.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Combined Progress Bar */}
              {familySummary.goal_progress.total_target > 0 && (
                <div className="w-full bg-neutral-200 dark:bg-white/5 h-2 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary-500 to-indigo-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (familySummary.goal_progress.total_current /
                            familySummary.goal_progress.total_target) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-200/50 dark:border-white/5">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold">
                Tracking {familySummary.goal_progress.total_goals_count} family goals
              </span>
              <button
                onClick={() => router.push("/goals")}
                className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline"
              >
                Configure Goals →
              </button>
            </div>
          </section>
        </section>

        {/* Family Goals list preview */}
        <section className="space-y-8">
          {/* Shared Family Goals */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Family Shared Goals
              </h3>
              {familyGoals.length > 0 && (
                <button
                  onClick={() => router.push("/goals")}
                  className="text-sm text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight size={16} />
                </button>
              )}
            </div>

            {familyGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {familyGoals.slice(0, 2).map((goal) => (
                  <div
                    key={goal.id}
                    className="cursor-pointer"
                    onClick={() => router.push("/goals")}
                  >
                    <GoalCard
                      goal={goal}
                      onEdit={() => router.push("/goals")}
                      onDelete={() => router.push("/goals")}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => router.push("/goals")}
                className="w-full flex flex-col items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl hover:border-primary-500 dark:hover:border-primary-400/50 hover:bg-neutral-50 dark:hover:bg-white/5 transition-all group gap-3"
              >
                <div className="p-3 bg-neutral-100 dark:bg-white/5 rounded-full group-hover:bg-primary-500/10 transition-colors">
                  <Users className="text-neutral-400 dark:text-neutral-500 group-hover:text-primary-500 h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    No Joint Goals Defined
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Link investments from multiple family members into a joint goal
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Family Members' Personal Goals */}
          {personalGoals.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-dashed border-neutral-200 dark:border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Personal Goals
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {personalGoals.slice(0, 2).map((goal) => (
                  <div
                    key={goal.id}
                    className="cursor-pointer"
                    onClick={() => router.push("/goals")}
                  >
                    <GoalCard
                      goal={goal}
                      onEdit={() => router.push("/goals")}
                      onDelete={() => router.push("/goals")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  if (loading) {
    return <AppSkeleton />;
  }

  if (activeProfileId === "all") {
    return (
      <>
        <Toast
          isVisible={toast.show}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
        {renderFamilyDashboard()}
      </>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md w-full border border-neutral-200 dark:border-white/5 bg-white/80 dark:bg-[#151A23]/80">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">
            Connection Error
          </h2>
          <p className="text-neutral-400 mb-6">{error}</p>
          <Button onClick={loadData} variant="primary" className="w-full">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // ✅ UX: Onboarding for New Users (Empty State)
  if (summary && summary.invested === 0) {
    return <OnboardingWizard userProfile={userProfile} />;
  }

  return (
    <>
      {/* Toast Notification - Moved outside to escape 'transform' context */}
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* Background Refreshing Snackbar */}
      {isBackgroundRefreshing && (
        <div className="fixed top-20 sm:top-8 left-1/2 -translate-x-1/2 z-[99] animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xl text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 text-sm font-medium whitespace-nowrap">
            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
            Syncing fresh data...
          </div>
        </div>
      )}

      <div className="px-4 pt-8 pb-32 animate-fade-in relative">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Welcome back, {userProfile?.full_name ? userProfile.full_name.split(' ')[0] : 'Investor'}
            <span className="text-primary-600 dark:text-primary-500">.</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="space-y-6">
          {/* Net Worth Card */}
          <section>
            <NetWorthCard
              netWorth={netWorth?.net_worth || 0}
              mfValue={netWorth?.mutual_funds || 0}
              stockValue={netWorth?.stocks || 0}
              onRefresh={handleRefreshNAVs}
              isRefreshing={refreshing}
              dayChangePct={summary?.day_change_pct || 0}
              lastUpdated={netWorth?.last_updated}
              onAddMF={() => router.push("/holdings/mutual-funds")}
              onAddStock={() => router.push("/holdings/stocks")}
            />
          </section>
          {/* Portfolio Summary */}
          {summary && (
            <section>
              <PortfolioSummary
                invested={summary.invested || 0}
                current={summary.current || 0}
                profit={summary.profit || 0}
                returnPct={summary.return_pct || 0}
                dayChange={summary.day_change || 0}
                dayChangePct={summary.day_change_pct || 0}
                xirr={summary.xirr}
                mfXirr={summary.mf_xirr || 0}
                stockXirr={summary.stock_xirr || 0}
                mfProfit={summary.mf_profit || 0}
                stockProfit={summary.stock_profit || 0}
                mfInvested={summary.mf_invested || 0}
                stockInvested={summary.stock_invested || 0}
              />
            </section>
          )}
          {/* Performance Chart */}
          <section>
            <PerformanceChart
              data={perfData}
              investedAmount={summary?.invested || 0}
              mfInvested={summary?.mf_invested || 0}
              stockInvested={summary?.stock_invested || 0}
            />
          </section>

          {/* Asset Allocation Chart */}
          {netWorth && (netWorth.mutual_funds > 0 || netWorth.stocks > 0) && (
            <section className="animate-fade-in">
              <AssetAllocationCard
                data={[
                  {
                    category: "Mutual Funds",
                    value: netWorth.mutual_funds || 0,
                    percentage: (netWorth.stocks + netWorth.mutual_funds) > 0
                      ? Math.round((netWorth.mutual_funds / (netWorth.stocks + netWorth.mutual_funds)) * 100)
                      : 0,
                  },
                  {
                    category: "Stocks",
                    value: netWorth.stocks || 0,
                    percentage: (netWorth.stocks + netWorth.mutual_funds) > 0
                      ? Math.round((netWorth.stocks / (netWorth.stocks + netWorth.mutual_funds)) * 100)
                      : 0,
                  },
                ]}
              />
            </section>
          )}

          {/* Daily Prediction Card */}
          <section className="animate-fade-in">
            <MarketPredictionCard />
          </section>

          {/* Portfolio Health Score */}
          {(netWorth?.mutual_funds > 0 || netWorth?.stocks > 0) && (
            <section className="animate-fade-in">
              <PortfolioHealthCard
                mfValue={netWorth?.mutual_funds || 0}
                stockValue={netWorth?.stocks || 0}
                returnPct={summary?.return_pct || 0}
                dayChangePct={summary?.day_change_pct || 0}
              />
            </section>
          )}

          {/* Smart Insights (Nudges) */}
          <InsightsCard insights={insights} />
          {/* Goals Preview */}
          {/* Benchmark Comparison */}
          {benchmark && (
            <section className="animate-fade-in">
              <BenchmarkCard
                portfolioXirr={summary?.xirr || 0}
                benchmark={benchmark}
              />
            </section>
          )}
          {/* Goals Preview */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Your Goals
              </h3>
              {goals.length > 0 && (
                <button
                  onClick={() => router.push("/goals")}
                  className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-500 dark:hover:text-primary-300 transition-colors flex items-center gap-1">
                  View All <ArrowRight size={16} />
                </button>
              )}
            </div>

            {goals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="cursor-pointer"
                    onClick={() => router.push("/goals")}>
                    <GoalCard
                      goal={goal}
                      onEdit={() => router.push("/goals")}
                      onDelete={() => router.push("/goals")}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => router.push("/goals")}
                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-2xl hover:border-primary-500 dark:hover:border-primary-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition-all group gap-3">
                <div className="p-3 bg-neutral-100 dark:bg-white/5 rounded-full group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors">
                  <AlertTriangle className="text-neutral-400 dark:text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    No Goals Set
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Create your first financial goal to track progress
                  </p>
                </div>
              </button>
            )}
          </section>

          {/* Growth Banner: Refer & Earn (Only if not premium) */}
          {userProfile && !userProfile.is_ai_unlocked && (
            <div
              className="mb-8 bg-linear-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white flex items-center justify-between shadow-lg shadow-indigo-500/20 animate-fade-in relative overflow-hidden group cursor-pointer"
              onClick={() => router.push("/profile")}>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Gift className="text-yellow-300 animate-bounce" size={24} />
                </div>
                <div>
                  <p className="font-bold text-sm sm:text-base">
                    Get Unlimited AI Chats
                  </p>
                  <p className="text-xs sm:text-sm text-indigo-100">
                    Invite a friend & unlock premium features instantly.
                  </p>
                </div>
              </div>
              <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                <ArrowRight className="text-white" size={20} />
              </div>
              {/* Glossy effect */}
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
            </div>
          )}

          {/* Quick Actions */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push("/holdings/mutual-funds?import=1")}
                className="glass-card hover:bg-neutral-50 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/5 hover:border-primary-500/30">
                <FileText className="h-8 w-8 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform animate-pulse" />
                <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-300 text-center text-sm">
                  Upload CAS
                </span>
              </button>

              <button
                onClick={() => router.push("/holdings/mutual-funds")}
                className="glass-card hover:bg-neutral-50 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/30">
                <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 text-center text-sm">
                  Mutual Funds
                </span>
              </button>

              <button
                onClick={() => router.push("/holdings/stocks")}
                className="glass-card hover:bg-neutral-50 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-500/30">
                <LineChart className="h-8 w-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 text-center text-sm">
                  Stocks
                </span>
              </button>

              <button
                onClick={() => router.push("/profile")}
                className="glass-card hover:bg-neutral-50 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 hover:border-purple-500/30">
                <Gift className="h-8 w-8 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 text-center text-sm">
                  Refer & Earn
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
