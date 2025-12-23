'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Card from '@/components/ui/Card';
import TransactionItem from '@/components/features/TransactionItem';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions(0, 50);
      setTransactions(data.data || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-20 bg-neutral-50 min-h-screen">
      <div className="bg-white border-b border-neutral-200 p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Recent transactions
        </p>
      </div>

      <div className="px-4 pt-4">
        {transactions.length > 0 ? (
          <Card className="p-4">
            {transactions.map((tx, i) => (
              <TransactionItem
                key={i}
                date={tx.date}
                type={tx.type}
                amount={tx.amount}
                units={tx.units}
                schemeName={tx.scheme_name}
                amc={tx.amc}
              />
            ))}
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-4xl mb-2">📝</p>
            <p className="text-neutral-600">No transactions yet</p>
            <p className="text-sm text-neutral-500 mt-1">
              Upload your CAS to see transactions
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
