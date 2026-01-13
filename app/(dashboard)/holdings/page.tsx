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
import ShareStockModal from "@/components/features/ShareStockModal";
import AddTransactionModal from "@/components/features/AddTransactionModal";
import {
  TrendingUp,
  Search,
  ArrowUpDown,
  Plus,
  Share2,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PrivacyMask from "@/components/ui/PrivacyMask";

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
  const [showAddTx, setShowAddTx] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Share Modal State
  const [selectedShareStock, setSelectedShareStock] = useState<any>(null);

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
    price: "",
    date: new Date().toISOString().split("T")[0],
    transaction_type: "BUY" as "BUY" | "SELL",
  });

  // Search State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isValidSymbol, setIsValidSymbol] = useState(false);

  // Edit Stock State
  const [editingStock, setEditingStock] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(async () => {
      if (stockForm.symbol.length > 2 && showSearchResults) {
        setIsSearching(true);
        try {
          const results = await api.searchStocks(stockForm.symbol);
          setSearchResults(results);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [stockForm.symbol, showSearchResults]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Try Cache
      if (typeof window !== "undefined") {
        const cSchemes = localStorage.getItem("schemes");
        const cAmc = localStorage.getItem("amc-allocation");
        const cEquity = localStorage.getItem("equity-summary");

        if (cSchemes && cAmc && cEquity) {
          try {
            setSchemes(JSON.parse(cSchemes).data);
            setAmcAllocation(JSON.parse(cAmc).data);
            setManualStocks(JSON.parse(cEquity).data.holdings || []);
            setLoading(false);
          } catch (e) {
            console.warn(e);
          }
        }
      }

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

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    showToast("Refreshing prices...", "loading");
    try {
      await api.refreshStockPrices();
      showToast("Refresh queued. Updates will appear shortly.", "success");
      // Poll or wait a bit
      setTimeout(() => {
        loadData();
        setIsRefreshing(false);
      }, 4000); // 4s artificial delay for effect/processing
    } catch (err) {
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

  const handleDeleteStock = async (id: number) => {
    if (!confirm("Are you sure you want to delete this stock?")) return;
    try {
      showToast("Deleting stock...", "loading");
      await api.deleteHolding(id);
      await loadData();
      showToast("Stock deleted successfully", "success");
    } catch (err: any) {
      showToast("Failed to delete stock", "error");
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
                onClick={() => setShowAddTx(true)}
                className="px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors">
                <Plus size={16} /> Add Transaction
              </button>
            </div>

            {/* Add Transaction Modal */}
            <AddTransactionModal
              isOpen={showAddTx}
              onClose={() => setShowAddTx(false)}
              onSuccess={() => {
                loadData();
                showToast("Transaction added successfully", "success");
              }}
            />

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
              <Button
                onClick={handleRefreshPrices}
                variant="outline"
                className={`p-2 h-auto ${isRefreshing ? "animate-spin" : ""}`}>
                <RefreshCw size={18} />
              </Button>
              <Button
                onClick={() => setShowStockModal(true)}
                className="gap-2 py-2 px-4 text-sm">
                <Plus size={16} /> Add Transaction
              </Button>
            </div>
          </div>

          {manualStocks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {manualStocks.map((stock, i) => (
                <Card
                  key={i}
                  className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white text-lg">
                        {stock.symbol}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
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
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        <PrivacyMask>
                          ₹{stock.value?.toLocaleString()}
                        </PrivacyMask>
                      </p>
                      {stock.avg_price && (
                        <div className="text-xs text-neutral-500 mt-0.5 space-y-0.5">
                          <p>Avg: ₹{stock.avg_price?.toFixed(2)}</p>
                          <p className="text-[10px] opacity-70">
                            LTP: ₹{stock.current_price?.toFixed(2)} (
                            {stock.last_price_update
                              ? new Date(
                                  stock.last_price_update
                                ).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Live"}
                            )
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Share Button (Visible on Hover/Mobile) */}
                  <div className="absolute top-3 right-3 flex gap-1 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStock({ ...stock });
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-full transition-colors"
                      title="Edit Stock">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStock(stock.id);
                      }}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                      title="Delete Stock">
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShareStock(stock);
                      }}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      title="Share Performance">
                      <Share2 size={20} />
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
            {stockForm.transaction_type === "BUY" ? "Buy Stock" : "Sell Stock"}
          </Button>
        </form>
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
    </div>
  );
}
