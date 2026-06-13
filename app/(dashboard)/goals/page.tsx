"use strict";
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import GoalCard from "@/components/features/GoalCard";
import CreateGoalModal from "@/components/features/CreateGoalModal";
import Button from "@/components/ui/Button";
import { Plus, Target, RefreshCw } from "lucide-react";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { useProfile } from "@/context/ProfileContext";

export default function GoalsPage() {
  const { profiles, activeProfileId } = useProfile();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  useEffect(() => {
    loadGoals();
  }, [activeProfileId]);

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

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingGoal(null);
  };

  const familyGoals = goals.filter((g) => g.goal_type === "FAMILY");
  const personalGoals = goals.filter((g) => g.goal_type === "PERSONAL");

  // Get profiles that have at least one personal goal
  const profilesWithGoals = profiles.filter((p) =>
    personalGoals.some((g) => g.profile_id === p.id)
  );

  // Remaining personal goals that aren't mapped to any profile (e.g. unassigned)
  const unassignedPersonalGoals = personalGoals.filter(
    (g) => !profiles.some((p) => p.id === g.profile_id)
  );

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Financial Goals
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Plan your future with purpose
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 shrink-0">
          <Plus size={18} /> New Goal
        </Button>
      </div>

      <div className="px-4">
        {loading ? (
          <AppSkeleton />
        ) : goals.length > 0 ? (
          <>
            {/* 1. Family Shared Goals */}
            {(activeProfileId === "all" || familyGoals.length > 0) && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Family Shared Goals
                </h2>
                {familyGoals.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {familyGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={() => handleEditGoal(goal)}
                        onDelete={() => deleteGoal(goal.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl bg-neutral-50/50 dark:bg-white/0 text-center">
                    <p className="text-sm text-neutral-400 italic">No family shared goals defined. Create a joint family goal to link assets from multiple profiles.</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. Personal Goals */}
            {activeProfileId === "all" ? (
              /* Grouped by Family Profile when viewing all family */
              (profilesWithGoals.length > 0 || unassignedPersonalGoals.length > 0) && (
                <div className="space-y-10">
                  {profilesWithGoals.map((profile) => {
                    const profileGoals = personalGoals.filter((g) => g.profile_id === profile.id);
                    return (
                      <div key={profile.id} className="pt-6 border-t border-dashed border-neutral-200 dark:border-white/10">
                        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          {profile.name}&apos;s Personal Goals
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {profileGoals.map((goal) => (
                            <GoalCard
                              key={goal.id}
                              goal={goal}
                              onEdit={() => handleEditGoal(goal)}
                              onDelete={() => deleteGoal(goal.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {unassignedPersonalGoals.length > 0 && (
                    <div className="pt-6 border-t border-dashed border-neutral-200 dark:border-white/10">
                      <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                        Unassigned Personal Goals
                      </h2>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {unassignedPersonalGoals.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={() => handleEditGoal(goal)}
                            onDelete={() => deleteGoal(goal.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* Single Profile View: just render active profile's goals */
              (activeProfileId !== "all" || personalGoals.length > 0) && (
                <div className="pt-6 border-t border-dashed border-neutral-200 dark:border-white/10">
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Personal Goals
                  </h2>
                  {personalGoals.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {personalGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={() => handleEditGoal(goal)}
                          onDelete={() => deleteGoal(goal.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl bg-neutral-50/50 dark:bg-white/0 text-center">
                      <p className="text-sm text-neutral-400 italic">No personal goals set for this profile.</p>
                    </div>
                  )}
                </div>
              )
            )}

            <Button
              variant="secondary"
              className="w-full py-3 mt-10 border-dashed border-2 border-neutral-300 dark:border-white/10 bg-transparent hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-all"
              onClick={() => setShowCreateModal(true)}>
              <Plus size={20} className="mr-2" /> Add New Goal Plan
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
        onClose={handleCloseModal}
        onSuccess={loadGoals}
        goalToEdit={editingGoal}
      />
    </div>
  );
}
