"use strict";
import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goalToEdit?: any; // Add goalToEdit prop
}

export default function CreateGoalModal({
  isOpen,
  onClose,
  onSuccess,
  goalToEdit,
}: CreateGoalModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    target_year: "",
    icon: "target",
    linked_schemes: [] as { scheme_id: number; contribution_amount: string }[], // string for input handling
  });

  const [availableSchemes, setAvailableSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSchemes();
      if (goalToEdit) {
        setFormData({
          name: goalToEdit.name,
          target_amount: goalToEdit.target_amount.toString(),
          target_year: goalToEdit.target_year.toString(),
          icon: goalToEdit.icon || "target",
          linked_schemes: goalToEdit.linked_schemes.map((ls: any) => ({
            scheme_id: ls.scheme_id || ls.id, // Handle backend mismatch if any
            contribution_amount: ls.contribution.toString(),
          })),
        });
      } else {
        setFormData({
          name: "",
          target_amount: "",
          target_year: "",
          icon: "target",
          linked_schemes: [],
        });
      }
      setStep(1);
    }
  }, [isOpen, goalToEdit]);

  const loadSchemes = async () => {
    try {
      const data = await api.getSchemes();
      setAvailableSchemes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addSchemeLink = () => {
    if (availableSchemes.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      linked_schemes: [
        ...prev.linked_schemes,
        { scheme_id: availableSchemes[0].scheme_id, contribution_amount: "0" },
      ],
    }));
  };

  const removeSchemeLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linked_schemes: prev.linked_schemes.filter((_, i) => i !== index),
    }));
  };

  const updateSchemeLink = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newLinks = [...prev.linked_schemes];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, linked_schemes: newLinks };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        target_year: parseInt(formData.target_year),
        icon: formData.icon,
        linked_schemes: formData.linked_schemes.map((l) => ({
          scheme_id: Number(l.scheme_id),
          contribution_amount: parseFloat(l.contribution_amount) || 0,
        })),
      };

      if (goalToEdit) {
        await api.updateGoal(goalToEdit.id, payload);
      } else {
        await api.createGoal(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save goal");
    } finally {
      setLoading(false);
    }
  };

  const ICONS = ["home", "education", "travel", "car", "retirement", "target"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={goalToEdit ? "Edit Goal" : "Establish New Goal"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              Goal Type
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-3 rounded-xl border capitalize text-sm whitespace-nowrap ${
                    formData.icon === icon
                      ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400"
                      : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-white hover:border-primary-300"
                  }`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Goal Name"
            placeholder="e.g. Dream House, Sarah's College"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Amount (₹)"
              type="number"
              placeholder="5000000"
              value={formData.target_amount}
              onChange={(e) =>
                setFormData({ ...formData, target_amount: e.target.value })
              }
              required
            />
            <Input
              label="Target Year"
              type="number"
              placeholder="2035"
              value={formData.target_year}
              onChange={(e) =>
                setFormData({ ...formData, target_year: e.target.value })
              }
              required
            />
          </div>
        </div>

        {/* Investment Linking */}
        <div className="pt-4 border-t border-neutral-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white">
                Link Investments
              </h4>
              <p className="text-xs text-neutral-500">
                Tag funds to this goal (optional)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSchemeLink}>
              <Plus size={16} /> Add Fund
            </Button>
          </div>

          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {formData.linked_schemes.length === 0 && (
              <p className="text-sm text-neutral-400 italic text-center py-4 bg-neutral-50 dark:bg-white/5 rounded-lg border border-dashed border-neutral-200 dark:border-white/10">
                No funds linked yet. Allot schemes to track progress accurately.
              </p>
            )}

            {formData.linked_schemes.map((link, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10">
                <div className="flex-1 space-y-2">
                  <select
                    className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    value={link.scheme_id}
                    onChange={(e) =>
                      updateSchemeLink(index, "scheme_id", e.target.value)
                    }>
                    {availableSchemes.map((s) => (
                      <option key={s.scheme_id} value={s.scheme_id}>
                        {s.scheme}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">
                      Monthly SIP Allocation (₹)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="SIP Amount"
                      value={link.contribution_amount}
                      onChange={(e) =>
                        updateSchemeLink(
                          index,
                          "contribution_amount",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSchemeLink(index)}
                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg mt-0.5">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" isLoading={loading} className="w-full">
          Create Goal Plan
        </Button>
      </form>
    </Modal>
  );
}
