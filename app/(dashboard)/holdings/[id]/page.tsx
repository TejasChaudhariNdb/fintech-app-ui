"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import TransactionItem from "@/components/features/TransactionItem";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { ArrowLeft, AlertCircle, Share2 } from "lucide-react";
import PrivacyMask from "@/components/ui/PrivacyMask";
import { useHaptic } from "@/lib/hooks/useHaptic";
import Button from "@/components/ui/Button";
import ShareStockModal from "@/components/features/ShareStockModal";
import Toast, { ToastType } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

export default function SchemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const { light } = useHaptic();

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

  const clearSchemeCache = () => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("user_email") || "anonymous";
      localStorage.removeItem(`${email}:scheme-${id}`);
      api.clearPortfolioCache();
    }
  };

  const handleDelete = async (t: any) => {
    if (!confirm(`Are you sure you want to delete this mutual fund transaction?`)) return false;
    
    try {
      showToast("Deleting transaction...", "loading");
      await api.deleteMFTransaction(t.id);
      showToast("Transaction deleted", "success");
      clearSchemeCache();
      loadScheme();
      return true;
    } catch (e) {
      showToast("Failed to delete", "error");
      return false;
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      showToast("Updating...", "loading");
      await api.updateMFTransaction(editingTx.id, {
        date: editingTx.date,
        type: editingTx.type,
        units: Number(editingTx.units),
        amount: Number(editingTx.amount),
        nav: Number(editingTx.price || 0),
      });
      setEditingTx(null);
      clearSchemeCache();
      loadScheme();
      showToast("Updated successfully", "success");
    } catch (e) {
      showToast("Update failed", "error");
    }
  };

  useEffect(() => {
    loadScheme();
  }, [id]);

  const loadScheme = async () => {
    try {
      // 1. Try Cache
      const cacheKey = `scheme-${id}`;
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setScheme(JSON.parse(cached).data);
          setLoading(false);
        }
      }

      const data = await api.getSchemeDetail(Number(id));
      setScheme(data);
    } catch (err) {
      console.error("Error loading scheme:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    light();
    router.back();
  };

  const handleShare = () => {
    light();
    setShowShareModal(true);
  };

  if (loading && !scheme) return <AppSkeleton />;

  if (!scheme && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-12 h-12 text-neutral-400 mb-4" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          Scheme Not Found
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
          The scheme you are looking for does not exist or has been removed.
        </p>
        <Button onClick={handleBack} variant="secondary">
          Go Back
        </Button>
      </div>
    );
  }

  const isPositive = scheme.profit >= 0;
  const avgPrice =
    typeof scheme.avg_price === "number" ? scheme.avg_price : 0;

  const shareData = {
    symbol: scheme.scheme,
    value: scheme.current,
    pnl_pct: scheme.return_pct,
    amc: scheme.amc,
  };

  return (
    <div className="pb-20 min-h-screen bg-neutral-50 dark:bg-[#0B0E14] animate-fade-in text-neutral-900 dark:text-white transition-colors">
      {/* Header */}
      <div className="sticky top-16 z-20 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate pr-2">
                {scheme.scheme}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {scheme.amc}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-2xl mx-auto">
        {/* Unified Hero Card */}
        <div className="bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden transition-all relative group">
          {/* Share Button Inside Card */}
          <button
            onClick={handleShare}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors z-10"
            title="Share Snapshot">
            <Share2 size={18} />
          </button>

          {/* Top Section: Current Value & P/L */}
          <div className="p-6 border-b border-dashed border-neutral-200 dark:border-white/10">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Current Value
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                <PrivacyMask>
                  ₹{scheme.current.toLocaleString("en-IN")}
                </PrivacyMask>
              </h2>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2 ${
                  isPositive
                    ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                }`}>
                <span>
                  {isPositive ? "+" : ""}₹
                  {Math.abs(scheme.profit).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="opacity-40">|</span>
                <span>{scheme.return_pct.toFixed(2)}%</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {scheme.category_label ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  {scheme.category_label}
                </span>
              ) : null}
              {scheme.overall_rank ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Portfolio Rank #{scheme.overall_rank}/{scheme.total_holdings}
                </span>
              ) : null}
              {scheme.category_rank ? (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-white/8 dark:text-neutral-300">
                  Category Rank #{scheme.category_rank}/{scheme.category_total}
                </span>
              ) : null}
            </div>
          </div>

          {/* Bottom Section: Grid Stats */}
          <div className="grid grid-cols-2 gap-y-4 p-4 bg-neutral-50/50 dark:bg-white/5 sm:grid-cols-6 sm:gap-y-0 sm:divide-x sm:divide-neutral-200 sm:dark:divide-white/5">
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                Invested
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>
                  ₹{scheme.invested.toLocaleString("en-IN")}
                </PrivacyMask>
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                NAV
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                ₹{scheme.nav.toFixed(2)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {new Date(scheme.nav_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                Avg Price
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                ₹{avgPrice.toFixed(2)}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                Units
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {scheme.units.toFixed(2)}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                XIRR
              </p>
              <p className={`text-sm font-bold ${
                scheme.xirr !== null && scheme.xirr !== undefined
                  ? scheme.xirr >= 0
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                  : "text-neutral-900 dark:text-white"
              }`}>
                {scheme.xirr !== null && scheme.xirr !== undefined
                  ? `${scheme.xirr.toFixed(2)}%`
                  : "NA"}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                Daily Change
              </p>
              <p
                className={`text-sm font-bold ${
                  (scheme.day_change || 0) >= 0
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}>
                {(scheme.day_change || 0) >= 0 ? "+" : ""}₹
                {Math.abs(scheme.day_change || 0).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {scheme.day_change_pct?.toFixed(2) || "0.00"}%
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div>
          <h3 className="text-lg font-bold mb-4 px-1 flex items-center gap-2">
            history
            <span className="text-xs font-normal text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              {scheme.transactions?.length || 0} Transactions
            </span>
          </h3>

          <div className="space-y-3">
            {scheme.transactions && scheme.transactions.length > 0 ? (
              scheme.transactions.map((tx: any, i: number) => (
                <TransactionItem
                  key={tx.id || i}
                  id={tx.id}
                  date={tx.date}
                  type={tx.type}
                  amount={tx.amount}
                  units={tx.units}
                  schemeName={scheme.scheme}
                  amc={scheme.amc}
                  onEdit={tx.id ? () => {
                    setEditingTx({
                      ...tx,
                      price: tx.price || (tx.units ? tx.amount / tx.units : 0),
                    });
                  } : undefined}
                  onDelete={tx.id ? () => handleDelete(tx) : undefined}
                />
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-white/5 rounded-2xl">
                <p className="text-neutral-500 dark:text-neutral-400">
                  No transaction history found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareStockModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        stock={shareData}
      />

      {/* Toast Notification */}
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Edit Mutual Fund Transaction"
      >
        {editingTx && (
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
                 <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() =>
                        setEditingTx({ ...editingTx, type: "PURCHASE" })
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        (editingTx.type === "PURCHASE" || editingTx.type === "BUY" || editingTx.type === "PURCHASE_SIP")
                            ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                            : "text-neutral-600 dark:text-neutral-300"
                        }`}>
                        Buy
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                        setEditingTx({ ...editingTx, type: "REDEMPTION" })
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        (editingTx.type === "REDEMPTION" || editingTx.type === "SELL")
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
                <Input
                    label="Total Amount"
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) =>
                        setEditingTx({ ...editingTx, amount: e.target.value })
                    }
                    required
                />
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
