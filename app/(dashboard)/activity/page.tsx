"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import AppSkeleton from "@/components/ui/AppSkeleton";
import Toast, { ToastType } from "@/components/ui/Toast";
import TransactionItem from "@/components/features/TransactionItem";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import AddTransactionModal from "@/components/features/AddTransactionModal";
import { Search, Calendar, Filter, Download, Plus, Trash2 } from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, BUY, SELL, SIP, DIVIDEND
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // ALL, MF, STOCK
  const { light } = useHaptic();

  // Modal States
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  
  // Stock Form State (Simplified for Activity Page if needed, or reuse StocksPage logic)
  const [stockForm, setStockForm] = useState({
    symbol: "",
    quantity: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
    transaction_type: "BUY" as "BUY" | "SELL",
  });
  const [isValidSymbol, setIsValidSymbol] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Edit State
  const [editingTx, setEditingTx] = useState<any>(null);

  // Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: ToastType;
  }>({ show: false, message: "", type: "info" });

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  };

  const LIMIT = 20;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    light();
    showToast("Preparing CSV export...", "loading");
    try {
      await api.exportTransactions();
      showToast("Download started", "success");
    } catch (e) {
      console.error(e);
      showToast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const loadTransactions = async (skip: number, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await api.getTransactions(skip, LIMIT);
      const newTransactions = data.data || [];

      if (isLoadMore) {
        setTransactions((prev) => [...prev, ...newTransactions]);
      } else {
        setTransactions(newTransactions);
      }

      setHasMore(newTransactions.length === LIMIT);
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadTransactions(0);
  }, []); // Initial load

  const handleLoadMore = () => {
    light();
    const nextPage = page + 1;
    setPage(nextPage);
    loadTransactions(nextPage * LIMIT, true);
  };

  const handleDelete = async (t: any) => {
    if (!confirm(`Are you sure you want to delete this ${t.category === "STOCK" ? "stock" : "mutual fund"} transaction?`)) return false;
    
    try {
      showToast("Deleting transaction...", "loading");
      if (t.category === "STOCK") {
        await api.deleteStockTransaction(t.id);
      } else {
        await api.deleteMFTransaction(t.id);
      }
      showToast("Transaction deleted", "success");
      loadTransactions(0);
      return true;
    } catch (e) {
      showToast("Failed to delete", "error");
      return false;
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.scheme_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.amc || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || t.category === categoryFilter;

    if (!matchesCategory) return false;

    if (filterType === "ALL") return matchesSearch;

    const typeUpper = (t.type || "").toUpperCase();
    if (filterType === "BUY")
      return (
        matchesSearch &&
        (typeUpper.includes("PURCHASE") || typeUpper.includes("SIP") || typeUpper === "BUY")
      );
    if (filterType === "SELL")
      return matchesSearch && (typeUpper.includes("REDEMPTION") || typeUpper === "SELL");
    if (filterType === "SIP") return matchesSearch && typeUpper.includes("SIP");
    if (filterType === "TAX")
      return (
        matchesSearch &&
        (typeUpper.includes("TAX") || typeUpper.includes("STAMP"))
      );

    return matchesSearch && typeUpper.includes(filterType);
  });

  // Group by Month
  const groupedTransactions = filteredTransactions.reduce(
    (groups: any, transaction) => {
      const date = new Date(transaction.date);
      const monthYear = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(transaction);
      return groups;
    },
    {}
  );

  // Stock Search Logic (Reused from StocksPage)
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
        setShowSearchResults(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [stockForm.symbol, isValidSymbol]);

  const selectStock = (symbol: string) => {
    setStockForm({ ...stockForm, symbol: symbol });
    setIsValidSymbol(true);
    setShowSearchResults(false);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isValidSymbol) {
        showToast("Please select a valid stock", "error");
        return;
      }
      await api.addStockTransaction({
        symbol: stockForm.symbol,
        quantity: Number(stockForm.quantity),
        price: Number(stockForm.price),
        date: stockForm.date,
        transaction_type: stockForm.transaction_type,
      });
      showToast("Stock transaction added", "success");
      setShowAddStock(false);
      loadTransactions(0);
    } catch (err) {
      showToast("Failed to add stock transaction", "error");
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      showToast("Updating...", "loading");
      if (editingTx.category === "STOCK") {
        await api.updateStockTransaction(editingTx.id, {
          quantity: Number(editingTx.units),
          price: Number(editingTx.price),
          date: editingTx.date,
          transaction_type: editingTx.type,
        });
      } else {
        await api.updateMFTransaction(editingTx.id, {
          date: editingTx.date,
          type: editingTx.type,
          units: Number(editingTx.units),
          amount: Number(editingTx.amount),
          nav: Number(editingTx.price || 0), // Use price as NAV if available
        });
      }
      setEditingTx(null);
      loadTransactions(0);
      showToast("Updated successfully", "success");
    } catch (e) {
      showToast("Update failed", "error");
    }
  };

  if (loading && transactions.length === 0) return <AppSkeleton />;

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Toast Notification */}
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* Header */}
      <div className="bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5 p-4 sticky top-0 z-20 transition-colors flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track your financial history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 dark:text-neutral-400 transition-colors ${
              exporting ? "opacity-50 cursor-not-allowed" : ""
            }`}>
            <Download size={20} className={exporting ? "animate-bounce" : ""} />
          </button>
          <div className="relative group">
            <button
              className="p-2 bg-primary-600 text-white rounded-full shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all"
              onClick={() => setShowAddTx(true)}>
              <Plus size={20} />
            </button>
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50">
                <div className="bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                    <button 
                        onClick={() => setShowAddTx(true)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-white/5 border-b border-neutral-100 dark:border-white/5 font-medium">
                        Buy/Sell Mutual Fund
                    </button>
                    <button 
                        onClick={() => {
                            setStockForm({
                                symbol: "",
                                quantity: "",
                                price: "",
                                date: new Date().toISOString().split("T")[0],
                                transaction_type: "BUY",
                            });
                            setIsValidSymbol(false);
                            setShowAddStock(true);
                        }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-white/5 font-medium">
                        Buy/Sell Stock
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
            />
          </div>

          <div className="flex flex-col gap-3">
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["ALL", "MF", "STOCK"].map((cat) => (
                <button
                    key={cat}
                    onClick={() => {
                    light();
                    setCategoryFilter(cat);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                    categoryFilter === cat
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                        : "bg-white dark:bg-white/5 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-white/10"
                    }`}>
                    {cat === "ALL" ? "All Assets" : cat === "MF" ? "Mutual Funds" : "Stocks"}
                </button>
                ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {["ALL", "BUY", "SELL", "SIP", "TAX"].map((type) => (
                <button
                    key={type}
                    onClick={() => {
                    light();
                    setFilterType(type);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border ${
                    filterType === type
                        ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20"
                        : "bg-white dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-white/10"
                    }`}>
                    {type === "ALL" ? "All Transactions" : type}
                </button>
                ))}
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-8">
          {Object.keys(groupedTransactions).length > 0 ? (
            Object.keys(groupedTransactions).map((month) => (
              <div key={month}>
                <h3 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-4 flex items-center gap-2">
                  <Calendar size={14} />
                  {month}
                </h3>
                <div className="space-y-3">
                  {groupedTransactions[month].map((t: any, idx: number) => (
                    <TransactionItem
                      key={`${t.date}-${t.id}-${t.category}`}
                      id={t.id}
                      type={t.type}
                      schemeName={t.scheme_name}
                      amc={t.amc}
                      amount={t.amount}
                      date={t.date}
                      units={t.units}
                      category={t.category}
                      onEdit={() => {
                        setEditingTx(t);
                      }}
                      onDelete={() => handleDelete(t)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex p-4 rounded-full bg-neutral-100 dark:bg-white/5 mb-4">
                <Filter className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                No transactions found
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-4 pb-8">
              <Button
                onClick={handleLoadMore}
                variant="ghost"
                isLoading={loadingMore}
                className="w-full py-4 text-primary-600 dark:text-primary-400 font-medium hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors flex justify-center items-center">
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add MF Modal */}
      <AddTransactionModal 
        isOpen={showAddTx}
        onClose={() => setShowAddTx(false)}
        onSuccess={() => {
            loadTransactions(0);
            showToast("MF transaction added", "success");
        }}
      />

      {/* Add Stock Modal */}
      <Modal 
        isOpen={showAddStock}
        onClose={() => setShowAddStock(false)}
        title="Add Stock Transaction"
      >
        <form onSubmit={handleAddStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setStockForm({ ...stockForm, transaction_type: "BUY" })
                }
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  stockForm.transaction_type === "BUY"
                    ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}>
                Buy
              </button>
              <button
                type="button"
                onClick={() =>
                  setStockForm({ ...stockForm, transaction_type: "SELL" })
                }
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  stockForm.transaction_type === "SELL"
                    ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}>
                Sell
              </button>
            </div>

            <div className="relative">
              <Input
                label="Stock Symbol"
                value={stockForm.symbol}
                onChange={(e) => {
                  setStockForm({
                    ...stockForm,
                    symbol: e.target.value.toUpperCase(),
                  });
                  setIsValidSymbol(false);
                }}
                placeholder="search (e.g. RELIANCE)"
                required
              />
              {isSearching && (
                <div className="absolute right-3 top-[38px]">
                  <Plus size={16} className="animate-spin text-neutral-400" />
                </div>
              )}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      type="button"
                      onClick={() => selectStock(result.symbol)}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 border-b border-neutral-100 dark:border-white/5 last:border-0 flex justify-between items-center group">
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {result.symbol}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                          {result.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                value={stockForm.quantity}
                onChange={(e) =>
                  setStockForm({ ...stockForm, quantity: e.target.value })
                }
                required
              />
              <Input
                label="Price"
                type="number"
                value={stockForm.price}
                onChange={(e) =>
                  setStockForm({ ...stockForm, price: e.target.value })
                }
                required
              />
            </div>
            <Input
              label="Date"
              type="date"
              value={stockForm.date}
              onChange={(e) =>
                setStockForm({ ...stockForm, date: e.target.value })
              }
              required
            />
            <Button type="submit" className="w-full py-4">Add Stock Transaction</Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title={`Edit ${editingTx?.category === "STOCK" ? "Stock" : "Mutual Fund"} Transaction`}
      >
        {editingTx && (
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
                 <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() =>
                        setEditingTx({ ...editingTx, type: editingTx.category === "STOCK" ? "BUY" : "PURCHASE" })
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        (editingTx.type === "BUY" || editingTx.type === "PURCHASE")
                            ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                            : "text-neutral-600 dark:text-neutral-300"
                        }`}>
                        Buy
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                        setEditingTx({ ...editingTx, type: editingTx.category === "STOCK" ? "SELL" : "REDEMPTION" })
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        (editingTx.type === "SELL" || editingTx.type === "REDEMPTION")
                            ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                            : "text-neutral-600 dark:text-neutral-300"
                        }`}>
                        Sell
                    </button>
                </div>
                <Input
                    label="Name / Symbol"
                    value={editingTx.scheme_name}
                    disabled
                    className="opacity-50"
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Quantity / Units"
                        type="number"
                        value={editingTx.units}
                        onChange={(e) =>
                        setEditingTx({ ...editingTx, units: e.target.value })
                        }
                        required
                    />
                    <Input
                        label="Price / NAV"
                        type="number"
                        value={editingTx.price || ""}
                        onChange={(e) =>
                        setEditingTx({ ...editingTx, price: e.target.value })
                        }
                        required
                    />
                </div>
                {editingTx.category === "MF" && (
                    <Input
                        label="Total Amount"
                        type="number"
                        value={editingTx.amount}
                        onChange={(e) =>
                            setEditingTx({ ...editingTx, amount: e.target.value })
                        }
                        required
                    />
                )}
                <Input
                    label="Date"
                    type="date"
                    value={editingTx.date}
                    onChange={(e) =>
                        setEditingTx({ ...editingTx, date: e.target.value })
                    }
                    required
                />
                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      const deleted = await handleDelete(editingTx);
                      if (deleted) setEditingTx(null);
                    }}
                    className="flex-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-500/10 font-semibold">
                    Delete
                  </Button>
                  <Button type="submit" className="flex-[2]">
                    Update Transaction
                  </Button>
                </div>
            </form>
        )}
      </Modal>
    </div>
  );
}

