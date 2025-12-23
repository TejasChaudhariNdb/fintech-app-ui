'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Card from '@/components/ui/Card';
import TransactionItem from '@/components/features/TransactionItem';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SchemeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheme();
  }, [params.id]);

  const loadScheme = async () => {
    try {
      const data = await api.getSchemeDetail(Number(params.id));
      setScheme(data);
    } catch (err) {
      console.error('Error loading scheme:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!scheme) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Scheme not found</p>
      </div>
    );
  }

  const isPositive = scheme.profit >= 0;

  return (
    <div className="pb-20 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 p-4 sticky top-0 z-10">
        <button 
          onClick={() => router.back()} 
          className="mb-3 text-primary-600 font-medium"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold line-clamp-2">{scheme.scheme}</h1>
        <p className="text-neutral-600 mt-1">{scheme.amc}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Performance Card */}
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-neutral-600">Units</p>
              <p className="text-lg font-semibold mt-1">{scheme.units}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">NAV</p>
              <p className="text-lg font-semibold mt-1">₹{scheme.nav}</p>
            </div>
          </div>
          
          {scheme.nav_date && (
            <p className="text-xs text-neutral-500 mb-4">
              NAV as of {new Date(scheme.nav_date).toLocaleDateString('en-IN')}
            </p>
          )}
          
          <div className="h-px bg-neutral-200 my-4" />
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-600">Invested</span>
              <span className="font-semibold">
                ₹{scheme.invested.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Current Value</span>
              <span className="font-semibold">
                ₹{scheme.current.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
              <span className="font-medium">Total Gain</span>
              <div className="text-right">
                <p className={`font-bold ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
                  {isPositive ? '+' : ''}₹{scheme.profit.toLocaleString('en-IN')}
                </p>
                <p className={`text-sm ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
                  {isPositive ? '+' : ''}{scheme.return_pct.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Transactions */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4">
            Transactions ({scheme.transactions?.length || 0})
          </h3>
          <div>
            {scheme.transactions && scheme.transactions.length > 0 ? (
              scheme.transactions.map((tx: any, i: number) => (
                <TransactionItem
                  key={i}
                  date={tx.date}
                  type={tx.type}
                  amount={tx.amount}
                  units={tx.units}
                  schemeName={scheme.scheme}
                  amc={scheme.amc}
                />
              ))
            ) : (
              <p className="text-neutral-600 text-center py-8">
                No transactions found
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}