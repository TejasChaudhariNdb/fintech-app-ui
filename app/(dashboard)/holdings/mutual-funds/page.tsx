"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  MF_CATEGORY_OPTIONS,
  EMPTY_MF_FILTERS,
  MfFilterState,
  matchesMfFilters,
  mfPlanOf,
  isMfFilterActive,
  loadMfFilters,
  saveMfFilters,
} from "@/lib/mfFilters";
import MfXirrChart from "@/components/features/MfXirrChart";
import SchemeCard from "@/components/features/SchemeCard";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import ShareStockModal from "@/components/features/ShareStockModal";
import AddTransactionModal from "@/components/features/AddTransactionModal";
import { Search, Plus, Share2, UploadCloud, Grid, List, LayoutGrid, Download, ArrowDownUp, FileSpreadsheet, Eye, EyeOff, BarChart2, CalendarClock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PrivacyMask from "@/components/ui/PrivacyMask";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MutualFundJourneyChart from "@/components/features/MutualFundJourneyChart";

import OnboardingWizard from "@/components/features/OnboardingWizard";
import MutualFundsZeroState from "@/components/features/MutualFundsZeroState";
import { useProfile } from "@/context/ProfileContext";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];
const SCHEME_CHART_LIMIT = 5;

export default function MutualFundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const { activeProfileId, profiles, refreshProfiles, changeActiveProfile } = useProfile();

  const getRelationForProfile = (profileId: number) => {
    const found = profiles.find((p) => p.id === profileId);
    return found ? found.relation : "other";
  };

  const getProfileBadgeColor = (relation: string) => {
    const rel = relation.toUpperCase();
    if (rel === "SELF") return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (rel === "MOTHER") return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    if (rel === "FATHER") return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    if (rel === "SPOUSE") return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    if (rel === "CHILD") return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
  };

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as "success" | "error" | "loading" | "info",
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" = "success",
  ) => {
    setToast({ message, type, isVisible: true });
    if (type !== "loading") {
      setTimeout(
        () => setToast((prev) => ({ ...prev, isVisible: false })),
        3000,
      );
    }
  };

  // Data State
  const [schemes, setSchemes] = useState<any[]>([]);
  const [amcAllocation, setAmcAllocation] = useState<any[]>([]);
  const [schemeAllocation, setSchemeAllocation] = useState<any[]>([]);
  const [journeyHistory, setJourneyHistory] = useState<any[] | null>(null);
  const [journeyMeta, setJourneyMeta] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    | "xirr"
    | "cagr"
    | "dayChangePct"
    | "dayChange"
    | "gains"
    | "profit"
    | "value"
    | "name"
    | "rank"
    | "categoryRank"
    | "overallRank"
  >("xirr");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [hideZeroBalance, setHideZeroBalance] = useState(false);
  // BUG-036: show only zero-value funds (to find old entries to clean up). Opposite of hideZeroBalance.
  const [showOnlyZero, setShowOnlyZero] = useState(false);
  // BUG-037: mutual fund XIRR shown on the summary cards
  const [mfXirr, setMfXirr] = useState<number | null>(null);
  // Includes funds already redeemed. Shown as a secondary line under the headline XIRR.
  const [mfLifetimeXirr, setMfLifetimeXirr] = useState<number | null>(null);
  // BUG-035: category, plan and SIF filters. Saved so they stay after navigating away.
  const [mfFilters, setMfFilters] = useState<MfFilterState>(EMPTY_MF_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  // BUG-040: "category" = cap size / hybrid / SIF etc. "plan" = Direct / Regular.
  const [allocationView, setAllocationView] = useState<"amc" | "scheme" | "category" | "plan">("amc");
  const [showAddTx, setShowAddTx] = useState(false);
  const [addTxInitialTab, setAddTxInitialTab] = useState<"MANUAL" | "IMPORT">("MANUAL");
  const [prefillSchemeId, setPrefillSchemeId] = useState<number | null>(null);
  const [prefillMfType, setPrefillMfType] = useState<"PURCHASE" | "REDEMPTION">(
    "PURCHASE",
  );

  // Share Modal State
  const [selectedShareStock, setSelectedShareStock] = useState<any>(null);

  // Onboarding State
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Edit Scheme State
  const [editingScheme, setEditingScheme] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Journey State
  const [journeyRange, setJourneyRange] = useState("6M");
  const [isJourneyRefetching, setIsJourneyRefetching] = useState(false);

  // View Mode & Tax Report State
  const [holdingViewTab, setHoldingViewTab] = useState<"holdings" | "analytics">("holdings");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");
  const [selectedFy, setSelectedFy] = useState("2025-26");
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  // BUG-038: XIRR over time, from the backend's month-end series
  const [xirrPoints, setXirrPoints] = useState<{ date: string; xirr_pct: number }[]>([]);
  const [xirrFirstInvestment, setXirrFirstInvestment] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .getMfXirrTimeseries()
      .then((res: any) => {
        if (!cancelled) {
          setXirrPoints(Array.isArray(res?.points) ? res.points : []);
          setXirrFirstInvestment(res?.first_investment ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setXirrPoints([]);
          setXirrFirstInvestment(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  // BUG-037: mutual fund XIRR for the summary cards (profile-scoped)
  useEffect(() => {
    let cancelled = false;
    api
      .getXIRR()
      .then((res: any) => {
        if (!cancelled) {
          // null = cannot be calculated, shown as "--" (decision 2, 2026-11-12)
          setMfXirr(res?.mf_xirr != null ? Number(res.mf_xirr) : null);
          setMfLifetimeXirr(res?.mf_lifetime_xirr != null ? Number(res.mf_lifetime_xirr) : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMfXirr(null);
          setMfLifetimeXirr(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  // BUG-035: save filters only after they have been loaded, so an empty first render never overwrites them
  useEffect(() => {
    if (filtersLoaded) saveMfFilters(mfFilters);
  }, [mfFilters, filtersLoaded]);

  // BUG-044: the sort choice is saved too, so it survives opening a fund and going back
  useEffect(() => {
    if (!filtersLoaded) return;
    try {
      localStorage.setItem("mf_sort_by", sortBy);
      localStorage.setItem("mf_sort_order", sortOrder);
    } catch {
      // storage unavailable: sort still works for this visit
    }
  }, [sortBy, sortOrder, filtersLoaded]);

  useEffect(() => {
    const savedTab = localStorage.getItem("mf_holding_view_tab");
    if (savedTab === "holdings" || savedTab === "analytics") {
      setHoldingViewTab(savedTab);
    }
    const savedMode = localStorage.getItem("holdings_view_mode");
    if (savedMode === "compact" || savedMode === "detailed") {
      setViewMode(savedMode);
    }
    const savedHideZero = localStorage.getItem("mf_hide_zero_balance");
    if (savedHideZero !== null) {
      setHideZeroBalance(savedHideZero === "true");
    }
    const savedOnlyZero = localStorage.getItem("mf_show_only_zero");
    if (savedOnlyZero !== null) {
      setShowOnlyZero(savedOnlyZero === "true");
    }
    setMfFilters(loadMfFilters());
    // BUG-044: restore the saved sort
    const savedSort = localStorage.getItem("mf_sort_by");
    const allowedSorts = [
      "xirr", "cagr", "dayChangePct", "dayChange", "gains", "profit",
      "value", "name", "rank", "categoryRank", "overallRank",
    ];
    if (savedSort && allowedSorts.includes(savedSort)) {
      setSortBy(savedSort as typeof sortBy);
    }
    const savedOrder = localStorage.getItem("mf_sort_order");
    if (savedOrder === "asc" || savedOrder === "desc") {
      setSortOrder(savedOrder);
    }
    setFiltersLoaded(true);
  }, []);

  const handleToggleViewMode = () => {
    const nextMode = viewMode === "compact" ? "detailed" : "compact";
    setViewMode(nextMode);
    localStorage.setItem("holdings_view_mode", nextMode);
  };

  const handleToggleHideZero = () => {
    const nextVal = !hideZeroBalance;
    setHideZeroBalance(nextVal);
    localStorage.setItem("mf_hide_zero_balance", String(nextVal));
    if (nextVal && showOnlyZero) {
      setShowOnlyZero(false);
      localStorage.setItem("mf_show_only_zero", "false");
    }
  };

  const handleToggleShowOnlyZero = () => {
    const nextVal = !showOnlyZero;
    setShowOnlyZero(nextVal);
    localStorage.setItem("mf_show_only_zero", String(nextVal));
    if (nextVal && hideZeroBalance) {
      setHideZeroBalance(false);
      localStorage.setItem("mf_hide_zero_balance", "false");
    }
  };

  const handleDownloadTaxReport = async () => {
    setIsDownloadingReport(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (activeProfileId) {
        headers["x-profile-id"] = String(activeProfileId);
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/reports/capital-gains/csv?financial_year=${selectedFy}`, {
        headers
      });
      
      if (!res.ok) throw new Error("Failed to download tax report");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capital_gains_report_${selectedFy}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Tax report downloaded successfully", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to download tax report", "error");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Fetch core data first
      const [schemesRes, amcRes, schemeAllocationRes] = await Promise.all([
        api.getSchemes(),
        api.getAMCAllocation(),
        api.getSchemeAllocation(),
      ]);
      setSchemes(schemesRes);
      setAmcAllocation(amcRes);
      setSchemeAllocation(schemeAllocationRes);
      setLastUpdated(new Date());
      setIsLoading(false); // Unlock page for core data

      // Fetch journey data separately (non-blocking)
      loadJourneyData(journeyRange);
    } catch (err) {
      console.error(err);
      showToast("Failed to load mutual funds", "error");
      setIsLoading(false);
    }
  };

  const loadJourneyData = async (range: string) => {
    try {
      setIsJourneyRefetching(true);
      const journeyRes = await api.getMutualFundJourney(range);
      setJourneyHistory(journeyRes.series || []);
      setJourneyMeta(journeyRes.meta || null);
    } catch (err) {
      console.error("Failed to load MF journey:", err);
    } finally {
      setIsJourneyRefetching(false);
    }
  };

  const handleRangeChange = (range: string) => {
    setJourneyRange(range);
    loadJourneyData(range);
  };

  useEffect(() => {
    loadData();
  }, [activeProfileId]);

  useEffect(() => {
    if (searchParams.get("import") === "1") {
      setShowImportWizard(true);
      router.replace("/holdings/mutual-funds");
    }
  }, [searchParams, router]);

  const handleDeleteScheme = async (schemeId: number) => {
    if (!confirm("Are you sure you want to delete this mutual fund?")) return;
    try {
      showToast("Deleting scheme...", "loading");
      await api.deleteScheme(schemeId);
      await loadData();
      showToast("Mutual fund deleted successfully", "success");
    } catch (err) {
      showToast("Failed to delete mutual fund", "error");
    }
  };

  const handleUpdateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheme) return;
    try {
      showToast("Updating scheme...", "loading");
      await api.updateScheme(editingScheme.scheme_id, {
        units: Number(editingScheme.units),
        invested_amount: Number(editingScheme.invested),
      });
      await loadData();
      setIsEditModalOpen(false);
      setEditingScheme(null);
      showToast("Mutual fund updated successfully", "success");
    } catch (err: any) {
      showToast("Failed to update mutual fund", "error");
    }
  };

  const totalMFValue = schemes.reduce((sum, s) => sum + s.current, 0);
  const topSchemeAllocation = schemeAllocation.slice(0, SCHEME_CHART_LIMIT);
  const remainingSchemeAllocation = schemeAllocation.slice(SCHEME_CHART_LIMIT);
  const otherSchemesValue = remainingSchemeAllocation.reduce(
    (sum, entry) => sum + entry.current,
    0,
  );
  const otherSchemesPercent = remainingSchemeAllocation.reduce(
    (sum, entry) => sum + entry.percent,
    0,
  );
  const schemeAllocationChartData =
    otherSchemesValue > 0
      ? [
          ...topSchemeAllocation,
          {
            scheme_id: -1,
            scheme: `Others (${remainingSchemeAllocation.length})`,
            current: otherSchemesValue,
            percent: Number(otherSchemesPercent.toFixed(2)),
            xirr: null,
          },
        ]
      : topSchemeAllocation;

  const zeroBalanceCount = schemes.filter(
    (s) => (s.units <= 0 && s.current <= 0) || (s.units < 0.001 && s.current < 1),
  ).length;

  const filteredSchemes = schemes
    .filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (s.scheme || "").toLowerCase().includes(q) || (s.amc || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (!matchesMfFilters(s, mfFilters)) return false;
      if (hideZeroBalance) {
        const isZero = (s.units <= 0 && s.current <= 0) || (s.units < 0.001 && s.current < 1);
        if (isZero) return false;
      }
      if (showOnlyZero) {
        const isZero = (s.units <= 0 && s.current <= 0) || (s.units < 0.001 && s.current < 1);
        if (!isZero) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "xirr") {
        const aVal = a.xirr !== null && a.xirr !== undefined ? Number(a.xirr) : -Infinity;
        const bVal = b.xirr !== null && b.xirr !== undefined ? Number(b.xirr) : -Infinity;
        comparison = bVal - aVal;
      } else if (sortBy === "cagr") {
        const aVal = a.cagr !== null && a.cagr !== undefined ? Number(a.cagr) : (a.return_pct ?? -Infinity);
        const bVal = b.cagr !== null && b.cagr !== undefined ? Number(b.cagr) : (b.return_pct ?? -Infinity);
        comparison = bVal - aVal;
      } else if (sortBy === "gains") {
        comparison = (b.return_pct ?? 0) - (a.return_pct ?? 0);
      } else if (sortBy === "value") {
        comparison = b.current - a.current;
      } else if (sortBy === "profit") {
        comparison = (b.profit ?? 0) - (a.profit ?? 0);
      } else if (sortBy === "dayChangePct") {
        comparison = (b.day_change_pct ?? 0) - (a.day_change_pct ?? 0);
      } else if (sortBy === "dayChange") {
        comparison = (b.day_change ?? 0) - (a.day_change ?? 0);
      } else if (sortBy === "categoryRank" || (sortBy as string) === "rank") {
        const catCompare = (a.category_label || "").localeCompare(b.category_label || "");
        if (catCompare !== 0) return catCompare;
        comparison =
          (a.category_rank || Number.MAX_SAFE_INTEGER) -
          (b.category_rank || Number.MAX_SAFE_INTEGER);
      } else if (sortBy === "overallRank") {
        comparison =
          (a.overall_rank || Number.MAX_SAFE_INTEGER) -
          (b.overall_rank || Number.MAX_SAFE_INTEGER);
      } else {
        // "name"
        comparison = (a.scheme || "").localeCompare(b.scheme || "");
      }

      return sortOrder === "desc" ? comparison : -comparison;
    });
  // BUG-037: totals for the summary cards, before the list filters. Only funds still held (units > 0),
  // the same basis as the XIRR. Fully redeemed funds can keep a stored cost that is not a current holding,
  // so they are left out (they remain in the list under "Show only 0 Bal").
  const mfTotals = schemes.reduce(
    (acc, s) => {
      if (!(Number(s.units) > 0)) return acc;
      acc.current += Number(s.current) || 0;
      acc.invested += Number(s.invested) || 0;
      return acc;
    },
    { current: 0, invested: 0 },
  );
  const mfPnl = mfTotals.current - mfTotals.invested;
  const mfPnlPct = mfTotals.invested > 0 ? (mfPnl / mfTotals.invested) * 100 : 0;
  const fmtInr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const fmtPct = (v: number) => `${(v || 0).toFixed(2)}%`;

  // BUG-040: grouped totals for the category and plan views (share of current value)
  const groupAllocation = (keyOf: (s: any) => string) => {
    const totals = new Map<string, number>();
    schemes.forEach((s) => {
      const key = keyOf(s);
      totals.set(key, (totals.get(key) || 0) + (Number(s.current) || 0));
    });
    const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return Array.from(totals.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        current: value,
        percent: total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0,
      }));
  };
  const categoryAllocation = groupAllocation((s) => s.category_label || "Other");
  const planAllocation = groupAllocation((s) => {
    const plan = mfPlanOf(s.scheme);
    return plan === "DIRECT" ? "Direct" : plan === "REGULAR" ? "Regular" : "Plan not stated";
  });

  const allocationData =
    allocationView === "amc"
      ? amcAllocation
      : allocationView === "category"
      ? categoryAllocation
      : allocationView === "plan"
      ? planAllocation
      : schemeAllocationChartData;
  const allocationNameKey =
    allocationView === "amc" ? "amc" : allocationView === "scheme" ? "scheme" : "label";
  const allocationCenterLabel =
    allocationView === "amc"
      ? "AMCs"
      : allocationView === "scheme"
      ? "Funds"
      : allocationView === "category"
      ? "Categories"
      : "Plans";
  const allocationLegendData =
    allocationView === "amc"
      ? amcAllocation
      : allocationView === "scheme"
      ? schemeAllocation.slice(0, 6)
      : allocationData;

  const handleWizardSuccess = async (targetProfileId?: string) => {
    setShowImportWizard(false);
    api.clearPortfolioCache();
    showToast("Portfolio imported successfully! Loading your holdings...", "success");
    if (refreshProfiles) {
      try {
        await refreshProfiles();
      } catch (e) {
        console.error("Failed to refresh profiles:", e);
      }
    }
    if (targetProfileId && activeProfileId !== "all" && activeProfileId !== targetProfileId) {
      changeActiveProfile(targetProfileId);
    }
    await loadData();
  };

  if (isLoading) {
    return <AppSkeleton />;
  }

  if (showImportWizard) {
    return (
      <OnboardingWizard
        initialStep={2} // specific step for upload
        onAddTransactionClick={() => {
          setShowImportWizard(false);
          setShowAddTx(true);
        }}
        onSuccess={handleWizardSuccess}
        onClose={async () => {
          setShowImportWizard(false);
          api.clearPortfolioCache();
          await loadData();
        }}
      />
    );
  }

  if (schemes.length === 0 && !isLoading) {
    return (
      <>
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        />
        <MutualFundsZeroState
          onImportClick={() => setShowImportWizard(true)}
          onImportCsvClick={() => {
            setAddTxInitialTab("IMPORT");
            setShowAddTx(true);
          }}
          onManualClick={() => {
            setAddTxInitialTab("MANUAL");
            setShowAddTx(true);
          }}
        />
        <AddTransactionModal
          isOpen={showAddTx}
          initialTab={addTxInitialTab}
          onClose={() => setShowAddTx(false)}
          onSuccess={async (customMsg?: string) => {
            showToast(customMsg || "Transaction saved! Updating portfolio...", "success");
            api.clearPortfolioCache();
            await loadData();
          }}
        />
      </>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Sub-navigation: Holdings vs Visual Analytics */}
      <div className="flex items-center justify-between pb-1">
        <div className="inline-flex p-1 bg-neutral-100 dark:bg-white/5 rounded-2xl border border-neutral-200/60 dark:border-white/5">
          <button
            onClick={() => {
              setHoldingViewTab("holdings");
              localStorage.setItem("mf_holding_view_tab", "holdings");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              holdingViewTab === "holdings"
                ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}>
            <List size={16} />
            <span>Holdings ({schemes.length})</span>
          </button>
          <button
            onClick={() => {
              setHoldingViewTab("analytics");
              localStorage.setItem("mf_holding_view_tab", "analytics");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              holdingViewTab === "analytics"
                ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}>
            <BarChart2 size={16} />
            <span>Visual Analytics</span>
          </button>
        </div>
      </div>

      {holdingViewTab === "analytics" && (
        <>
          <MutualFundJourneyChart
            data={journeyHistory || undefined}
            coverageStart={journeyMeta?.coverage_start || null}
            coveredSchemes={journeyMeta?.covered_schemes || 0}
            onRangeChange={handleRangeChange}
            selectedRange={journeyRange}
            isRefetching={isJourneyRefetching}
          />

          {/* BUG-038: XIRR over time */}
          {schemes.length > 0 && xirrPoints.length > 1 && (
            <div className="mb-6">
              <MfXirrChart points={xirrPoints} />
            </div>
          )}
          {/* The chart starts one year after the first investment. Say so, rather than showing nothing. */}
          {schemes.length > 0 && xirrPoints.length <= 1 && xirrFirstInvestment && (
            <div className="mb-6 rounded-2xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-surface p-4 text-sm text-neutral-600 dark:text-neutral-300">
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">XIRR over time</p>
              <p className="mt-1 text-xs text-neutral-500">
                The chart appears one year after your first investment (
                {new Date(xirrFirstInvestment).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                ). Until then, the XIRR on the Holdings tab is the only figure.
              </p>
            </div>
          )}

          <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-tight">
                      Mutual Fund Allocation
                    </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {lastUpdated && (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                      Updated{" "}
                      {lastUpdated.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {allocationView === "amc"
                      ? "Compare concentration by fund house"
                      : allocationView === "scheme"
                      ? "Compare concentration fund by fund"
                      : allocationView === "category"
                      ? "Split by category: cap size, hybrid, SIF and more"
                      : "Split by plan: Direct or Regular"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const totalCurrent = schemes.reduce(
                    (sum, s) => sum + s.current,
                    0,
                  );
                  const totalInvested = schemes.reduce((sum, s) => {
                    return sum + s.current / (1 + (s.return_pct || 0) / 100);
                  }, 0);

                  const totalPnlPct =
                    totalInvested > 0
                      ? ((totalCurrent - totalInvested) / totalInvested) * 100
                      : 0;

                  setSelectedShareStock({
                    symbol: "My Mutual Fund Portfolio",
                    pnl_pct: totalPnlPct,
                    value: totalCurrent,
                  });
                }}
                className="shrink-0 rounded-full p-2 text-neutral-400 transition-all hover:bg-primary-500/10 hover:text-primary-500"
                title="Share Portfolio Performance">
                <Share2 size={20} />
              </button>
            </div>

            <div className="flex w-full rounded-2xl bg-neutral-100 p-1 dark:bg-white/5 sm:w-fit">
              {(["amc", "scheme", "category", "plan"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setAllocationView(view)}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
                    allocationView === view
                      ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}>
                  {view === "amc"
                    ? "AMC Wise"
                    : view === "scheme"
                    ? "Scheme Wise"
                    : view === "category"
                    ? "Category"
                    : "Direct / Regular"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[200px] w-[200px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="current"
                    nameKey={allocationNameKey}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}>
                    {allocationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1F2B",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(value: number | undefined) =>
                      value !== undefined ? `₹${value.toLocaleString()}` : ""
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Total
                </p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {allocationView === "amc" ? (
                    <PrivacyMask>
                      {(totalMFValue / 100000).toFixed(1)}L
                    </PrivacyMask>
                  ) : (
                    `${allocationView === "scheme" ? schemeAllocation.length : allocationData.length} ${allocationCenterLabel}`
                  )}
                </p>
              </div>
            </div>

            <div className="flex-1 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {allocationLegendData.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-2xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.03]">
                  <div
                    className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300"
                      title={
                        allocationView === "amc" ? entry.amc : allocationView === "scheme" ? entry.scheme : entry.label
                      }>
                      {allocationView === "amc" ? entry.amc : allocationView === "scheme" ? entry.scheme : entry.label}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {entry.percent}%
                      {allocationView === "scheme" &&
                        entry.xirr !== null &&
                        entry.xirr !== undefined && (
                          <>
                            {" | "}
                            <span
                              className={
                                entry.xirr >= 0
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              }>
                              XIRR {entry.xirr.toFixed(2)}%
                            </span>
                          </>
                        )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      </>
      )}

      {/* Schemes List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            All Schemes ({schemes.length})
          </h3>
          <div className="flex w-full sm:w-auto items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setAddTxInitialTab("IMPORT");
                setShowAddTx(true);
              }}
              className="flex-1 sm:flex-none h-10 px-2.5 sm:px-3.5 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap shadow-sm dark:shadow-none active:scale-[0.98]">
              <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
              <span>
                <span className="inline sm:hidden">CSV</span>
                <span className="hidden sm:inline">Import CSV</span>
              </span>
            </button>
            <button
              onClick={() => router.push("/sips")}
              className="flex-1 sm:flex-none h-10 px-2.5 sm:px-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap shadow-sm dark:shadow-none active:scale-[0.98]">
              <CalendarClock size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>My SIPs</span>
            </button>
            <button
              onClick={() => {
                setShowImportWizard(true);
              }}
              className="flex-1 sm:flex-none h-10 px-2.5 sm:px-3.5 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap shadow-sm dark:shadow-none active:scale-[0.98]">
              <UploadCloud size={15} className="text-blue-500 shrink-0" />
              <span>
                <span className="inline sm:hidden">CAS</span>
                <span className="hidden sm:inline">Import CAS</span>
              </span>
            </button>
            <button
              onClick={() => {
                setPrefillSchemeId(null);
                setPrefillMfType("PURCHASE");
                setAddTxInitialTab("MANUAL");
                setShowAddTx(true);
              }}
              className="flex-1 sm:flex-none h-10 px-3 sm:px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary-500/25 active:scale-[0.98] whitespace-nowrap">
              <Plus size={15} className="shrink-0" />
              <span>
                <span className="inline sm:hidden">Buy / Sell</span>
                <span className="hidden sm:inline">Buy / Sell MF</span>
              </span>
            </button>
          </div>
        </div>

        {/* BUG-037: summary cards, same layout as the stocks summary */}
        {schemes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1">
            <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col justify-center rounded-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Total Value</p>
              <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>{fmtInr(mfTotals.current)}</PrivacyMask>
              </p>
            </Card>
            <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col justify-center rounded-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Total Investment</p>
              <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>{fmtInr(mfTotals.invested)}</PrivacyMask>
              </p>
            </Card>
            <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col justify-center rounded-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">Total P&amp;L</p>
              <div className={`flex items-baseline gap-1.5 flex-wrap ${mfPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                <p className="text-lg sm:text-2xl font-bold">
                  <PrivacyMask>
                    {mfPnl >= 0 ? "+" : ""}
                    {fmtInr(Math.abs(mfPnl))}
                  </PrivacyMask>
                </p>
                <p className="text-xs sm:text-sm font-medium">
                  ({mfPnl >= 0 ? "+" : ""}
                  {fmtPct(mfPnlPct)})
                </p>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col justify-center rounded-2xl">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">XIRR (current holdings)</p>
              <p className={`text-lg sm:text-2xl font-bold ${mfXirr === null ? "text-neutral-500" : mfXirr >= 0 ? "text-green-500" : "text-red-500"}`}>
                {mfXirr === null ? "--" : fmtPct(mfXirr)}
              </p>
              {mfLifetimeXirr !== null && (
                <p
                  className="text-xs text-neutral-500 mt-1"
                  title="Includes funds you have fully redeemed, so their past returns count too."
                >
                  Incl. redeemed funds:{" "}
                  <span className={`font-semibold ${mfLifetimeXirr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {mfLifetimeXirr === 0 ? "—" : fmtPct(mfLifetimeXirr)}
                  </span>
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-2 px-1 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search schemes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-16 py-2 bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-primary-500 rounded-xl text-sm outline-none transition-all dark:text-white"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10">
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex gap-2 items-center overflow-x-auto no-scrollbar pb-1 max-w-full">
            {/* One-Click Hide 0 Balance */}
            <button
              onClick={handleToggleHideZero}
              title={hideZeroBalance ? "Showing active funds (click to show all including 0 balance)" : "Click to hide 0 balance folios/funds"}
              className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm dark:shadow-none shrink-0 ${
                hideZeroBalance
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : "bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
              }`}
            >
              {hideZeroBalance ? <EyeOff size={14} className="text-amber-500 shrink-0" /> : <Eye size={14} className="shrink-0" />}
              <span>{hideZeroBalance ? "0 Bal Hidden" : "Hide 0 Bal"}</span>
              {zeroBalanceCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hideZeroBalance
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                }`}>
                  {zeroBalanceCount}
                </span>
              )}
            </button>

            {/* BUG-036: show only zero-value funds, to find old entries to delete */}
            <button
              onClick={handleToggleShowOnlyZero}
              aria-pressed={showOnlyZero}
              title={showOnlyZero ? "Showing only 0-value funds (click to show all)" : "Show only 0-value funds, to clean up old entries"}
              className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm dark:shadow-none shrink-0 ${
                showOnlyZero
                  ? "bg-primary-600/10 border-primary-600/30 text-primary-700 dark:text-primary-400"
                  : "bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
              }`}
            >
              <span>{showOnlyZero ? "Only 0 Bal" : "Show only 0 Bal"}</span>
              {zeroBalanceCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-400">
                  {zeroBalanceCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle: Segmented Control */}
            <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("detailed")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  viewMode === "detailed"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-xs font-bold"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                }`}
                title="Cards view"
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  viewMode === "compact"
                    ? "bg-white dark:bg-white/15 text-neutral-900 dark:text-white shadow-xs font-bold"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                }`}
                title="Compact list view"
              >
                <List size={13} />
                <span>Compact</span>
              </button>
            </div>

            {/* Tax Report Download */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/5 border border-transparent rounded-xl px-2.5 py-0.5">
              <select
                value={selectedFy}
                onChange={(e) => setSelectedFy(e.target.value)}
                aria-label="Financial Year"
                className="bg-transparent border-none text-neutral-600 dark:text-neutral-300 text-xs font-medium focus:ring-0 outline-none pr-1 py-1"
              >
                <option value="2026-27" className="dark:bg-surface text-neutral-900 dark:text-white">FY 26-27</option>
                <option value="2025-26" className="dark:bg-surface text-neutral-900 dark:text-white">FY 25-26</option>
                <option value="2024-25" className="dark:bg-surface text-neutral-900 dark:text-white">FY 24-25</option>
                <option value="2023-24" className="dark:bg-surface text-neutral-900 dark:text-white">FY 23-24</option>
              </select>
              <button
                onClick={handleDownloadTaxReport}
                title="Download Tax Report (LTCG / STCG CSV)"
                disabled={isDownloadingReport}
                className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
              >
                {isDownloadingReport ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-500 border-t-transparent" />
                ) : (
                  <Download size={14} />
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "xirr"
                      | "cagr"
                      | "dayChangePct"
                      | "dayChange"
                      | "gains"
                      | "profit"
                      | "value"
                      | "name"
                      | "categoryRank"
                      | "overallRank",
                  )
                }
                aria-label="Sort schemes"
                className="px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-primary-500 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer">
                <option value="xirr">Sort: XIRR (%)</option>
                <option value="cagr">Sort: CAGR (%)</option>
                <option value="dayChangePct">Sort: Daily Change (%)</option>
                <option value="dayChange">Sort: Daily P&amp;L (₹)</option>
                <option value="gains">Sort: Overall Return (%)</option>
                <option value="profit">Sort: Overall Profit (₹)</option>
                <option value="value">Sort: Current Value</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="categoryRank">Sort: Category Rank</option>
                <option value="overallRank">Sort: Overall Rank</option>
              </select>

              <button
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                title={sortOrder === "desc" ? "Descending (Highest first)" : "Ascending (Lowest first)"}
                className="p-2 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
              >
                <ArrowDownUp size={14} className={sortOrder === "desc" ? "text-primary-600 dark:text-primary-400" : "text-neutral-500 rotate-180 transition-transform"} />
                <span className="hidden sm:inline text-[11px] font-semibold">{sortOrder === "desc" ? "High to Low" : "Low to High"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* BUG-035: filter chips. Saved with the list view so they stay after navigating away. */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {MF_CATEGORY_OPTIONS.map((opt) => {
              const on = mfFilters.categories.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setMfFilters((f) => ({
                      ...f,
                      categories: on ? f.categories.filter((c) => c !== opt.value) : [...f.categories, opt.value],
                    }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    on
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            <select
              value={mfFilters.plan}
              onChange={(e) => setMfFilters((f) => ({ ...f, plan: e.target.value as MfFilterState["plan"] }))}
              aria-label="Filter by plan"
              className="px-2.5 py-1 bg-neutral-100 dark:bg-white/5 rounded-lg text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer"
            >
              <option value="ALL">Direct and Regular</option>
              <option value="DIRECT">Direct only</option>
              <option value="REGULAR">Regular only</option>
            </select>
            <button
              type="button"
              aria-pressed={mfFilters.sifOnly}
              onClick={() => setMfFilters((f) => ({ ...f, sifOnly: !f.sifOnly }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                mfFilters.sifOnly
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border-transparent"
              }`}
            >
              SIF only
            </button>
            {isMfFilterActive(mfFilters) && (
              <button
                type="button"
                onClick={() => setMfFilters(EMPTY_MF_FILTERS)}
                className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {filteredSchemes.length > 0 ? (
            viewMode === "compact" ? (
              <div className="space-y-2">
                {/* Mobile scroll indicator banner */}
                <div className="sm:hidden px-3 py-1.5 bg-neutral-100/90 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                  <span>⇄ Swipe table left to view Invested, Gain &amp; Returns</span>
                  <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">Scrollable</span>
                </div>

                <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
                  <div className="grid gap-3 min-w-[840px]">
                  {filteredSchemes.map((scheme) => {
                    const invested = scheme.current - (scheme.profit || 0);
                    const gain = scheme.profit || 0;
                    const isPositive = scheme.return_pct >= 0;
                    const isDayPositive = scheme.day_change >= 0;
                    
                    return (
                      <div
                        key={scheme.scheme_id}
                        onClick={() => router.push(`/holdings/${scheme.scheme_id}`)}
                        className="flex flex-col p-4 bg-white dark:bg-surface border border-neutral-200/80 dark:border-white/[0.06] rounded-2xl gap-3 hover:border-primary-500/20 hover:shadow-md cursor-pointer transition-all duration-300"
                      >
                        {/* Row 1 */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 sm:gap-4 text-sm font-semibold">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-neutral-900 dark:text-white font-bold text-sm sm:text-[15px] truncate max-w-full sm:max-w-[280px]">
                                {scheme.scheme}
                              </span>
                              {scheme.category_label && (
                                <span className="px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-500/10 text-[9px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 border border-primary-200/40 dark:border-primary-500/15 shrink-0">
                                  {scheme.category_label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">{scheme.amc}</p>
                            {scheme.profile_breakdown && scheme.profile_breakdown.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                {scheme.profile_breakdown.map((pb: any, idx: number) => {
                                  const relation = getRelationForProfile(pb.profile_id);
                                  const formattedValue = pb.current_value >= 100000 
                                    ? `₹${(pb.current_value / 100000).toFixed(2)}L`
                                    : `₹${pb.current_value.toLocaleString("en-IN")}`;
                                  return (
                                    <span
                                      key={`mf-pb-${pb.profile_id}-${idx}`}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getProfileBadgeColor(
                                        relation
                                      )}`}
                                    >
                                      <span className="truncate max-w-[70px]">{pb.profile_name}</span>
                                      <span className="opacity-60">•</span>
                                      <span>{formattedValue}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between sm:justify-end items-center text-right shrink-0 gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-white/5">
                            <div className="flex-1 sm:flex-initial sm:w-24 text-left sm:text-right">
                              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Invested</p>
                              <p className="text-neutral-700 dark:text-neutral-300 font-semibold text-xs sm:text-sm">
                                <PrivacyMask>₹{invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</PrivacyMask>
                              </p>
                            </div>
                            <div className="flex-1 sm:flex-initial sm:w-24 text-center sm:text-right">
                              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Gain</p>
                              <p className={`font-bold text-xs sm:text-sm ${gain >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                <PrivacyMask>{gain >= 0 ? "+" : ""}₹{Math.abs(gain).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</PrivacyMask>
                              </p>
                            </div>
                            <div className="flex-1 sm:flex-initial sm:w-28 text-right">
                              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Current</p>
                              <p className="text-neutral-900 dark:text-white text-xs sm:text-base font-bold">
                                <PrivacyMask>₹{scheme.current.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</PrivacyMask>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-white/5 pt-2">
                          <div className="flex gap-4 sm:gap-5 items-center flex-wrap">
                            <div>
                              <span className="text-neutral-400 mr-1">NAV:</span>
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">₹{scheme.nav.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 mr-1">Units:</span>
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{scheme.units?.toFixed(3)}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 mr-1">Avg Price:</span>
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">₹{scheme.avg_price?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                            </div>
                          </div>

                          <div className="flex gap-4 sm:gap-5 justify-between sm:justify-end items-center text-right w-full sm:w-auto">
                            <div>
                              <span className="text-neutral-400 mr-1">Return:</span>
                              <span className={`font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                                {isPositive ? "+" : ""}{scheme.return_pct.toFixed(2)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-400 mr-1">Today:</span>
                              <span className={`font-bold ${isDayPositive ? "text-emerald-500" : "text-red-500"}`}>
                                {isDayPositive ? "+" : ""}{scheme.day_change_pct.toFixed(2)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-400 mr-1">XIRR:</span>
                              <span className={`font-bold ${scheme.xirr !== undefined && scheme.xirr !== null ? (scheme.xirr >= 0 ? "text-emerald-500" : "text-red-500") : "text-neutral-500"}`}>
                                {scheme.xirr !== undefined && scheme.xirr !== null ? `${scheme.xirr.toFixed(2)}%` : "--"}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-400 mr-1">CAGR:</span>
                              <span className={`font-bold ${scheme.cagr !== undefined && scheme.cagr !== null ? (scheme.cagr >= 0 ? "text-emerald-500" : "text-red-500") : "text-neutral-500"}`}>
                                {scheme.cagr !== undefined && scheme.cagr !== null ? `${scheme.cagr.toFixed(2)}%` : "--"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
              filteredSchemes.map((scheme) => (
                <SchemeCard
                  key={scheme.scheme_id}
                  schemeId={scheme.scheme_id}
                  scheme={scheme.scheme}
                  amc={scheme.amc}
                  nav={scheme.nav}
                  avgPrice={scheme.avg_price}
                  units={scheme.units}
                  current={scheme.current}
                  returnPct={scheme.return_pct}
                  xirr={scheme.xirr}
                  cagr={scheme.cagr}
                  dayChange={scheme.day_change}
                  dayChangePct={scheme.day_change_pct}
                  categoryLabel={scheme.category_label}
                  overallRank={scheme.overall_rank}
                  totalHoldings={scheme.total_holdings}
                  categoryRank={scheme.category_rank}
                  categoryTotal={scheme.category_total}
                  profit={scheme.profit}
                  isSif={scheme.is_sif}
                  giftActionNeeded={!!scheme.gift_action_needed}
                  profileBreakdown={scheme.profile_breakdown}
                  onClick={() => router.push(`/holdings/${scheme.scheme_id}`)}
                  onShare={() =>
                    setSelectedShareStock({
                      symbol: scheme.scheme,
                      pnl_pct: scheme.return_pct,
                      value: scheme.current,
                    })
                  }
                  onEdit={() => {
                    setEditingScheme({ ...scheme });
                    setIsEditModalOpen(true);
                  }}
                  onDelete={() => handleDeleteScheme(scheme.scheme_id)}
                  onBuy={() => {
                    setPrefillSchemeId(scheme.scheme_id);
                    setPrefillMfType("PURCHASE");
                    setShowAddTx(true);
                  }}
                  onSell={() => {
                    setPrefillSchemeId(scheme.scheme_id);
                    setPrefillMfType("REDEMPTION");
                    setShowAddTx(true);
                  }}
                />
              ))
            )
          ) : (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 space-y-2">
              <p>No schemes found. Try clearing search or changing sort.</p>
              <div className="flex items-center justify-center gap-4">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                    Clear search
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setPrefillSchemeId(null);
                    setPrefillMfType("PURCHASE");
                    setShowAddTx(true);
                  }}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                  Buy / Sell MF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShareStockModal
        isOpen={!!selectedShareStock}
        onClose={() => setSelectedShareStock(null)}
        stock={selectedShareStock || { symbol: "", pnl_pct: 0, value: 0 }}
      />

      <AddTransactionModal
        isOpen={showAddTx}
        initialTab={addTxInitialTab}
        onClose={() => {
          setShowAddTx(false);
          setPrefillSchemeId(null);
          setPrefillMfType("PURCHASE");
          setAddTxInitialTab("MANUAL");
        }}
        onSuccess={async (customMsg?: string) => {
          showToast(customMsg || "Transaction saved! Updating portfolio...", "success");
          api.clearPortfolioCache();
          await loadData();
        }}
        initialSchemeId={prefillSchemeId}
        initialTransactionType={prefillMfType}
      />

      {/* Edit Scheme Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingScheme(null);
        }}
        title="Edit Mutual Fund Holding">
        <form onSubmit={handleUpdateScheme} className="space-y-4">
          <Input
            label="Scheme"
            value={editingScheme?.scheme || ""}
            disabled
            className="bg-neutral-100 dark:bg-white/5 opacity-70"
          />
          <Input
            label="Units"
            type="number"
            step="0.0001"
            value={
              editingScheme?.units !== undefined ? editingScheme.units : ""
            }
            onChange={(e) =>
              setEditingScheme({ ...editingScheme, units: e.target.value })
            }
            required
            autoComplete="off"
          />
          <Input
            label="Total Invested Amount (₹)"
            type="number"
            step="0.01"
            value={
              editingScheme?.invested !== undefined
                ? editingScheme.invested
                : ""
            }
            onChange={(e) =>
              setEditingScheme({ ...editingScheme, invested: e.target.value })
            }
            required
            autoComplete="off"
          />
          <Button type="submit" className="w-full">
            Update Mutual Fund
          </Button>
        </form>
      </Modal>
    </div>
  );
}
