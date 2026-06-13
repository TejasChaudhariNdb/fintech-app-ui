"use client";
import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

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
  const { profiles, activeProfileId } = useProfile();
  const [goalType, setGoalType] = useState<"PERSONAL" | "FAMILY">("PERSONAL");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [prevTargetId, setPrevTargetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    target_year: "",
    icon: "target",
    linked_schemes: [] as { scheme_id: number; contribution_amount: string }[],
    linked_equities: [] as { holding_id: number; symbol: string }[],
  });

  const [availableSchemes, setAvailableSchemes] = useState<any[]>([]);
  const [availableStocks, setAvailableStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async (targetProfileId: string) => {
    try {
      const [schemes, equityData] = await Promise.all([
        api.fetch(`/portfolio/schemes?profile_id=${targetProfileId}`),
        api.fetch(`/equity/summary?profile_id=${targetProfileId}`),
      ]);
      setAvailableSchemes(schemes || []);
      setAvailableStocks(equityData?.holdings || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Initialize selectedProfileId and goalType when modal opens or goalToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (goalToEdit) {
        setGoalType(goalToEdit.goal_type || "PERSONAL");
        const editProfileId = goalToEdit.profile_id ? String(goalToEdit.profile_id) : "";
        setSelectedProfileId(editProfileId);
        
        setFormData({
          name: goalToEdit.name,
          target_amount: goalToEdit.target_amount.toString(),
          target_year: goalToEdit.target_year.toString(),
          icon: goalToEdit.icon || "target",
          linked_schemes: goalToEdit.linked_schemes.map((ls: any) => ({
            scheme_id: ls.scheme_id || ls.id,
            contribution_amount: ls.contribution.toString(),
          })),
          linked_equities: goalToEdit.linked_equities
            ? goalToEdit.linked_equities.map((le: any) => ({
                holding_id: le.holding_id,
                symbol: le.symbol,
              }))
            : [],
        });
        setPrevTargetId(goalToEdit.goal_type === "FAMILY" ? "all" : editProfileId);
      } else {
        const initialType = activeProfileId === "all" ? "FAMILY" : "PERSONAL";
        setGoalType(initialType);
        const initialProfileId = activeProfileId === "all" 
          ? (profiles[0]?.id ? String(profiles[0].id) : "")
          : activeProfileId;
        setSelectedProfileId(initialProfileId);
        
        setFormData({
          name: "",
          target_amount: "",
          target_year: "",
          icon: "target",
          linked_schemes: [],
          linked_equities: [],
        });
        setPrevTargetId(initialType === "FAMILY" ? "all" : initialProfileId);
      }
      setStep(1);
    }
  }, [isOpen, goalToEdit, activeProfileId, profiles]);

  // Load schemes/stocks based on goalType and selectedProfileId
  useEffect(() => {
    if (isOpen) {
      const targetId = goalType === "FAMILY" ? "all" : selectedProfileId;
      if (targetId) {
        loadData(targetId);
        
        // Only clear if the scope actually changed from the previous loaded scope
        if (prevTargetId && prevTargetId !== targetId) {
          setFormData((prev) => ({
            ...prev,
            linked_schemes: [],
            linked_equities: [],
          }));
        }
        setPrevTargetId(targetId);
      }
    }
  }, [goalType, selectedProfileId, isOpen]);

  // Helper to group schemes by profile name
  const getGroupedSchemes = () => {
    const grouped: { [key: string]: typeof availableSchemes } = {};
    if (goalType === "PERSONAL") {
      const pName = profiles.find((p) => String(p.id) === selectedProfileId)?.name || "Self";
      grouped[pName] = availableSchemes;
    } else {
      // FAMILY Goal
      availableSchemes.forEach((s) => {
        if (s.profile_breakdown && s.profile_breakdown.length > 0) {
          s.profile_breakdown.forEach((pb: any) => {
            const pName = pb.profile_name || "Self";
            if (!grouped[pName]) grouped[pName] = [];
            if (!grouped[pName].find((item) => item.scheme_id === (pb.scheme_id || s.scheme_id))) {
              grouped[pName].push({
                ...s,
                scheme_id: pb.scheme_id || s.scheme_id,
                current_value: pb.current_value,
              });
            }
          });
        } else {
          const pName = "Self";
          if (!grouped[pName]) grouped[pName] = [];
          if (!grouped[pName].find((item) => item.scheme_id === s.scheme_id)) {
            grouped[pName].push(s);
          }
        }
      });
    }
    return grouped;
  };

  // Helper to group stocks by profile name
  const getGroupedStocks = () => {
    const grouped: { [key: string]: typeof availableStocks } = {};
    if (goalType === "PERSONAL") {
      const pName = profiles.find((p) => String(p.id) === selectedProfileId)?.name || "Self";
      grouped[pName] = availableStocks;
    } else {
      // FAMILY Goal
      availableStocks.forEach((s) => {
        if (s.profile_breakdown && s.profile_breakdown.length > 0) {
          s.profile_breakdown.forEach((pb: any) => {
            const pName = pb.profile_name || "Self";
            if (!grouped[pName]) grouped[pName] = [];
            if (!grouped[pName].find((item) => item.id === (pb.holding_id || s.id))) {
              grouped[pName].push({
                ...s,
                id: pb.holding_id || s.id,
                value: pb.value,
              });
            }
          });
        } else {
          const pName = "Self";
          if (!grouped[pName]) grouped[pName] = [];
          if (!grouped[pName].find((item) => item.id === s.id)) {
            grouped[pName].push(s);
          }
        }
      });
    }
    return grouped;
  };

  const addSchemeLink = () => {
    const allSchemeItems = Object.values(getGroupedSchemes()).flat();
    if (allSchemeItems.length === 0) return;
    const available = allSchemeItems.filter(
      (item) => !formData.linked_schemes.find((l) => l.scheme_id === item.scheme_id)
    );
    if (available.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      linked_schemes: [
        ...prev.linked_schemes,
        { scheme_id: available[0].scheme_id, contribution_amount: "0" },
      ],
    }));
  };

  const addStockLink = () => {
    const allStockItems = Object.values(getGroupedStocks()).flat();
    if (allStockItems.length === 0) return;
    const available = allStockItems.filter(
      (item) => !formData.linked_equities.find((l) => l.holding_id === item.id)
    );
    if (available.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      linked_equities: [
        ...prev.linked_equities,
        { holding_id: available[0].id, symbol: available[0].symbol },
      ],
    }));
  };

  const removeSchemeLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linked_schemes: prev.linked_schemes.filter((_, i) => i !== index),
    }));
  };

  const removeStockLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linked_equities: prev.linked_equities.filter((_, i) => i !== index),
    }));
  };

  const updateSchemeLink = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newLinks = [...prev.linked_schemes];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, linked_schemes: newLinks };
    });
  };

  const updateStockLink = (index: number, holdingId: string) => {
    const parsedId = Number(holdingId);
    if (isNaN(parsedId)) return;
    
    let foundSymbol = "";
    for (const s of availableStocks) {
      if (s.id === parsedId) {
        foundSymbol = s.symbol;
        break;
      }
      if (s.profile_breakdown) {
        const foundPb = s.profile_breakdown.find((pb: any) => pb.holding_id === parsedId);
        if (foundPb) {
          foundSymbol = s.symbol;
          break;
        }
      }
    }

    setFormData((prev) => {
      const newLinks = [...prev.linked_equities];
      newLinks[index] = {
        holding_id: parsedId,
        symbol: foundSymbol,
      };
      return { ...prev, linked_equities: newLinks };
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
        goal_type: goalType,
        profile_id: goalType === "PERSONAL" ? (selectedProfileId ? Number(selectedProfileId) : null) : null,
        linked_schemes: formData.linked_schemes.map((l) => ({
          scheme_id: Number(l.scheme_id),
          contribution_amount: parseFloat(l.contribution_amount) || 0,
        })),
        linked_equities: formData.linked_equities.map((l) => ({
          holding_id: Number(l.holding_id),
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

  const ICONS = [
    "home",
    "education",
    "travel",
    "car",
    "retirement",
    "target",
    "other",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={goalToEdit ? "Edit Goal" : "Establish New Goal"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal Details */}
        <div className="space-y-4">
          {/* Goal Scope Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Goal Scope
              </label>
              <div className="flex rounded-xl bg-neutral-100 dark:bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setGoalType("PERSONAL")}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                    goalType === "PERSONAL"
                      ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setGoalType("FAMILY")}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                    goalType === "FAMILY"
                      ? "bg-white dark:bg-[#1A1F2B] text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  Family
                </button>
              </div>
            </div>

            {/* Profile Dropdown (Only for Personal Scope) */}
            {goalType === "PERSONAL" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Profile Owner
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-white/5 border border-transparent focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-all dark:text-white"
                >
                  <option value="" disabled>Select Profile</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relation})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
              Goal Icon
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
          {/* Funds */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white">
                Link Mutual Funds
              </h4>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSchemeLink}>
              <Plus size={16} /> Add Fund
            </Button>
          </div>

          <div className="space-y-3 mb-6">
            {formData.linked_schemes.length === 0 && (
              <p className="text-sm text-neutral-400 italic">
                No funds linked.
              </p>
            )}

            {formData.linked_schemes.map((link, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10">
                <div className="flex-1 space-y-2">
                  <select
                    className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    value={link.scheme_id || ""}
                    onChange={(e) =>
                      updateSchemeLink(index, "scheme_id", e.target.value)
                    }>
                    <option value="" disabled>Select Fund</option>
                    {Object.entries(getGroupedSchemes()).map(([profileName, schemes]) => (
                      <optgroup key={profileName} label={profileName}>
                        {schemes.map((s) => (
                          <option key={s.scheme_id} value={s.scheme_id}>
                            {s.scheme} - ₹{s.current_value?.toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
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

          {/* Stocks */}
          <div className="flex items-center justify-between mb-3 pt-4 border-t border-dashed border-neutral-200 dark:border-white/10">
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white">
                Link Stocks
              </h4>
            </div>
            {availableStocks.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStockLink}>
                <Plus size={16} /> Add Stock
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {formData.linked_equities.length === 0 && (
              <p className="text-sm text-neutral-400 italic">
                No stocks linked.
              </p>
            )}

            {formData.linked_equities.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10">
                <div className="flex-1">
                  <select
                    className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    value={link.holding_id || ""}
                    onChange={(e) => updateStockLink(index, e.target.value)}>
                    <option value="" disabled>Select Stock</option>
                    {Object.entries(getGroupedStocks()).map(([profileName, stocks]) => (
                      <optgroup key={profileName} label={profileName}>
                        {stocks.map((s) => (
                          <option key={s.id || s.symbol} value={s.id || s.symbol}>
                            {s.symbol} - ₹{s.value?.toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeStockLink(index)}
                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" isLoading={loading} className="w-full">
          {goalToEdit ? "Update Goal" : "Create Goal Plan"}
        </Button>
      </form>
    </Modal>
  );
}
