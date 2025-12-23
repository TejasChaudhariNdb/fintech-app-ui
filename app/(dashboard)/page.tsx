'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import NetWorthCard from '@/components/features/NetWorthCard';
import PortfolioSummary from '@/components/features/PortfolioSummary';
import GoalCard from '@/components/features/GoalCard';
import Button from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const [netWorth, setNetWorth] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading dashboard data...');
      
      const [nw, ps, g] = await Promise.all([
        api.getNetWorth().catch(err => {
          console.error('Net worth error:', err);
          return { net_worth: 0, mutual_funds: 0, stocks: 0 };
        }),
        api.getPortfolioSummary().catch(err => {
          console.error('Portfolio summary error:', err);
          return { invested: 0, current: 0, profit: 0, return_pct: 0 };
        }),
        api.getGoals().catch(err => {
          console.error('Goals error:', err);
          return [];
        }),
      ]);
      
      console.log('Data loaded:', { nw, ps, g });
      
      setNetWorth(nw);
      setSummary(ps);
      setGoals(g.slice(0, 2));
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshNAVs = async () => {
    try {
      await api.refreshNAVs();
      alert('NAVs refreshed successfully!');
      loadData();
    } catch (err: any) {
      alert('Failed to refresh NAVs: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-neutral-600 mb-4">{error}</p>
          <Button onClick={loadData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 pt-12 pb-6">
        <h1 className="text-white text-2xl font-bold">Welcome back</h1>
        <p className="text-white/80 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Net Worth Card */}
        <NetWorthCard
          netWorth={netWorth?.net_worth || 0}
          mfValue={netWorth?.mutual_funds || 0}
          stockValue={netWorth?.stocks || 0}
        />

        {/* Portfolio Summary */}
        {summary && (
          <PortfolioSummary
            invested={summary.invested || 0}
            current={summary.current || 0}
            profit={summary.profit || 0}
            returnPct={summary.return_pct || 0}
          />
        )}

        {/* Goals Preview */}
        {goals.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Goals</h3>
              <button 
                onClick={() => router.push('/goals')}
                className="text-sm text-primary-600 font-medium"
              >
                View All
              </button>
            </div>
            
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                id={goal.id}
                name={goal.name}
                target={goal.target}
                current={goal.current}
                progress={goal.progress}
                onClick={() => router.push('/goals')}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => router.push('/profile')}
              className="bg-white border-2 border-primary-500 text-primary-600 rounded-xl p-4 font-semibold active:scale-95 transition"
            >
              📄 Upload CAS
            </button>
            <button 
              onClick={handleRefreshNAVs}
              className="bg-white border border-neutral-200 rounded-xl p-4 font-semibold active:scale-95 transition"
            >
              🔄 Refresh NAVs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}