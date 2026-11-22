"use client";
// BUG-099: a holding whose symbol gets no live price (broker short code like CROGRE). The user picks
// the real NSE/BSE stock, sees the new price and value, and confirms. Trades and cost do not change.
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";

interface Props {
  stock: { id: number; symbol: string; quantity: number; current_price: number; company_name?: string } | null;
  onClose: () => void;
  onFixed: (symbol: string) => void;
}

type Result = { symbol: string; name?: string; exchange?: string; is_indian?: boolean };
type Preview = { symbol: string; price: number; quantity: number; value: number; merges_with_existing: boolean };

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function FixStockSymbolModal({ stock, onClose, onFixed }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(stock?.company_name && stock.company_name !== stock.symbol ? stock.company_name : "");
    setResults([]);
    setPicked(null);
    setPreview(null);
    setError(null);
  }, [stock]);

  useEffect(() => {
    if (!stock || query.trim().length < 2 || picked) return;
    const t = setTimeout(async () => {
      try {
        const r: Result[] = await api.searchStocks(encodeURIComponent(query.trim()));
        setResults((r || []).filter((x) => x.is_indian)); // NSE/BSE only: no rupee price for foreign listings
      } catch {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, stock, picked]);

  if (!stock) return null;

  const choose = async (symbol: string) => {
    setPicked(symbol);
    setPreview(null);
    setError(null);
    setBusy(true);
    try {
      setPreview(await api.fixHoldingSymbol(stock.id, symbol, false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check this stock.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.fixHoldingSymbol(stock.id, picked, true);
      onFixed(r.symbol);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fix this stock.");
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={!!stock} onClose={onClose} title={`Fix price for ${stock.symbol}`}>
      <div className="space-y-4 text-sm">
        <p className="text-neutral-600 dark:text-neutral-400">
          We could not find a live price for <span className="font-mono font-semibold">{stock.symbol}</span>. Search for
          the company and pick its NSE or BSE listing. Your trades, dates and cost stay the same.
        </p>

        {!picked && (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Company name, e.g. CG Power"
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-primary-500"
            />
            <ul className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5">
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onClick={() => choose(r.symbol)}
                    className="w-full text-left px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-lg">
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white">{r.symbol}</span>
                    <span className="block text-xs text-neutral-500">{r.name}</span>
                  </button>
                </li>
              ))}
              {query.trim().length >= 2 && results.length === 0 && (
                <li className="px-2 py-2.5 text-xs text-neutral-500">No NSE or BSE stock found. Try another name.</li>
              )}
            </ul>
          </>
        )}

        {picked && (
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 p-4 space-y-2">
            <p className="font-mono font-semibold text-neutral-900 dark:text-white">
              {stock.symbol} → {preview?.symbol ?? picked}
            </p>
            {busy && !preview && <p className="text-neutral-500">Checking the price…</p>}
            {preview && (
              <>
                <p className="text-neutral-700 dark:text-neutral-300">
                  Live price {inr(preview.price)} · {preview.quantity} shares · value {inr(preview.value)}
                </p>
                <p className="text-xs text-neutral-500">
                  Before: {inr(stock.current_price)} per share (not live).
                  {preview.merges_with_existing && " You already hold this stock, so the two will be combined."}
                </p>
              </>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          {picked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => { setPicked(null); setPreview(null); setError(null); }}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300">
              Pick another
            </button>
          )}
          <button
            type="button"
            disabled={!preview || busy}
            onClick={confirm}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white">
            {busy && preview ? "Fixing…" : "Use this stock"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
