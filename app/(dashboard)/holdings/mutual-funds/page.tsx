"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import SchemeCard from "@/components/features/SchemeCard";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import ShareStockModal from "@/components/features/ShareStockModal";
import AddTransactionModal from "@/components/features/AddTransactionModal";
import { Search, Plus, Share2, UploadCloud, Grid, List, Download, ArrowDownUp } from "lucide-react";
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
  const { activeProfileId } = useProfile();

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
    | "gains"
    | "profit"
    | "value"
    | "dayChange"
    | "name"
    | "rank"
    | "categoryRank"
    | "overallRank"
  >("xirr");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [allocationView, setAllocationView] = useState<"amc" | "scheme">("amc");
  const [showAddTx, setShowAddTx] = useState(false);
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
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");
  const [selectedFy, setSelectedFy] = useState("2025-26");
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("holdings_view_mode");
    if (saved === "compact" || saved === "detailed") {
      setViewMode(saved);
    }
  }, []);

  const handleToggleViewMode = () => {
    const nextMode = viewMode === "compact" ? "detailed" : "compact";
    setViewMode(nextMode);
    localStorage.setItem("holdings_view_mode", nextMode);
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

  const filteredSchemes = schemes
    .filter((s) => s.scheme?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "xirr") {
        const aVal = a.xirr !== null && a.xirr !== undefined ? Number(a.xirr) : -Infinity;
        const bVal = b.xirr !== null && b.xirr !== undefined ? Number(b.xirr) : -Infinity;
        comparison = bVal - aVal;
      } else if (sortBy === "gains") {
        comparison = (b.return_pct ?? 0) - (a.return_pct ?? 0);
      } else if (sortBy === "value") {
        comparison = b.current - a.current;
      } else if (sortBy === "profit") {
        comparison = (b.profit ?? 0) - (a.profit ?? 0);
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
  const allocationData =
    allocationView === "amc" ? amcAllocation : schemeAllocationChartData;
  const allocationNameKey = allocationView === "amc" ? "amc" : "scheme";
  const allocationCenterLabel = allocationView === "amc" ? "AMCs" : "Funds";
  const allocationLegendData =
    allocationView === "amc" ? amcAllocation : schemeAllocation.slice(0, 6);

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
        onClose={() => {
          setShowImportWizard(false);
          router.replace("/holdings/mutual-funds");
        }}
      />
    );
  }

  if (schemes.length === 0 && !isLoading) {
    return (
      <>
        <MutualFundsZeroState
          onImportClick={() => setShowImportWizard(true)}
          onManualClick={() => setShowAddTx(true)}
        />
        <AddTransactionModal
          isOpen={showAddTx}
          onClose={() => setShowAddTx(false)}
          onSuccess={() => {
            loadData();
            // If success, we likely have data now, so the parent re-render
            // will show the main dashboard instead of zero state.
            showToast("Transaction added successfully", "success");
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

      <MutualFundJourneyChart
        data={journeyHistory || undefined}
        coverageStart={journeyMeta?.coverage_start || null}
        coveredSchemes={journeyMeta?.covered_schemes || 0}
        onRangeChange={handleRangeChange}
        selectedRange={journeyRange}
        isRefetching={isJourneyRefetching}
      />

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
                      : "Compare concentration fund by fund"}
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
              {(["amc", "scheme"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setAllocationView(view)}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
                    allocationView === view
                      ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}>
                  {view === "amc" ? "AMC Wise" : "Scheme Wise"}
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
                    `${schemeAllocation.length} ${allocationCenterLabel}`
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
                        allocationView === "amc" ? entry.amc : entry.scheme
                      }>
                      {allocationView === "amc" ? entry.amc : entry.scheme}
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

      {/* Schemes List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            All Schemes ({schemes.length})
          </h3>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <button
              onClick={() => {
                setShowImportWizard(true);
              }}
              className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center justify-center gap-1 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors">
              <UploadCloud size={16} />
              <span>Import CAS</span>
            </button>
            <button
              onClick={() => {
                setPrefillSchemeId(null);
                setPrefillMfType("PURCHASE");
                setShowAddTx(true);
              }}
              className="flex-1 sm:flex-none px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors shadow-lg shadow-primary-500/20">
              <Plus size={16} />
              <span>Buy / Sell MF</span>
            </button>
          </div>
        </div>

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
          <div className="flex gap-2 flex-wrap items-center">
            {/* View Toggle */}
            <button
              onClick={handleToggleViewMode}
              title={viewMode === "compact" ? "Detailed card view" : "Compact list view"}
              className="px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-transparent hover:bg-neutral-200 dark:hover:bg-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {viewMode === "compact" ? <Grid size={14} /> : <List size={14} />}
              <span className="hidden sm:inline">{viewMode === "compact" ? "Detailed" : "Compact"}</span>
            </button>

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
                      | "gains"
                      | "profit"
                      | "value"
                      | "dayChange"
                      | "name"
                      | "categoryRank"
                      | "overallRank",
                  )
                }
                aria-label="Sort schemes"
                className="px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-primary-500 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer">
                <option value="xirr">Sort: XIRR (%)</option>
                <option value="gains">Sort: Overall Return (%)</option>
                <option value="profit">Sort: Overall Profit (₹)</option>
                <option value="value">Sort: Current Value</option>
                <option value="dayChange">Sort: Daily Change</option>
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
          {filteredSchemes.length > 0 ? (
            viewMode === "compact" ? (
              <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
                <div className="grid gap-3 min-w-[780px]">
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
                        <div className="flex justify-between items-center gap-4 text-sm font-semibold">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-neutral-900 dark:text-white font-bold text-[15px] truncate max-w-[280px]">
                                {scheme.scheme}
                              </span>
                              {scheme.category_label && (
                                <span className="px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-500/10 text-[9px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 border border-primary-200/40 dark:border-primary-500/15 shrink-0">
                                  {scheme.category_label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">{scheme.amc}</p>
                          </div>
                          <div className="flex gap-6 justify-end items-center text-right shrink-0">
                            <div className="w-24">
                              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Invested</p>
                              <p className="text-neutral-700 dark:text-neutral-300 font-semibold text-xs sm:text-sm">
                                <PrivacyMask>₹{invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</PrivacyMask>
                              </p>
                            </div>
                            <div className="w-24">
                              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Gain</p>
                              <p className={`font-bold text-xs sm:text-sm ${gain >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                <PrivacyMask>{gain >= 0 ? "+" : ""}₹{Math.abs(gain).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</PrivacyMask>
                              </p>
                            </div>
                            <div className="w-28">
                              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Current</p>
                              <p className="text-neutral-900 dark:text-white text-sm sm:text-base font-bold">
                                <PrivacyMask>₹{scheme.current.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</PrivacyMask>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="flex justify-between items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-white/5 pt-2">
                          <div className="flex gap-6 items-center flex-wrap">
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

                          <div className="flex gap-6 justify-end items-center text-right shrink-0">
                            <div className="w-24">
                              <span className="text-neutral-400 mr-1">Return:</span>
                              <span className={`font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                                {isPositive ? "+" : ""}{scheme.return_pct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="w-24">
                              <span className="text-neutral-400 mr-1">Today:</span>
                              <span className={`font-bold ${isDayPositive ? "text-emerald-500" : "text-red-500"}`}>
                                {isDayPositive ? "+" : ""}{scheme.day_change_pct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="w-28">
                              <span className="text-neutral-400 mr-1">XIRR:</span>
                              <span className={`font-bold ${scheme.xirr !== undefined && scheme.xirr !== null ? (scheme.xirr >= 0 ? "text-emerald-500" : "text-red-500") : "text-neutral-500"}`}>
                                {scheme.xirr !== undefined && scheme.xirr !== null ? `${scheme.xirr.toFixed(2)}%` : "--"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  dayChange={scheme.day_change}
                  dayChangePct={scheme.day_change_pct}
                  categoryLabel={scheme.category_label}
                  overallRank={scheme.overall_rank}
                  totalHoldings={scheme.total_holdings}
                  categoryRank={scheme.category_rank}
                  categoryTotal={scheme.category_total}
                  profit={scheme.profit}
                  isSif={scheme.is_sif}
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
        onClose={() => {
          setShowAddTx(false);
          setPrefillSchemeId(null);
          setPrefillMfType("PURCHASE");
        }}
        onSuccess={() => {
          loadData();
          showToast("Transaction added successfully", "success");
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
