"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import SchemeCard from "@/components/features/SchemeCard";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import ShareStockModal from "@/components/features/ShareStockModal";
import AddTransactionModal from "@/components/features/AddTransactionModal";
import {
  TrendingUp,
  Search,
  ArrowUpDown,
  Plus,
  Share2,
  Pencil,
  Trash2,
  Upload,
  FileSpreadsheet,
  Info,
  Loader2,
  FileUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PrivacyMask from "@/components/ui/PrivacyMask";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function HoldingsPage() {
  const router = useRouter();
  const [view, setView] = useState<"mutual-funds" | "stocks">("mutual-funds");
  const [isLoading, setIsLoading] = useState(true);

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as "success" | "error" | "loading" | "info",
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" = "success"
  ) => {
    setToast({ message, type, isVisible: true });
    // Auto-hide if not loading
    if (type !== "loading") {
      setTimeout(
        () => setToast((prev) => ({ ...prev, isVisible: false })),
        3000
      );
    }
  };

  // Data State
  const [schemes, setSchemes] = useState<any[]>([]);
  const [amcAllocation, setAmcAllocation] = useState<any[]>([]);
  const [manualStocks, setManualStocks] = useState<any[]>([]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "name" | "profit">("name");
  const [showAddTx, setShowAddTx] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Share Modal State
  const [selectedShareStock, setSelectedShareStock] = useState<any>(null);

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({
    symbol: "",
    quantity: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
    transaction_type: "BUY" as "BUY" | "SELL",
  });
  const [stockModalTab, setStockModalTab] = useState<"MANUAL" | "IMPORT">(
    "MANUAL"
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [broker, setBroker] = useState("ZERODHA");

  // Search State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isValidSymbol, setIsValidSymbol] = useState(false);

  // Edit Stock State
  const [editingStock, setEditingStock] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Stock Statistics Calculation
  const stockStats = useMemo(() => {
    let invested = 0;
    let current = 0;
    manualStocks.forEach((s) => {
      invested += (s.quantity || 0) * (s.avg_price || 0);
      current += s.value || 0;
    });
    const pnl = current - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, current, pnl, pnlPct };
  }, [manualStocks]);

  // Stock Sector Allocation
  const stockSectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    manualStocks.forEach((s) => {
      const sec = s.sector || "Other";
      sectors[sec] = (sectors[sec] || 0) + (s.value || 0);
    });
    return Object.entries(sectors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [manualStocks]);

  useEffect(() => {
    loadData();
  }, []);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (stockForm.symbol.length > 2 && !isValidSymbol) {
        setIsSearching(true);
        try {
          const results = await api.searchStocks(stockForm.symbol);
          setSearchResults(results);
          setShowSearchResults(true);
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [stockForm.symbol, isValidSymbol]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schemesData, amcData, equityData] = await Promise.all([
        api.getSchemes().catch(() => []),
        api.getAMCAllocation().catch(() => []),
        api.getEquitySummary().catch(() => ({ holdings: [] })),
      ]);
      setSchemes(schemesData);
      setAmcAllocation(amcData);
      setManualStocks(equityData.holdings || []);
    } catch (err) {
      console.error("Failed to load data", err);
      showToast("Failed to load portfolio data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    showToast("Refreshing prices...", "loading");
    try {
      await api.refreshStockPrices();
      await loadData();
      showToast("Stock prices updated", "success");
    } catch (err) {
      showToast("Failed to update prices", "error");
    } finally {
      setIsRefreshing(false);
      showToast("Failed to refresh prices", "error");
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showToast("Recording transaction...", "loading");
      await api.addStockTransaction({
        symbol: stockForm.symbol,
        quantity: Number(stockForm.quantity),
        price: Number(stockForm.price),
        date: stockForm.date,
        transaction_type: stockForm.transaction_type,
      });
      await loadData();
      setShowStockModal(false);
      setStockForm({
        symbol: "",
        quantity: "",
        price: "",
        date: new Date().toISOString().split("T")[0],
        transaction_type: "BUY",
      });
      setIsValidSymbol(false);
      showToast("Transaction recorded successfully", "success");
    } catch (err: any) {
      showToast("Failed: " + err.message, "error");
    }
  };

  const handleImportStocks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast("Please select a file", "error");
      return;
    }

    setIsImporting(true);
    // showToast("Importing trades...", "loading"); // Optional: Button has loader now

    try {
      const res = await api.importTrades(importFile, broker);
      showToast(`Imported ${res.added} holdings successfully.`, "success");
      await loadData();
      setShowStockModal(false);
      setImportFile(null);
    } catch (err) {
      showToast("Failed to import trades", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteStock = async (holdingId: number) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;
    try {
      await api.deleteHolding(holdingId);
      loadData();
      showToast("Holding deleted", "success");
    } catch (err) {
      showToast("Failed to delete holding", "error");
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    try {
      showToast("Updating stock...", "loading");
      await api.updateHolding(editingStock.id, {
        quantity: Number(editingStock.quantity),
        avg_price: Number(editingStock.avg_price),
      });
      await loadData();
      setIsEditModalOpen(false);
      setEditingStock(null);
      showToast("Stock updated successfully", "success");
    } catch (err: any) {
      showToast("Failed to update stock", "error");
    }
  };

  if (isLoading) return <AppSkeleton />;

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
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                AMC Allocation
              </h3>
              <button
                onClick={() => {
                  // Calculate total portfolio stats
                  const totalCurrent = schemes.reduce(
                    (sum, s) => sum + s.current,
                    0
                  );
                  // Estimate invested based on current and return %
                  // current = invested * (1 + pct/100) => invested = current / (1 + pct/100)
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
                    <PrivacyMask>
                      {(totalMFValue / 100000).toFixed(1)}L
                    </PrivacyMask>
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
              <button
                onClick={() => {
                  setShowAddTx(true);
                }}
                className="px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors">
                <Plus size={16} /> Add Transaction
              </button>
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
                    nav={scheme.nav}
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
                Total Value:{" "}
                <PrivacyMask>₹{totalStockValue.toLocaleString()}</PrivacyMask>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowStockModal(true);
                  setStockModalTab("MANUAL");
                }}
                className="px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors">
                <Plus size={16} /> Add Transaction
              </button>
              <button
                onClick={() => {
                  setShowStockModal(true);
                  setStockModalTab("IMPORT");
                }}
                className="p-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors aspect-square flex items-center justify-center"
                title="Import Stocks">
                <FileUp size={20} />
              </button>
            </div>
          </div>

          {manualStocks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Sector Allocation */}
              <Card className="col-span-1 p-6 flex flex-col items-center justify-center bg-white dark:bg-surface border border-neutral-200 dark:border-white/5">
                <h3 className="text-sm font-medium text-neutral-500 mb-4 w-full text-left">
                  Sector Allocation
                </h3>
                <div className="h-[200px] w-full max-w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockSectorData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}>
                        {stockSectorData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => `₹${value.toLocaleString()}`}
                        contentStyle={{
                          backgroundColor: "#1A1F2B",
                          border: "none",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Compact Legend */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {stockSectorData.slice(0, 3).map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-[10px]">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}></div>
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                  {stockSectorData.length > 3 && (
                    <span className="text-[10px] text-neutral-400">
                      +{stockSectorData.length - 3} more
                    </span>
                  )}
                </div>
              </Card>

              {/* Stats Cards */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 h-full">
                <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col justify-center">
                  <p className="text-sm text-neutral-500 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    <PrivacyMask>
                      ₹
                      {stockStats.current.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </PrivacyMask>
                  </p>
                </Card>
                <Card className="p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col justify-center">
                  <p className="text-sm text-neutral-500 mb-1">
                    Invested Amount
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    <PrivacyMask>
                      ₹
                      {stockStats.invested.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </PrivacyMask>
                  </p>
                </Card>
                <Card className="col-span-2 p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">
                      Total Profit/Loss
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        stockStats.pnl >= 0 ? "text-green-500" : "text-red-500"
                      }`}>
                      <PrivacyMask>
                        {stockStats.pnl >= 0 ? "+" : ""}₹
                        {stockStats.pnl.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </PrivacyMask>
                    </p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      stockStats.pnl >= 0
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    } font-bold text-xl`}>
                    {stockStats.pnlPct.toFixed(2)}%
                  </div>
                </Card>
              </div>
            </div>
          )}

          {manualStocks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {manualStocks.map((stock, i) => (
                <Card
                  key={i}
                  className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-2">
                      <h4 className="font-bold text-neutral-900 dark:text-white text-lg flex items-center gap-2">
                        {stock.symbol}
                        {stock.short_name && (
                          <span className="text-xs font-normal text-neutral-400">
                            {stock.short_name}
                          </span>
                        )}
                      </h4>
                      {stock.company_name &&
                        stock.company_name !== stock.symbol && (
                          <p className="text-xs text-neutral-500 font-medium truncate max-w-[200px] mb-1">
                            {stock.company_name}
                          </p>
                        )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        <PrivacyMask>
                          ₹{stock.value?.toLocaleString()}
                        </PrivacyMask>
                      </p>
                      {stock.avg_price && (
                        <div className="text-xs text-neutral-500 mt-0.5 space-y-0.5">
                          <p>Avg: ₹{stock.avg_price?.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      {stock.sector && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-white/10 rounded text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/5">
                          {stock.sector}
                        </span>
                      )}
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {stock.quantity} shares
                      </p>
                      {stock.pnl_pct !== undefined && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            stock.pnl_pct >= 0
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}>
                          {stock.pnl_pct >= 0 ? "+" : ""}
                          {stock.pnl_pct.toFixed(2)}%
                        </span>
                      )}
                    </div>

                    {stock.current_price && (
                      <div className="text-[10px] text-neutral-400 text-right">
                        LTP: ₹{stock.current_price?.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex justify-end items-center gap-1 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStock({ ...stock });
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Edit Stock">
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStock(stock.id);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Delete Stock">
                      <Trash2 size={14} /> Delete
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShareStock(stock);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Share Performance">
                      <Share2 size={14} /> Share
                    </button>
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

      {/* Add Stock Transaction Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Record Stock Transaction">
        <div className="flex border-b border-neutral-200 dark:border-white/10 mb-6">
          <button
            onClick={() => setStockModalTab("MANUAL")}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              stockModalTab === "MANUAL"
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}>
            Manual Entry
            {stockModalTab === "MANUAL" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
          <button
            onClick={() => setStockModalTab("IMPORT")}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              stockModalTab === "IMPORT"
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}>
            Import File
            {stockModalTab === "IMPORT" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        </div>

        {stockModalTab === "MANUAL" ? (
          <form onSubmit={handleAddStock} className="space-y-4">
            <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() =>
                  setStockForm({ ...stockForm, transaction_type: "BUY" })
                }
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  stockForm.transaction_type === "BUY"
                    ? "bg-white dark:bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
                }`}>
                Buy
              </button>
              <button
                type="button"
                onClick={() =>
                  setStockForm({ ...stockForm, transaction_type: "SELL" })
                }
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  stockForm.transaction_type === "SELL"
                    ? "bg-white dark:bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
                }`}>
                Sell
              </button>
            </div>

            <div className="relative">
              <Input
                label="Stock Symbol"
                placeholder="e.g. RELIANCE"
                value={stockForm.symbol}
                onChange={(e) => {
                  setStockForm({
                    ...stockForm,
                    symbol: e.target.value.toUpperCase(),
                  });
                  setShowSearchResults(true);
                  setIsValidSymbol(false);
                }}
                required
                autoComplete="off"
              />
              {showSearchResults && stockForm.symbol.length > 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-sm text-neutral-500 text-center">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result: any) => (
                      <button
                        key={result.symbol}
                        type="button"
                        onClick={async () => {
                          const symbol = result.symbol;
                          setStockForm((prev) => ({
                            ...prev,
                            symbol: symbol,
                            price: "Loading...",
                          }));
                          setShowSearchResults(false);
                          setIsValidSymbol(true);

                          try {
                            const quote = await api.getStockQuote(symbol);
                            if (quote && quote.price) {
                              setStockForm((prev) => ({
                                ...prev,
                                price: quote.price.toFixed(2),
                              }));
                            } else {
                              setStockForm((prev) => ({ ...prev, price: "" }));
                            }
                          } catch (e) {
                            console.error("Quote fetch error", e);
                            setStockForm((prev) => ({ ...prev, price: "" }));
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 border-b border-neutral-100 dark:border-white/5 last:border-0 transition-colors">
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {result.symbol}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {result.name} • {result.exchange}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-neutral-500 text-center">
                      No results found
                    </div>
                  )}
                </div>
              )}
              {stockForm.symbol.length > 0 && !isValidSymbol && (
                <p className="text-xs text-red-500 mt-1 ml-1">
                  Please select a valid stock from the search results
                </p>
              )}
            </div>
            <Input
              label="Quantity"
              type="number"
              placeholder="10"
              value={stockForm.quantity}
              onChange={(e) =>
                setStockForm({ ...stockForm, quantity: e.target.value })
              }
              required
              autoComplete="off"
            />
            <Input
              label="Average Buy Price (₹)"
              type="number"
              placeholder="2400.50"
              value={stockForm.price}
              onChange={(e) =>
                setStockForm({ ...stockForm, price: e.target.value })
              }
              required
              autoComplete="off"
            />
            <Button type="submit" className="w-full" disabled={!isValidSymbol}>
              {stockForm.transaction_type === "BUY"
                ? "Buy Stock"
                : "Sell Stock"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleImportStocks} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300 ml-1">
                  Select Broker
                </label>
                <select
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none">
                  <option value="ZERODHA">Zerodha (Kite)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300 ml-1">
                  Upload Tradebook or Holdings (CSV)
                </label>
                <div className="border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-white/5 text-center hover:border-primary-500/50 transition-colors">
                  <FileSpreadsheet className="w-10 h-10 text-neutral-400 mb-3" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="stock-file-upload"
                  />
                  <label
                    htmlFor="stock-file-upload"
                    className="text-primary-500 font-medium cursor-pointer hover:underline mb-1">
                    Click to upload
                  </label>
                  <p className="text-sm text-neutral-400">
                    {importFile
                      ? importFile.name
                      : "or drag and drop CSV file here"}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex gap-3 items-start">
                <Info className="flex-shrink-0 w-5 h-5 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Supports <b>holdings</b> (Current Snapshot) CSV from
                  Zerodha/Kite.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-4 text-base"
              variant="primary"
              disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Import Stocks
                </>
              )}
            </Button>
          </form>
        )}
      </Modal>

      {/* Edit Stock Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStock(null);
        }}
        title="Edit Stock Holding">
        <form onSubmit={handleUpdateStock} className="space-y-4">
          <Input
            label="Stock Symbol"
            value={editingStock?.symbol || ""}
            disabled
            className="bg-neutral-100 dark:bg-white/5 opacity-70"
          />
          <Input
            label="Quantity"
            type="number"
            value={editingStock?.quantity || ""}
            onChange={(e) =>
              setEditingStock({ ...editingStock, quantity: e.target.value })
            }
            required
            autoComplete="off"
          />
          <Input
            label="Average Buy Price (₹)"
            type="number"
            value={editingStock?.avg_price || ""}
            onChange={(e) =>
              setEditingStock({ ...editingStock, avg_price: e.target.value })
            }
            required
            autoComplete="off"
          />
          <Button type="submit" className="w-full">
            Update Holding
          </Button>
        </form>
      </Modal>

      <ShareStockModal
        isOpen={!!selectedShareStock}
        onClose={() => setSelectedShareStock(null)}
        stock={selectedShareStock}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
      {/* Add Transaction Modal (Global for page) */}
      <AddTransactionModal
        isOpen={showAddTx}
        onClose={() => setShowAddTx(false)}
        onSuccess={() => {
          loadData();
          showToast("Transaction added successfully", "success");
        }}
      />
    </div>
  );
}
