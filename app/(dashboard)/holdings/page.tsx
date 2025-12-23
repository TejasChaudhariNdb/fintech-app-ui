'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import SchemeCard from '@/components/features/SchemeCard';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function HoldingsPage() {
  const router = useRouter();
  const [view, setView] = useState('mutual-funds');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [amcAllocation, setAmcAllocation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, a] = await Promise.all([
        api.getSchemes(),
        api.getAMCAllocation(),
      ]);
      setSchemes(s);
      setAmcAllocation(a);
    } catch (err) {
      console.error('Error loading holdings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const totalValue = amcAllocation.reduce((sum, item) => sum + item.current, 0);

  return (
    <div className="pb-20 bg-neutral-50 min-h-screen">
      {/* Header with Toggle */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold mb-4">Holdings</h1>
          
          <div className="flex gap-2 bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setView('mutual-funds')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                view === 'mutual-funds'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-neutral-600'
              }`}
            >
              Mutual Funds
            </button>
            <button
              onClick={() => setView('stocks')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                view === 'stocks'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-neutral-600'
              }`}
            >
              Stocks
            </button>
          </div>
        </div>
      </div>

      {view === 'mutual-funds' ? (
        <div className="px-4 pt-4 space-y-6">
          {/* AMC Allocation */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold mb-4">AMC Allocation</h3>
            
            <div className="text-center py-6">
              <p className="text-3xl font-bold">
                ₹{(totalValue / 100000).toFixed(1)}L
              </p>
              <p className="text-sm text-neutral-600 mt-1">Total Value</p>
            </div>
            
            <div className="space-y-2 mt-4">
              {amcAllocation.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'][i % 4] }}
                    />
                    <span className="text-sm font-medium">{item.amc}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ₹{item.current.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {item.percent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Schemes List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">All Schemes ({schemes.length})</h3>
            {schemes.map((scheme) => (
              <SchemeCard
                key={scheme.scheme_id}
                schemeId={scheme.scheme_id}
                scheme={scheme.scheme}
                amc={scheme.amc}
                current={scheme.current}
                returnPct={scheme.return_pct}
                onClick={() => router.push(`/holdings/${scheme.scheme_id}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <div className="bg-neutral-100 rounded-xl p-8 text-center">
            <p className="text-4xl mb-2">📈</p>
            <p className="text-neutral-600">Stocks feature coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}