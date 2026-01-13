"use strict";
import { useState } from "react";
import {
  Target,
  Home,
  GraduationCap,
  Plane,
  Car,
  Umbrella,
  AlertTriangle,
  CheckCircle,
  Briefcase,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import Card from "../ui/Card";
import PrivacyMask from "../ui/PrivacyMask";

interface GoalCardProps {
  goal: {
    id: number;
    name: string;
    icon?: string;
    target_amount: number;
    target_year: number;
    current_value: number;
    monthly_contribution: number;
    projected_value: number;
    shortfall: number;
    sip_increase_needed: number;
    achieved_percentage: number;
    linked_schemes: {
      scheme_name: string;
      contribution: number;
    }[];
  };
  onEdit: () => void;
  onDelete: () => void;
}

const getIcon = (iconName?: string) => {
  switch (iconName) {
    case "home":
      return <Home className="text-blue-500" />;
    case "education":
      return <GraduationCap className="text-purple-500" />;
    case "travel":
      return <Plane className="text-sky-500" />;
    case "car":
      return <Car className="text-red-500" />;
    case "retirement":
      return <Umbrella className="text-emerald-500" />;
    default:
      return <Target className="text-primary-500" />;
  }
};

export default function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const isShortfall = goal.shortfall > 0;
  const currentYear = new Date().getFullYear();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="p-5 border border-neutral-200 dark:border-white/5 relative group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-100 dark:bg-white/10 rounded-xl">
            {getIcon(goal.icon)}
          </div>
          <div>
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white pr-6">
              {goal.name}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Target:{" "}
              <PrivacyMask>
                ₹{goal.target_amount.toLocaleString("en-IN")}
              </PrivacyMask>{" "}
              by {goal.target_year}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">
            Achieved
          </p>
          <p className="font-bold text-xl text-primary-600 dark:text-primary-400">
            {goal.achieved_percentage.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Actions Menu */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10">
          <MoreVertical size={18} />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-8 z-20 w-32 bg-white dark:bg-black/90 border border-neutral-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onEdit();
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-white/10 flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete();
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-neutral-100 dark:bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(100, goal.achieved_percentage)}%` }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-3 bg-neutral-50 dark:bg-white/5 rounded-xl border border-neutral-100 dark:border-white/5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Current Corpus
          </p>
          <p className="font-semibold text-neutral-900 dark:text-white">
            <PrivacyMask>
              ₹{goal.current_value.toLocaleString("en-IN")}
            </PrivacyMask>
          </p>
        </div>
        <div className="p-3 bg-neutral-50 dark:bg-white/5 rounded-xl border border-neutral-100 dark:border-white/5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Monthly SIP
          </p>
          <p className="font-semibold text-neutral-900 dark:text-white">
            <PrivacyMask>
              ₹{goal.monthly_contribution.toLocaleString("en-IN")}
            </PrivacyMask>
          </p>
        </div>
      </div>

      {/* Insight / Suggestion */}
      {isShortfall ? (
        <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Projected Shortfall:{" "}
              <PrivacyMask>
                ₹{goal.shortfall.toLocaleString("en-IN")}
              </PrivacyMask>
            </p>
            {goal.sip_increase_needed > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Recommendation: Increase monthly SIP by{" "}
                <strong>
                  ₹{Math.ceil(goal.sip_increase_needed / 500) * 500}
                </strong>{" "}
                (approx) to reach goal on time.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl flex items-start gap-3">
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              On Track!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Your current investments are sufficient to reach this goal.
            </p>
          </div>
        </div>
      )}

      {/* Linked Schemes */}
      {goal.linked_schemes.length > 0 && (
        <div className="pt-4 border-t border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={14} className="text-neutral-400" />
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Funded By
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {goal.linked_schemes.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300">
                {s.scheme_name.split(" - ")[0]}
                {s.contribution > 0 && (
                  <span className="ml-1 text-neutral-400">
                    • ₹{s.contribution}/m
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
