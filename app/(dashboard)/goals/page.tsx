'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GoalCard from '@/components/features/GoalCard';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    target: '',
    year: new Date().getFullYear() + 1
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGoal(formData.name, Number(formData.target), Number(formData.year));
      loadGoals();
      setShowModal(false);
      setFormData({ name: '', target: '', year: new Date().getFullYear() + 1 });
    } catch (err: any) {
      alert('Failed to create goal: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-20 bg-neutral-50 min-h-screen">
      <div className="bg-white border-b border-neutral-200 p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Track your financial milestones
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {goals.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-neutral-100">
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">No goals yet</h3>
            <p className="text-neutral-600 text-sm mb-4">
              Create your first financial goal to start tracking progress
            </p>
            <Button onClick={() => setShowModal(true)}>
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                id={goal.id}
                name={goal.name}
                target={goal.target}
                current={goal.current}
                progress={goal.progress}
              />
            ))}

            <Button onClick={() => setShowModal(true)} className="w-full">
              + Add New Goal
            </Button>
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Goal"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Goal Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Emergency Fund"
            required
          />

          <Input
            label="Target Amount (₹)"
            type="number"
            value={formData.target}
            onChange={(e) => setFormData({...formData, target: e.target.value})}
            placeholder="500000"
            required
          />

          <Input
            label="Target Year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({...formData, year: Number(e.target.value)})}
            min={new Date().getFullYear()}
            required
          />

          <Button type="submit" className="w-full">
            Create Goal
          </Button>
        </form>
      </Modal>
    </div>
  );
}