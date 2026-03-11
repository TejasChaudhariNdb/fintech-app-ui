"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import AppSkeleton from "@/components/ui/AppSkeleton";
import Button from "@/components/ui/Button";
import {
  ChevronLeft,
  TrendingUp,
  Info,
  MapPin,
  Phone,
  Users,
  CalendarDays,
} from "lucide-react";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = params?.symbol
    ? decodeURIComponent(params.symbol as string)
    : "";
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFundamentals() {
      if (!symbol) return;
      try {
        setLoading(true);
        const res = await api.getStockFundamentals(symbol);
        if (res.error && !res.pe_ratio) {
          setError(res.error);
        } else {
          setData(res);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load stock fundamentals",
        );
      } finally {
        setLoading(false);
      }
    }
    loadFundamentals();
  }, [symbol]);

  if (loading) return <AppSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const formatNumber = (num: number | null | undefined, suffix = "") => {
    if (num === null || num === undefined) return "N/A";
    if (typeof num !== "number") return num;

    // Check if it's a huge number (market cap)
    if (num >= 1e7) {
      if (num >= 1e12) return `₹${(num / 1e12).toFixed(2)} Trillion`;
      if (num >= 1e9) return `₹${(num / 1e9).toFixed(2)} Billion`;
      if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
    }

    return Number.isInteger(num)
      ? num.toString() + suffix
      : num.toFixed(2) + suffix;
  };

  const formatPercent = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    return (num * 100).toFixed(2) + "%";
  };

  return (
    <div className="px-4 pt-6 pb-12 space-y-6 max-w-4xl mx-auto">
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
            Fundamental Analysis
            {data?.recommendation_key && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                {String(data.recommendation_key).replace("_", " ")}
              </span>
            )}
            {data?.current_price && (
              <span className="text-neutral-900 dark:text-white font-bold text-base ml-2">
                ₹{data.current_price.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {data?.current_price && (
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Valuation Card */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <TrendingUp size={20} />
            <h3 className="font-bold text-lg">Valuation</h3>
          </div>

          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">P/E Ratio (TTM)</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.pe_ratio)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Forward P/E</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.forward_pe)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">P/B Ratio</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.price_to_book)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Market Cap</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.market_cap)}
              </p>
            </div>
          </div>
        </Card>

        {/* Profitability Card */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Info size={20} />
            <h3 className="font-bold text-lg">Profitability & Returns</h3>
          </div>

          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">EPS (TTM)</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data.eps)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Forward EPS</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data.forward_eps)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">ROE</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.roe)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">ROE</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.roe)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Operating Margin</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.operating_margins)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Profit Margin</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.profit_margins)}
              </p>
            </div>
          </div>
        </Card>

        {/* Shareholding & Financial Health */}
        <Card className="p-5 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Info size={20} />
            <h3 className="font-bold text-lg">Health & Ownership</h3>
          </div>

          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">FII/Inst. Holding</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.fii_holdings_pct)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Promoter Holding</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.promoter_holdings_pct)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Total Cash</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.total_cash)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Total Debt</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.total_debt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Debt to Equity</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.debt_to_equity)}
              </p>
            </div>
          </div>
        </Card>

        {/* Market & Performance Card */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <TrendingUp size={20} />
            <h3 className="font-bold text-lg">Market Performance</h3>
          </div>

          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">52 Week High</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data["52_week_high"])}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">52 Week Low</p>
              <p className="text-lg font-bold dark:text-white">
                ₹{formatNumber(data["52_week_low"])}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Enterprise Value</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.enterprise_value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">EBITDA</p>
              <p className="text-lg font-bold dark:text-white">
                {formatNumber(data.ebitda)}
              </p>
            </div>
          </div>
        </Card>

        {/* Dividends & Splits Card */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <CalendarDays size={20} />
            <h3 className="font-bold text-lg">Dividends & Splits</h3>
          </div>

          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Dividend Rate</p>
              <p className="text-lg font-bold dark:text-white">
                {data.dividend_rate ? `₹${data.dividend_rate}` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Dividend</p>
              <p className="text-lg font-bold dark:text-white">
                {data.last_dividend_value
                  ? `₹${data.last_dividend_value}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Dividend Yield</p>
              <p className="text-lg font-bold dark:text-white">
                {formatPercent(data.dividend_yield)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-neutral-500 mb-1">Ex-Dividend Date</p>
              <p className="text-sm font-bold dark:text-white">
                {data.ex_dividend_date
                  ? new Date(data.ex_dividend_date * 1000).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Split Factor</p>
              <p className="text-lg font-bold dark:text-white">
                {data.last_split_factor || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Split Date</p>
              <p className="text-sm font-bold dark:text-white">
                {data.last_split_date
                  ? new Date(data.last_split_date * 1000).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Company Overview Section */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Info size={20} />
          <h3 className="font-bold text-lg">Company Profile</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-neutral-100 dark:border-white/5">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Sector</p>
            <p className="font-semibold text-sm dark:text-white">
              {data.sector || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Industry</p>
            <p className="font-semibold text-sm dark:text-white">
              {data.industry || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Employees</p>
            <p className="font-semibold text-sm dark:text-white">
              {formatNumber(data.employees)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Website</p>
            {data.website ? (
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
                {data.address1 ? `${data.address1}, ` : ""}
                {data.city ? `${data.city}, ` : ""}
                {data.zip ? `${data.zip}, ` : ""}
                {data.country || "N/A"}
              </p>
            </div>
            {data.phone && (
              <div className="flex gap-2 text-neutral-600 dark:text-neutral-400">
                <Phone size={18} className="shrink-0" />
                <p className="text-sm">{data.phone}</p>
              </div>
            )}
            {data.description && (
              <div className="pt-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {data.description}
                </p>
              </div>
            )}
          </div>

          {/* Key Executives */}
          {data.officers && data.officers.length > 0 && (
            <div className="w-full md:w-1/3 bg-neutral-50 dark:bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4 text-neutral-800 dark:text-neutral-200">
                <Users size={16} />
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  Key Executives
                </h4>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {data.officers
                  .slice(0, 5)
                  .map(
                    (officer: Record<string, string | number>, idx: number) => (
                      <div key={idx}>
                        <p className="text-sm font-bold dark:text-white line-clamp-1">
                          {officer.name || "N/A"}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                          {officer.title || "Executive"}
                        </p>
                      </div>
                    ),
                  )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-neutral-400 text-center mt-8">
        Data is provided &quot;as is&quot; and fetched from real-time sources.
        Some metrics might not be available for all symbols depending on the
        coverage.
      </p>
    </div>
  );
}
