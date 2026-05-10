"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import {
  CalendarDays,
  ChevronLeft,
  Info,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

type StockHolding = {
  id: number;
  symbol: string;
  quantity: number;
  value: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  xirr?: number | null;
};

type StockTransaction = {
  id: number;
  symbol: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  date: string;
  amount: number;
};

type StockFundamentals = {
  symbol: string;
  recommendation_key?: string | null;
  current_price?: number | null;
  previous_close?: number | null;
  open?: number | null;
  target_mean_price?: number | null;
  day_high?: number | null;
  day_low?: number | null;
  pe_ratio?: number | null;
  forward_pe?: number | null;
  price_to_book?: number | null;
  market_cap?: number | null;
  eps?: number | null;
  forward_eps?: number | null;
  roe?: number | null;
  fii_holdings_pct?: number | null;
  promoter_holdings_pct?: number | null;
  total_cash?: number | null;
  total_debt?: number | null;
  debt_to_equity?: number | null;
  "52_week_high"?: number | null;
  "52_week_low"?: number | null;
  enterprise_value?: number | null;
  ebitda?: number | null;
  dividend_rate?: number | null;
  last_dividend_value?: number | null;
  dividend_yield?: number | null;
  ex_dividend_date?: number | null;
  last_split_factor?: string | null;
  last_split_date?: number | null;
  sector?: string | null;
  industry?: string | null;
  employees?: number | null;
  website?: string | null;
  address1?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
  description?: string | null;
  officers?: Array<Record<string, string | number>>;
  operating_margins?: number | null;
  profit_margins?: number | null;
  error?: string | null;
};

type EditableTransaction = {
  id: number;
  transaction_type: "BUY" | "SELL";
  quantity: string;
  price: string;
  date: string;
};

