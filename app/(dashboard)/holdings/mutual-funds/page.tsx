"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import SchemeCard from "@/components/features/SchemeCard";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import ShareStockModal from "@/components/features/ShareStockModal";
import AddTransactionModal from "@/components/features/AddTransactionModal";
import { Search, ArrowUpDown, Plus, Share2, UploadCloud } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PrivacyMask from "@/components/ui/PrivacyMask";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import OnboardingWizard from "@/components/features/OnboardingWizard";
import MutualFundsZeroState from "@/components/features/MutualFundsZeroState";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function MutualFundsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "name" | "profit">("name");
  const [showAddTx, setShowAddTx] = useState(false);

  // Share Modal State
  const [selectedShareStock, setSelectedShareStock] = useState<any>(null);

  // Onboarding State
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Edit Scheme State
  const [editingScheme, setEditingScheme] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [schemesRes, amcRes] = await Promise.all([
        api.getSchemes(),
        api.getAMCAllocation(),
      ]);
      setSchemes(schemesRes);
      setAmcAllocation(amcRes);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      showToast("Failed to load mutual funds", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredSchemes = schemes
    .filter((s) => s.scheme?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "value") return b.current - a.current;
      if (sortBy === "profit") return b.profit - a.profit;
      return a.scheme?.localeCompare(b.scheme);
    });

  if (isLoading) {
    return <AppSkeleton />;
  }

  if (schemes.length === 0 && !isLoading) {
    if (showImportWizard) {
      return (
        <OnboardingWizard
          initialStep={2} // specific step for upload
          onAddTransactionClick={() => {
            setShowImportWizard(false);
            setShowAddTx(true);
          }}
          onClose={() => setShowImportWizard(false)}
        />
      );
    }

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

      {/* AMC Allocation Chart */}
      <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              AMC Allocation
              {lastUpdated && (
                <span className="text-xs font-normal text-neutral-400 bg-neutral-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  Updated{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </h3>
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
            className="p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-full transition-all"
            title="Share Portfolio Performance">
            <Share2 size={20} />
          </button>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-[200px] w-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={amcAllocation}
                  dataKey="current"
                  nameKey="amc"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}>
                  {amcAllocation.map((entry, index) => (
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
            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Total
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>{(totalMFValue / 100000).toFixed(1)}L</PrivacyMask>
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
            {amcAllocation.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1">
                  <p
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]"
                    title={entry.amc}>
                    {entry.amc}
                  </p>
                  <p className="text-xs text-neutral-500">{entry.percent}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Schemes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            All Schemes ({schemes.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowImportWizard(true);
              }}
              className="px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors">
              <UploadCloud size={16} />{" "}
              <span className="hidden sm:inline">Import CAS</span>
            </button>
            <button
              onClick={() => {
                setShowAddTx(true);
              }}
              className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium flex items-center gap-1 transition-colors shadow-lg shadow-primary-500/20">
              <Plus size={16} /> Add Funds
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 px-1">
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
              className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-primary-500 rounded-xl text-sm outline-none transition-all dark:text-white"
            />
          </div>
          <button
            onClick={() =>
              setSortBy(
                sortBy === "value"
                  ? "name"
                  : sortBy === "name"
                    ? "profit"
                    : "value",
              )
            }
            className="px-3 py-2 bg-neutral-100 dark:bg-white/5 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
            {sortBy === "value"
              ? "Value"
              : sortBy === "name"
                ? "Name"
                : "Profit"}
            <ArrowUpDown size={14} />
          </button>
        </div>

        <div className="space-y-4">
          {filteredSchemes.length > 0 ? (
            filteredSchemes.map((scheme) => (
              <SchemeCard
                key={scheme.scheme_id}
                schemeId={scheme.scheme_id}
                scheme={scheme.scheme}
                amc={scheme.amc}
                nav={scheme.nav}
                units={scheme.units}
                current={scheme.current}
                returnPct={scheme.return_pct}
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
              />
            ))
          ) : (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              No schemes found
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
        onClose={() => setShowAddTx(false)}
        onSuccess={() => {
          loadData();
          showToast("Transaction added successfully", "success");
        }}
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
