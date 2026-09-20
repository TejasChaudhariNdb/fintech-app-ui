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
    target_amount?: number | null;
    target_year?: number | null;
    current_value: number;
    monthly_contribution: number;
    projected_value: number;
    shortfall: number;
    sip_increase_needed: number;
    achieved_percentage: number;
    goal_type?: string;
    linked_schemes: {
      scheme_name: string;
      contribution: number;
      current_value?: number;
    }[];
    linked_equities?: {
      symbol: string;
      current_value?: number;
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
  const hasTarget = goal.target_amount !== null && goal.target_amount !== undefined && goal.target_amount > 0;
  const hasTargetYear = goal.target_year !== null && goal.target_year !== undefined && goal.target_year > 0;
  const isShortfall = hasTarget && goal.shortfall > 0;
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                {goal.name}
              </h3>
              {goal.goal_type && (
                <span className={`text-[9px] tracking-wider px-1.5 py-0.5 rounded-md font-bold uppercase border ${
                  goal.goal_type === "FAMILY"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                }`}>
                  {goal.goal_type === "FAMILY" ? "Family" : "Personal"}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {hasTarget && hasTargetYear ? (
                <>
                  Target: <PrivacyMask>₹{goal.target_amount!.toLocaleString("en-IN")}</PrivacyMask> by {goal.target_year}
                </>
              ) : hasTarget ? (
                <>
                  Target: <PrivacyMask>₹{goal.target_amount!.toLocaleString("en-IN")}</PrivacyMask> • Open Timeline
                </>
              ) : hasTargetYear ? (
                <>
                  Target Year: {goal.target_year} • Open Target
                </>
              ) : (
                "Savings Bucket • Flexible Growth"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          {/* Achieved Stats */}
          <div className="text-right pt-1">
            <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
              {hasTarget ? "Achieved" : "Status"}
            </p>
            <p className="font-bold text-xl text-primary-600 dark:text-primary-400 leading-none mt-0.5">
              {hasTarget ? `${goal.achieved_percentage.toFixed(0)}%` : "Active"}
            </p>
          </div>

          {/* Menu Trigger */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 -mt-1 -mr-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10 cursor-default"
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
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-neutral-100 dark:bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            hasTarget ? "bg-primary-500" : "bg-gradient-to-r from-primary-500 to-emerald-400"
          }`}
          style={{ width: hasTarget ? `${Math.min(100, goal.achieved_percentage)}%` : "100%" }}
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
      {!hasTarget ? (
        <div className="mb-5 p-3.5 bg-primary-50/50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-xl flex items-start gap-3">
          <CheckCircle className="text-primary-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
              Savings Bucket Active
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
              Currently holding <strong>₹{goal.current_value.toLocaleString("en-IN")}</strong>
              {goal.monthly_contribution > 0 ? ` with ₹${goal.monthly_contribution.toLocaleString("en-IN")}/month allocated SIP.` : "."}
            </p>
          </div>
        </div>
      ) : isShortfall ? (
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

      {/* Linked Assets */}
      {(goal.linked_schemes.length > 0 || (goal.linked_equities && goal.linked_equities.length > 0)) && (
        <div className="pt-4 border-t border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={14} className="text-neutral-400" />
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Funded By ({goal.linked_schemes.length + (goal.linked_equities?.length || 0)} Assets)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {goal.linked_schemes.map((s, i) => (
              <span
                key={`scheme-${i}`}
                className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{s.scheme_name.split(" - ")[0]}</span>
                {s.current_value !== undefined && s.current_value !== null && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    • ₹{Math.round(s.current_value).toLocaleString("en-IN")}
                  </span>
                )}
                {s.contribution > 0 && (
                  <span className="ml-1 text-neutral-400">
                    • ₹{s.contribution}/m
                  </span>
                )}
              </span>
            ))}
            {goal.linked_equities?.map((e, i) => (
              <span
                key={`eq-${i}`}
                className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{e.symbol}</span>
                {e.current_value !== undefined && e.current_value !== null && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    • ₹{Math.round(e.current_value).toLocaleString("en-IN")}
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
