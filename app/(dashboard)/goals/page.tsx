"use strict";
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import GoalCard from "@/components/features/GoalCard";
import CreateGoalModal from "@/components/features/CreateGoalModal";
import Button from "@/components/ui/Button";
import { Plus, Target, RefreshCw } from "lucide-react";

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (id: number) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.deleteGoal(id);
      loadGoals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header */}
      {/* Header */}
      <div className="px-4 pt-8 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Financial Goals
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Plan your future with purpose
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus size={18} /> New Goal
        </Button>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-neutral-400" />
          </div>
        ) : goals.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => {}}
                  onDelete={() => deleteGoal(goal.id)}
                />
              ))}
            </div>

            <Button
              variant="secondary"
              className="w-full py-3 mb-8 border-dashed border-2 border-neutral-300 dark:border-white/10 bg-transparent hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-all"
              onClick={() => setShowCreateModal(true)}>
              <Plus size={20} className="mr-2" /> Add New Goal
            </Button>
          </>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-neutral-200 dark:border-white/5 shadow-sm">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="text-neutral-400" size={32} />
            </div>
            <h3 className="font-semibold text-lg mb-2 dark:text-white">
              No Goals Set Yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs mx-auto mb-6">
              Start by defining what you are saving for. Link your investments
              to track real progress.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Goal
            </Button>
          </div>
        )}
      </div>

      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadGoals}
      />
    </div>
  );
}
