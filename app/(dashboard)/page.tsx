"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import NetWorthCard from "@/components/features/NetWorthCard";
import PortfolioSummary from "@/components/features/PortfolioSummary";
import GoalCard from "@/components/features/GoalCard";
import Button from "@/components/ui/Button";
import Toast, { ToastType } from "@/components/ui/Toast";
import OnboardingWizard from "@/components/features/OnboardingWizard";
import { FileText, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [netWorth, setNetWorth] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("Loading dashboard data...");

      const [nw, ps, g, xirrData] = await Promise.all([
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
      ]);

      console.log("Data loaded:", { nw, ps, g, xirrData });

      setNetWorth(nw);
      setSummary({ ...ps, xirr: xirrData.xirr });
      setGoals(g.slice(0, 2));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-500 mx-auto mb-4" />
          <p className="text-neutral-400">Loading your portfolio...</p>
        </div>
      </div>
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
    return <OnboardingWizard />;
  }

  return (
    <div className="px-4 pt-8 pb-32 animate-fade-in relative">
      {/* Toast Notification */}
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

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
            />
          </section>
        )}

        {/* Goals Preview */}
        {goals.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Your Goals
              </h3>
              <button
                onClick={() => router.push("/goals")}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-500 dark:hover:text-primary-300 transition-colors flex items-center gap-1">
                View All <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  id={goal.id}
                  name={goal.name}
                  target={goal.target}
                  current={goal.current}
                  progress={goal.progress}
                  onClick={() => router.push("/goals")}
                />
              ))}
            </div>
          </section>
        )}

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
  );
}
