"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { api } from "@/lib/api";
import NetWorthCard from "@/components/features/NetWorthCard";
import PortfolioSummary from "@/components/features/PortfolioSummary";
import PerformanceChart from "@/components/features/PerformanceChart";
import GoalCard from "@/components/features/GoalCard";
import Button from "@/components/ui/Button";
import Toast, { ToastType } from "@/components/ui/Toast";
import OnboardingWizard from "@/components/features/OnboardingWizard";
import { FileText, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";
import InsightsCard from "@/components/features/InsightsCard";
import AddTransactionModal from "@/components/features/AddTransactionModal";

export default function HomePage() {
  const router = useRouter();
  const [netWorth, setNetWorth] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]); // New State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [showAddTx, setShowAddTx] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: ToastType;
  }>({ show: false, message: "", type: "info" });

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("Loading dashboard data...");

      // 1. Try to load from cache first (Stale-While-Revalidate)
      if (typeof window !== "undefined") {
        const cachedNw = localStorage.getItem("net-worth");
        const cachedPs = localStorage.getItem("portfolio-summary");
        const cachedGoals = localStorage.getItem("goals");
        const cachedHistory = localStorage.getItem("portfolio-history");
        const cachedXirr = localStorage.getItem("xirr");
        const cachedInsights = localStorage.getItem("insights");

        if (cachedNw && cachedPs) {
          try {
            setNetWorth(JSON.parse(cachedNw).data);
            setSummary({
              ...JSON.parse(cachedPs).data,
              xirr: cachedXirr ? JSON.parse(cachedXirr).data.xirr : 0,
            });
            if (cachedGoals) setGoals(JSON.parse(cachedGoals).data.slice(0, 2));
            if (cachedHistory) setPerfData(JSON.parse(cachedHistory).data);
            if (cachedInsights) setInsights(JSON.parse(cachedInsights).data);

            setLoading(false); // Show cached data immediately
          } catch (e) {
            console.warn("Invalid cache data", e);
          }
        }
      }

      // 2. Fetch Fresh Data in Background
      const [nw, ps, g, xirrData, history, ins] = await Promise.all([
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
      ]);

      console.log("Data loaded:", { nw, ps, g, xirrData });

      setNetWorth(nw);
      setSummary({ ...ps, xirr: xirrData.xirr });
      setGoals(g.slice(0, 2));
      setPerfData(history);
      setInsights(ins);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
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

  // Pull to Refresh State
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const PULL_THRESHOLD = 120;
  const { light } = useHaptic();

  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable if at very top of page
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && window.scrollY === 0) {
        // Resistance effect
        setPullY(Math.min(diff * 0.4, PULL_THRESHOLD)); // Logarithmic resistance
        // Prevent default scrolling if we are pulling to refresh
        if (diff < PULL_THRESHOLD) {
          // We generally want to allow nice scrolling, but for P2R strictly at top:
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      if (pullY >= PULL_THRESHOLD - 20) {
        // Trigger Refresh
        light();
        showToast("Refreshing...", "loading");
        await loadData();
        showToast("Refreshed", "success");
      }

      setPullY(0);
      setIsPulling(false);
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPulling, pullY]);

  if (loading) {
    return <AppSkeleton />;
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
    return <OnboardingWizard />;
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

      <div
        className="px-4 pt-8 pb-32 animate-fade-in relative transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${pullY}px)` }}>
        {/* Pull Indicator */}
        {pullY > 10 && (
          <div className="absolute top-0 left-0 right-0 flex justify-center -mt-8">
            <div
              className={`p-2 rounded-full bg-white dark:bg-[#151A23] shadow-lg border border-neutral-200 dark:border-white/10 transition-all ${
                pullY > PULL_THRESHOLD - 30 ? "rotate-180 scale-110" : ""
              }`}>
              <ArrowRight className="rotate-90 text-primary-500" size={20} />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Welcome back
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
                mfProfit={summary.mf_profit || 0}
                stockProfit={summary.stock_profit || 0}
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

          {/* Smart Insights (Nudges) */}
          <InsightsCard insights={insights} />

          {/* Goals Preview */}
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

          {/* Quick Actions */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Quick Actions
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => router.push("/profile")}
                className="glass-card hover:bg-neutral-50 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-200">
                <FileText className="h-8 w-8 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-300">
                  Upload CAS for Mutual Funds
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
