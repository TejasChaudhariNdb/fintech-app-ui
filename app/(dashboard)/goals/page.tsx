"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import GoalCard from "@/components/features/GoalCard";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { Loader2, Target } from "lucide-react";

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as any,
    isVisible: false,
  });
  const showToast = (
    message: string,
    type: "success" | "error" | "loading" | "info" = "info"
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
  };

  const [formData, setFormData] = useState({
    name: "",
    target: "",
    year: new Date().getFullYear() + 1,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Error loading goals:", err);
      showToast("Failed to load goals", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      showToast(editingId ? "Updating goal..." : "Creating goal...", "loading");
      if (editingId) {
        await api.updateGoal(
          editingId,
          formData.name,
          Number(formData.target),
          Number(formData.year)
        );
      } else {
        await api.createGoal(
          formData.name,
          Number(formData.target),
          Number(formData.year)
        );
      }
      loadGoals();
      handleCloseModal();
      showToast(
        `Goal ${editingId ? "updated" : "created"} successfully`,
        "success"
      );
    } catch (err: any) {
      showToast(
        `Failed to ${editingId ? "update" : "create"} goal: ` + err.message,
        "error"
      );
    }
  };

  const handleEdit = (goal: any) => {
    setFormData({
      name: goal.name,
      target: goal.target.toString(),
      year: goal.year || new Date().getFullYear() + 1,
    });
    setEditingId(goal.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      showToast("Deleting goal...", "loading");
      await api.deleteGoal(id);
      loadGoals();
      showToast("Goal deleted successfully", "success");
    } catch (err: any) {
      showToast("Failed to delete goal: " + err.message, "error");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: "", target: "", year: new Date().getFullYear() + 1 });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );

  return (
    <div className="pb-32 lg:pb-10 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      <div className="bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5 p-4 sticky top-0 z-20 transition-colors">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Track your financial milestones
        </p>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {goals.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center border-dashed border-2 border-neutral-200 dark:border-white/10">
            <div className="flex justify-center mb-4">
              <Target className="h-12 w-12 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
              No goals yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
              Create your first financial goal to start tracking progress
            </p>
            <Button onClick={() => setShowModal(true)} variant="primary">
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  id={goal.id}
                  name={goal.name}
                  target={goal.target}
                  current={goal.current}
                  progress={goal.progress}
                  onEdit={() => handleEdit(goal)}
                  onDelete={() => handleDelete(goal.id)}
                />
              ))}
            </div>

            <Button
              onClick={() => setShowModal(true)}
              className="w-full glass-card hover:bg-neutral-100 dark:hover:bg-white/10"
              variant="ghost">
              + Add New Goal
            </Button>
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? "Edit Goal" : "Create New Goal"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Goal Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Emergency Fund"
            required
            className="bg-neutral-50 dark:bg-black/20"
          />

          <Input
            label="Target Amount (₹)"
            type="number"
            value={formData.target}
            onChange={(e) =>
              setFormData({ ...formData, target: e.target.value })
            }
            placeholder="500000"
            required
            className="bg-neutral-50 dark:bg-black/20"
          />

          <Input
            label="Target Year"
            type="number"
            value={formData.year}
            onChange={(e) =>
              setFormData({ ...formData, year: Number(e.target.value) })
            }
            min={new Date().getFullYear()}
            required
            className="bg-neutral-50 dark:bg-black/20"
          />

          <Button type="submit" className="w-full" variant="primary">
            {editingId ? "Update Goal" : "Create Goal"}
          </Button>
        </form>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