export default function StockDetailPage() {
  const params = useParams();
  const symbol = params?.symbol
    ? decodeURIComponent(params.symbol as string)
    : "";
  const router = useRouter();
  const [data, setData] = useState<StockFundamentals | null>(null);
  const [holding, setHolding] = useState<StockHolding | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
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

  const loadPageData = async () => {
    if (!symbol) return;
    try {
      setLoading(true);
      const [fundRes, summaryRes, txRes] = await Promise.all([
        api.getStockFundamentals(symbol),
        api.getEquitySummary(),
        api.getStockTransactions(symbol),
      ]);

      if (fundRes.error && !fundRes.pe_ratio) {
        setError(fundRes.error);
      } else {
        setData(fundRes);
      }

      const currentHolding =
        (summaryRes.holdings || []).find(
          (item: { symbol?: string }) => item.symbol === symbol,
        ) || null;
      setHolding(currentHolding);
      setTransactions(txRes || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stock details",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
    // loadPageData depends only on current route symbol in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const formatNumber = (num: number | null | undefined, suffix = "") => {
    if (num === null || num === undefined) return "N/A";
    if (num >= 1e7) {
      if (num >= 1e12) return `₹${(num / 1e12).toFixed(2)} Trillion`;
      if (num >= 1e9) return `₹${(num / 1e9).toFixed(2)} Billion`;
      return `₹${(num / 1e7).toFixed(2)} Cr`;
    }
    return Number.isInteger(num) ? `${num}${suffix}` : `${num.toFixed(2)}${suffix}`;
  };

  const formatPercent = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    return `${(num * 100).toFixed(2)}%`;
  };

  const handleTransactionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      showToast("Updating transaction...", "loading");
      await api.updateStockTransaction(editingTx.id, {
        quantity: Number(editingTx.quantity),
        price: Number(editingTx.price),
        date: editingTx.date,
        transaction_type: editingTx.transaction_type,
      });
      setEditingTx(null);
      await loadPageData();
      showToast("Transaction updated", "success");
    } catch {
      showToast("Failed to update transaction", "error");
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      showToast("Deleting transaction...", "loading");
      await api.deleteStockTransaction(transactionId);
      await loadPageData();
      showToast("Transaction deleted", "success");
    } catch {
      showToast("Failed to delete transaction", "error");
    }
  };

  if (loading) return <AppSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-12 space-y-6 max-w-4xl mx-auto">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft
            size={24}
            className="text-neutral-700 dark:text-neutral-300"
          />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            {symbol}
          </h1>
          <p className="text-sm text-neutral-500 font-medium flex items-center gap-2 mt-1">
            Fundamentals and transaction ledger
            {data?.recommendation_key ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                {String(data.recommendation_key).replace("_", " ")}
              </span>
            ) : null}
            {data?.current_price ? (
              <span className="text-neutral-900 dark:text-white font-bold text-base ml-2">
                ₹{data.current_price.toLocaleString()}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {holding ? (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Your Holding
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Recalculated from your stock ledger
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                (holding.pnl_pct || 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
              }`}>
              {(holding.pnl_pct || 0) >= 0 ? "+" : ""}
              {(holding.pnl_pct || 0).toFixed(2)}%
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Quantity</p>
              <p className="font-bold dark:text-white">{holding.quantity}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Avg Price</p>
              <p className="font-bold dark:text-white">
                ₹{holding.avg_price.toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Current Value</p>
              <p className="font-bold dark:text-white">
                ₹{Math.round(holding.value || 0).toLocaleString("en-IN")}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">P&amp;L</p>
              <p
                className={`font-bold ${
                  (holding.pnl || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                }`}>
                {(holding.pnl || 0) >= 0 ? "+" : ""}₹
                {Math.round(Math.abs(holding.pnl || 0)).toLocaleString("en-IN")}
              </p>
            </Card>
          </div>
        </Card>
      ) : null}

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Transaction Ledger
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Edit or delete individual stock entries.
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
            {transactions.length} entries
          </span>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tx.transaction_type === "BUY"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        }`}>
                        {tx.transaction_type === "BUY" ? (
                          <TrendingUp size={12} />
                        ) : (
                          <TrendingDown size={12} />
                        )}
                        {tx.transaction_type}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {new Date(tx.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Quantity</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {tx.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Price</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          ₹{tx.price}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Amount</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          ₹{Math.round(tx.amount || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setEditingTx({
                          id: tx.id,
                          transaction_type: tx.transaction_type,
                          quantity: String(tx.quantity),
                          price: String(tx.price),
                          date: tx.date,
                        })
                      }
                      className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-primary-600 dark:hover:bg-white/10 dark:hover:text-primary-400">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No stock transactions found for this symbol.
          </div>
        )}
      </Card>

      {data?.current_price ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col justify-center">
            <p className="text-xs text-neutral-500 mb-1">Previous Close</p>
            <p className="font-bold dark:text-white">
              {data.previous_close ? `₹${data.previous_close}` : "N/A"}
            </p>
          </Card>
          <Card className="p-4 flex flex-col justify-center">
            <p className="text-xs text-neutral-500 mb-1">Open</p>
            <p className="font-bold dark:text-white">
              {data.open ? `₹${data.open}` : "N/A"}
            </p>
          </Card>
          <Card className="p-4 flex flex-col justify-center">
            <p className="text-xs text-neutral-500 mb-1">Target Mean Price</p>
            <p className="font-bold dark:text-white">
              {data.target_mean_price ? `₹${data.target_mean_price}` : "N/A"}
            </p>
          </Card>
          <Card className="p-4 flex flex-col justify-center">
            <p className="text-xs text-neutral-500 mb-1">Day High / Day Low</p>
            <p className="font-bold dark:text-white">
              {data.day_high ? `₹${data.day_high}` : "N/A"} /{" "}
              {data.day_low ? `₹${data.day_low}` : "N/A"}
            </p>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <TrendingUp size={20} />
            <h3 className="font-bold text-lg">Valuation</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">P/E Ratio (TTM)</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.pe_ratio)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Forward P/E</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.forward_pe)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">P/B Ratio</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.price_to_book)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Market Cap</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.market_cap)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Info size={20} />
            <h3 className="font-bold text-lg">Profitability & Returns</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">EPS (TTM)</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data?.eps)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Forward EPS</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data?.forward_eps)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">ROE</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data?.roe)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Operating Margin</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data?.operating_margins)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Profit Margin</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data?.profit_margins)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Info size={20} />
            <h3 className="font-bold text-lg">Health & Ownership</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">FII/Inst. Holding</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data?.fii_holdings_pct)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Promoter Holding</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data?.promoter_holdings_pct)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Total Cash</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.total_cash)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Total Debt</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.total_debt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Debt to Equity</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.debt_to_equity)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <TrendingUp size={20} />
            <h3 className="font-bold text-lg">Market Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">52 Week High</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data?.["52_week_high"])}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">52 Week Low</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data?.["52_week_low"])}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Enterprise Value</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.enterprise_value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">EBITDA</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data?.ebitda)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <CalendarDays size={20} />
            <h3 className="font-bold text-lg">Dividends & Splits</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Dividend Rate</p>
              <p className="text-lg font-bold dark:text-white">
                {data?.dividend_rate ? `₹${data.dividend_rate}` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Dividend</p>
              <p className="text-lg font-bold dark:text-white">
                {data?.last_dividend_value ? `₹${data.last_dividend_value}` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Dividend Yield</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data?.dividend_yield)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-neutral-500 mb-1">Ex-Dividend Date</p>
              <p className="text-sm font-bold dark:text-white">
                {data?.ex_dividend_date
                  ? new Date(data.ex_dividend_date * 1000).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Split Factor</p>
              <p className="text-lg font-bold dark:text-white">
                {data?.last_split_factor || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Split Date</p>
              <p className="text-sm font-bold dark:text-white">
                {data?.last_split_date
                  ? new Date(data.last_split_date * 1000).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Info size={20} />
          <h3 className="font-bold text-lg">Company Profile</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-neutral-100 dark:border-white/5">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Sector</p>
            <p className="font-semibold text-sm dark:text-white">
              {data?.sector || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Industry</p>
            <p className="font-semibold text-sm dark:text-white">
              {data?.industry || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Employees</p>
            <p className="font-semibold text-sm dark:text-white">
              {formatNumber(data?.employees)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Website</p>
            {data?.website ? (
              <a
                href={data.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-semibold truncate block">
                {data.website
                  .replace("https://www.", "")
                  .replace("http://www.", "")
                  .replace("https://", "")}
              </a>
            ) : (
              <p className="font-semibold text-sm dark:text-white">N/A</p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex gap-2 text-neutral-600 dark:text-neutral-400">
              <MapPin size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">
                {data?.address1 ? `${data.address1}, ` : ""}
                {data?.city ? `${data.city}, ` : ""}
                {data?.zip ? `${data.zip}, ` : ""}
                {data?.country || "N/A"}
              </p>
            </div>
            {data?.phone ? (
              <div className="flex gap-2 text-neutral-600 dark:text-neutral-400">
                <Phone size={18} className="shrink-0" />
                <p className="text-sm">{data.phone}</p>
              </div>
            ) : null}
            {data?.description ? (
              <div className="pt-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {data.description}
                </p>
              </div>
            ) : null}
          </div>

          {data?.officers && data.officers.length > 0 ? (
            <div className="w-full md:w-1/3 bg-neutral-50 dark:bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4 text-neutral-800 dark:text-neutral-200">
                <Users size={16} />
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  Key Executives
                </h4>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {data.officers.slice(0, 5).map((officer, idx) => (
                  <div key={idx}>
                    <p className="text-sm font-bold dark:text-white line-clamp-1">
                      {String(officer.name || "N/A")}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                      {String(officer.title || "Executive")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <p className="text-xs text-neutral-400 text-center mt-8">
        Data is provided &quot;as is&quot; and fetched from real-time sources.
        Some metrics might not be available for all symbols depending on coverage.
      </p>

      <Modal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Edit Stock Transaction">
        {editingTx ? (
          <form onSubmit={handleTransactionSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setEditingTx({ ...editingTx, transaction_type: "BUY" })
                }
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  editingTx.transaction_type === "BUY"
                    ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}>
                Buy
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingTx({ ...editingTx, transaction_type: "SELL" })
                }
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  editingTx.transaction_type === "SELL"
                    ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}>
                Sell
              </button>
            </div>

            <Input
              label="Quantity"
              type="number"
              value={editingTx.quantity}
              onChange={(e) =>
                setEditingTx({ ...editingTx, quantity: e.target.value })
              }
              required
            />
            <Input
              label="Price"
              type="number"
              value={editingTx.price}
              onChange={(e) =>
                setEditingTx({ ...editingTx, price: e.target.value })
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

            <Button type="submit" className="w-full">
              Save Transaction
            </Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
