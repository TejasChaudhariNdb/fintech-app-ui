"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import PrivacyMask from "@/components/ui/PrivacyMask";
import ShareStockModal from "@/components/features/ShareStockModal";
import {
  FileSpreadsheet,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  TrendingUp,
  Upload,
  FileUp,
  Share2,
  Download,
} from "lucide-react";

import PortfolioAnalysisCard from "@/components/features/PortfolioAnalysisCard";

export default function StocksPage() {
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
  const [manualStocks, setManualStocks] = useState<any[]>([]);

  // Stock Modal State (Add/Import)
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({
    symbol: "",
    quantity: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
    transaction_type: "BUY" as "BUY" | "SELL",
  });
  const [stockModalTab, setStockModalTab] = useState<"MANUAL" | "IMPORT">(
    "MANUAL",
  );

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [broker, setBroker] = useState("ZERODHA");

  // Search State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isValidSymbol, setIsValidSymbol] = useState(false);

  // Share Modal State
  const [selectedShareStock, setSelectedShareStock] = useState<any>(null);

  // Edit Stock State
  const [editingStock, setEditingStock] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const stocksRes = await api.getEquitySummary();
      // stocksRes is { total_value: ..., holdings: [...] }
      setManualStocks(stocksRes.holdings || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load stocks", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Search Stocks
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
        showToast("Please select a valid stock from search", "error");
        return;
      }
      await api.addStockTransaction({
        symbol: stockForm.symbol,
        quantity: Number(stockForm.quantity),
        price: Number(stockForm.price),
        date: stockForm.date,
        transaction_type: stockForm.transaction_type,
      });
      showToast("Transaction added successfully", "success");
      setShowStockModal(false);
      setStockForm({
        symbol: "",
        quantity: "",
        price: "",
        date: new Date().toISOString().split("T")[0],
        transaction_type: "BUY",
      });
      setIsValidSymbol(false);
      await loadData();
    } catch (err) {
      showToast("Failed to add transaction", "error");
    }
  };

  const handleImportStocks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast("Please select a file", "error");
      return;
    }
    setIsImporting(true);
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

  if (isLoading) {
    return <AppSkeleton />;
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Manual Stocks Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            My Stocks
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Value:{" "}
            <PrivacyMask>₹{stockStats.current.toLocaleString()}</PrivacyMask>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              showToast("Refreshing prices...", "loading");
              try {
                await api.refreshStockPrices();
                await new Promise((r) => setTimeout(r, 2000)); // Wait for background task
                await loadData();
                showToast("Prices refreshed", "success");
              } catch (e) {
                showToast("Refresh failed", "error");
              }
            }}
            className="p-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors aspect-square flex items-center justify-center"
            title="Refresh Prices">
            <Loader2 size={20} className={isLoading ? "animate-spin" : ""} />
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
          <button
            onClick={() => {
              setShowStockModal(true);
              setStockModalTab("MANUAL");
            }}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors">
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {manualStocks.length > 0 && (
        <div className="space-y-6 mb-8">
          {/* New Portfolio Analysis */}
          <PortfolioAnalysisCard />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="text-sm text-neutral-500 mb-1">Total Investment</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>
                  ₹
                  {stockStats.invested.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </PrivacyMask>
              </p>
            </Card>
            <Card className="col-span-1 md:col-span-2 p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">
                  Total Profit/Loss
                </p>
                <div
                  className={`flex items-baseline gap-2 ${
                    stockStats.pnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}>
                  <p className="text-2xl font-bold">
                    <PrivacyMask>
                      {stockStats.pnl >= 0 ? "+" : ""}₹
                      {Math.abs(stockStats.pnl).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </PrivacyMask>
                  </p>
                  <p className="text-sm font-medium">
                    ({stockStats.pnl >= 0 ? "+" : ""}
                    {stockStats.pnlPct.toFixed(2)}%)
                  </p>
                </div>
              </div>
              <div
                className={`p-3 rounded-full ${
                  stockStats.pnl >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                }`}>
                <TrendingUp
                  size={24}
                  className={
                    stockStats.pnl >= 0 ? "text-green-500" : "text-red-500"
                  }
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Stock List */}
      <div className="grid gap-4">
        {manualStocks.map((stock, idx) => (
          <Card
            key={idx}
            className="p-5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 flex flex-col gap-4 group hover:border-primary-500/20 transition-all">
            {/* Top Section: Header & Value */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                    {stock.symbol}
                  </h3>
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide truncate max-w-[150px] hidden sm:inline-block">
                    {stock.company_name}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {stock.company_name !== stock.symbol
                    ? stock.company_name
                    : "Equity Share"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-neutral-900 dark:text-white leading-none mb-1">
                  <PrivacyMask>
                    {stock.value > 0 ? (
                      `₹${Math.round(stock.value).toLocaleString()}`
                    ) : stock.quantity > 0 ? (
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      "₹0"
                    )}
                  </PrivacyMask>
                </div>
                <div className="text-xs text-neutral-500 font-medium">
                  Avg: ₹{stock.avg_price?.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Middle Section: Stats & Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {stock.sector && (
                  <span className="px-2 py-1 rounded bg-neutral-100 dark:bg-white/10 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-white/5">
                    {stock.sector}
                  </span>
                )}
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {stock.quantity} shares
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    (stock.pnl || 0) >= 0
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}>
                  {(stock.pnl || 0) >= 0 ? "+" : ""}
                  {stock.pnl_pct?.toFixed(2)}%
                </span>
              </div>

              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                LTP:{" "}
                <span className="text-neutral-900 dark:text-white">
                  {stock.current_price > 0 ? (
                    `₹${stock.current_price}`
                  ) : (
                    <span className="text-xs text-neutral-400">
                      Fetching...
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Footer: Actions */}
            <div className="pt-3 border-t border-neutral-100 dark:border-white/5 flex justify-end gap-5 opacity-80 hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setEditingStock({ ...stock });
                  setIsEditModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-500 transition-colors">
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => handleDeleteStock(stock.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-red-500 transition-colors">
                <Trash2 size={14} /> Delete
              </button>
              <button
                onClick={() => setSelectedShareStock(stock)}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <Share2 size={14} /> Share
              </button>
            </div>
          </Card>
        ))}
        {manualStocks.length === 0 && !isLoading && (
          <div className="text-center py-10 text-neutral-500 space-y-4">
            <p>No stocks added yet.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  setShowStockModal(true);
                  setStockModalTab("MANUAL");
                }}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first stock
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStockModal(true);
                  setStockModalTab("IMPORT");
                }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Upload Stock Excel Sheet
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Stock/Import Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title={
          stockModalTab === "MANUAL" ? "Add Stock Transaction" : "Import Stocks"
        }>
        <div className="flex border-b border-neutral-200 dark:border-white/10 mb-6">
          <button
            onClick={() => setStockModalTab("MANUAL")}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              stockModalTab === "MANUAL"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}>
            Manual Entry
          </button>
          <button
            onClick={() => setStockModalTab("IMPORT")}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              stockModalTab === "IMPORT"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}>
            Import File
          </button>
        </div>

        {stockModalTab === "MANUAL" ? (
          <form onSubmit={handleAddStock} className="space-y-4">
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
                  <Loader2
                    size={16}
                    className="animate-spin text-neutral-400"
                  />
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
                      <span className="text-xs font-mono bg-neutral-100 dark:bg-white/10 px-2 py-1 rounded text-neutral-600 dark:text-neutral-300">
                        NSE
                      </span>
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
                label="Buy Price"
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
              max={new Date().toISOString().split("T")[0]}
              required
            />
            <Button type="submit" className="w-full">
              Add Transaction
            </Button>
          </form>
        ) : (
          <form onSubmit={handleImportStocks} className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-200 leading-relaxed flex justify-between items-center">
              <div>
                <p className="font-semibold mb-1">Upload Instructions:</p>
                <p>
                  Supports <b>holdings</b> (Current Snapshot) CSV from
                  Zerodha/Kite.
                </p>
              </div>
              <a
                href="/assets/stock_upload_sheet.csv"
                download="stock_upload_sheet.csv"
                className="flex items-center gap-1 text-xs font-semibold bg-white dark:bg-white/10 border border-blue-200 dark:border-blue-500/30 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-colors shrink-0">
                <Download size={14} />
                Sample CSV
              </a>
            </div>

            <div className="border-2 border-dashed border-neutral-300 dark:border-white/20 rounded-xl p-8 flex flex-col items-center justify-center bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {importFile ? (
                <div className="text-center">
                  <FileSpreadsheet className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {importFile.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                  <p className="font-medium text-neutral-900 dark:text-white">
                    Click to upload CSV
                  </p>
                  <p className="text-xs text-neutral-500">
                    or drag and drop here
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Stocks"
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
    </div>
  );
}
