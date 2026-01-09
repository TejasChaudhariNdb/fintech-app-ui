"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import SchemeCard from "@/components/features/SchemeCard";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AppSkeleton from "@/components/ui/AppSkeleton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { TrendingUp, Search, ArrowUpDown, Plus } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

export default function HoldingsPage() {
  const router = useRouter();
  const [view, setView] = useState("mutual-funds");
  const [schemes, setSchemes] = useState<any[]>([]);
  const [amcAllocation, setAmcAllocation] = useState<any[]>([]);
  const [manualStocks, setManualStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "name" | "profit">("value");

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as any,
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" = "success"
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
  };

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({
    symbol: "",
    quantity: "",
    avgPrice: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, a, e] = await Promise.all([
        api.getSchemes().catch(() => []),
        api.getAMCAllocation().catch(() => []),
        api.getEquitySummary().catch(() => ({ holdings: [] })),
      ]);
      setSchemes(s);
      setAmcAllocation(a);
      setManualStocks(e.holdings || []);
    } catch (err) {
      console.error("Error loading holdings:", err);
      showToast("Failed to load portfolio data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showToast("Adding stock...", "loading");
      await api.addEquity(
        stockForm.symbol,
        Number(stockForm.quantity),
        Number(stockForm.avgPrice)
      );
      await loadData();
      setShowStockModal(false);
      setStockForm({ symbol: "", quantity: "", avgPrice: "" });
      showToast("Stock added successfully", "success");
    } catch (err: any) {
      showToast("Failed to add stock: " + err.message, "error");
    }
  };

  if (loading) return <AppSkeleton />;

  const totalMFValue = amcAllocation.reduce(
    (sum, item) => sum + item.current,
    0
  );
  const totalStockValue = manualStocks.reduce(
    (sum, item) => sum + (item.value || 0),
    0
  );

  const filteredSchemes = schemes
    .filter(
      (s) =>
        s.scheme.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.amc.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "value") return b.current - a.current;
      if (sortBy === "profit") return b.profit - a.profit;
      return a.scheme.localeCompare(b.scheme);
    });

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header with Toggle */}
      <div className="bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5 sticky top-0 z-20 transition-colors">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold mb-4">Holdings</h1>

          <div className="flex gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
            <button
              onClick={() => setView("mutual-funds")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                view === "mutual-funds"
                  ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-md dark:shadow-primary-500/20"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              Mutual Funds
            </button>
            <button
              onClick={() => setView("stocks")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                view === "stocks"
                  ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-md dark:shadow-primary-500/20"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}>
              Stocks
            </button>
          </div>
        </div>
      </div>

      {view === "mutual-funds" ? (
        <div className="px-4 pt-6 space-y-6">
          {/* AMC Allocation Chart */}
          <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-white">
              AMC Allocation
            </h3>
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
                    {(totalMFValue / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-3">
                {amcAllocation.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[150px]">
                        {item.amc}
                      </span>
                    </div>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {item.percent.toFixed(1)}%
                    </span>
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
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "value"
                      ? "name"
                      : prev === "name"
                      ? "profit"
                      : "value"
                  )
                }
                className="px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center gap-1 min-w-[90px] justify-center">
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
                    current={scheme.current}
                    returnPct={scheme.return_pct}
                    onClick={() => router.push(`/holdings/${scheme.scheme_id}`)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No schemes found
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-6 space-y-6">
          {/* Manual Stocks */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                My Stocks
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Total Value: ₹{totalStockValue.toLocaleString()}
              </p>
            </div>
            <Button
              onClick={() => setShowStockModal(true)}
              className="gap-2 py-2 px-4 text-sm">
              <Plus size={16} /> Add Stock
            </Button>
          </div>

          {manualStocks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {manualStocks.map((stock, i) => (
                <Card
                  key={i}
                  className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white">
                        {stock.symbol}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {stock.quantity} shares
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        ₹{stock.value?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-10 text-center border-dashed border-2 border-neutral-200 dark:border-white/10">
              <div className="flex justify-center mb-4">
                <TrendingUp className="h-12 w-12 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                No stocks added
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Add your stock holdings manually to track net worth.
              </p>
              <Button onClick={() => setShowStockModal(true)} variant="primary">
                Add Your First Stock
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Add Stock Holding">
        <form onSubmit={handleAddStock} className="space-y-4">
          <Input
            label="Stock Symbol"
            placeholder="e.g. RELIANCE"
            value={stockForm.symbol}
            onChange={(e) =>
              setStockForm({
                ...stockForm,
                symbol: e.target.value.toUpperCase(),
              })
            }
            required
          />
          <Input
            label="Quantity"
            type="number"
            placeholder="10"
            value={stockForm.quantity}
            onChange={(e) =>
              setStockForm({ ...stockForm, quantity: e.target.value })
            }
            required
          />
          <Input
            label="Average Buy Price (₹)"
            type="number"
            placeholder="2400.50"
            value={stockForm.avgPrice}
            onChange={(e) =>
              setStockForm({ ...stockForm, avgPrice: e.target.value })
            }
            required
          />
          <Button type="submit" className="w-full">
            Add Holding
          </Button>
        </form>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
