"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import PrivacyMask from "@/components/ui/PrivacyMask";
import InsurancePolicyModal from "@/components/features/InsurancePolicyModal";
import { InsurancePolicyFormData } from "@/components/features/InsurancePolicyForm";
import {
  Shield,
  ShieldCheck,
  Heart,
  Car,
  FileText,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Clock,
  Sparkles,
  User,
  CheckCircle2,
} from "lucide-react";

interface InsurancePolicyItem {
  id: number;
  user_id: number;
  profile_id?: number;
  profile_name: string;
  profile_relation: string;
  policy_type: string;
  insurer_name: string;
  policy_name: string;
  policy_number?: string | null;
  sum_assured: number;
  annual_premium: number;
  premium_frequency: string;
  policy_start_date: string;
  policy_end_date?: string | null;
  next_premium_due_date?: string | null;
  days_to_renewal?: number | null;
  is_renewal_due_soon: boolean;
  is_overdue: boolean;
  nominee_name?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string | null;
}

interface InsuranceSummary {
  total_life_cover: number;
  total_health_cover: number;
  total_annual_premium: number;
  total_policies_count: number;
  active_policies_count: number;
  renewal_due_count: number;
  renewal_due_premium: number;
  type_counts: Record<string, number>;
}

function formatINRShort(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) {
    return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, "")}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(val / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  }
  if (abs >= 1000) {
    return `₹${(val / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
}

function formatDatePretty(dateStr?: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function InsuranceVaultPage() {
  const [policies, setPolicies] = useState<InsurancePolicyItem[]>([]);
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InsurancePolicyItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getInsurancePolicies();
      if (res) {
        setPolicies(res.policies || []);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error("Failed to load insurance policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("added") === "true") {
        showToast("Insurance policy saved successfully");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: InsurancePolicyItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSavePolicy = async (payload: InsurancePolicyFormData) => {
    if (editingItem) {
      await api.updateInsurancePolicy(editingItem.id, payload as any);
      showToast("Policy updated successfully");
    } else {
      await api.addInsurancePolicy(payload as any);
      showToast("Policy added successfully");
    }
    await loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this insurance policy?")) return;
    try {
      await api.deleteInsurancePolicy(id);
      showToast("Policy removed from vault");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete policy");
    }
  };

  // Filtered items
  const filteredPolicies = policies.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "TERM_LIFE") return item.policy_type === "TERM_LIFE";
    if (activeFilter === "HEALTH") return item.policy_type === "HEALTH" || item.policy_type === "CRITICAL_ILLNESS";
    if (activeFilter === "MOTOR") return item.policy_type === "MOTOR";
    if (activeFilter === "OTHERS") return item.policy_type === "ULIP_ENDOWMENT";
    return true;
  });

  return (
    <div className="px-4 py-4 sm:py-6 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Insurance &amp; Policy Vault</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 flex items-center gap-1">
              <Shield size={12} /> Family Safety Net
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Track family term life cover, health insurance floaters, and upcoming premium renewals
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Refresh policies"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Link
            href="/insurance/add"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 font-semibold text-xs sm:text-sm transition-colors"
            title="Open full dedicated page"
          >
            <ExternalLink size={15} />
            <span>Full Page</span>
          </Link>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Add Policy</span>
          </button>
        </div>
      </div>

      {/* ── UPCOMING RENEWAL REMINDER BANNER ── */}
      {summary && summary.renewal_due_count > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                {summary.renewal_due_count} Premium Renewal{summary.renewal_due_count > 1 ? "s" : ""} Due Soon (
                {formatINRShort(summary.renewal_due_premium)})
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Ensure timely payment before the grace period to avoid policy lapse or loss of health waiting credits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1 flex items-center gap-1">
            <Shield size={14} className="text-indigo-500" />
            <span>Total Life Cover</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
            <PrivacyMask>
              {summary ? formatINRShort(summary.total_life_cover) : "₹0"}
            </PrivacyMask>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Pure Term Protection
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1 flex items-center gap-1">
            <Heart size={14} className="text-rose-500" />
            <span>Total Health Cover</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            <PrivacyMask>
              {summary ? formatINRShort(summary.total_health_cover) : "₹0"}
            </PrivacyMask>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Hospitalization Floater
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            Annual Premium Outgo
          </div>
          <div className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
            <PrivacyMask>
              ₹{summary ? Math.round(summary.total_annual_premium).toLocaleString("en-IN") : "0"}
            </PrivacyMask>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Across {summary?.active_policies_count || 0} active policies
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            Safety Net Score
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck size={22} />
            <span>
              {summary && summary.total_life_cover >= 10000000 && summary.total_health_cover >= 1000000
                ? "Protected"
                : summary && (summary.total_life_cover > 0 || summary.total_health_cover > 0)
                ? "Moderate"
                : "Needs Cover"}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            10x-15x income benchmark
          </div>
        </Card>
      </div>

      {/* ── FILTER TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "ALL", label: `All Policies (${policies.length})` },
          { id: "TERM_LIFE", label: "Term Life Insurance" },
          { id: "HEALTH", label: "Health / Medical" },
          { id: "MOTOR", label: "Motor / Vehicle" },
          { id: "OTHERS", label: "ULIP & Endowment" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === f.id
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                : "bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── POLICIES LIST / ZERO STATE ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Loader2 size={32} className="animate-spin mb-3 text-indigo-600" />
          <p className="text-sm">Loading policy vault &amp; renewal dates...</p>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Shield size={32} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
              No Insurance Policies Added Yet
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              Securely track your family&apos;s term life cover, health insurance policies, and annual renewal alerts in one place.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>Add Your First Policy</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPolicies.map((item) => {
            const isDueSoon = item.is_renewal_due_soon;
            const isOverdue = item.is_overdue;
            const isTerm = item.policy_type === "TERM_LIFE";
            const isHealth = item.policy_type === "HEALTH" || item.policy_type === "CRITICAL_ILLNESS";

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-3xl p-5 shadow-xs hover:border-neutral-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {isTerm ? <Shield size={16} /> : isHealth ? <Heart size={16} /> : <FileText size={16} />}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                          {item.insurer_name}
                        </h3>
                        {item.policy_number && (
                          <span className="text-[10px] font-mono bg-neutral-100 dark:bg-white/10 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">
                            #{item.policy_number}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {item.policy_name}
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/20">
                          {item.policy_type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 dark:bg-white/5 text-neutral-500">
                          {item.profile_name}
                        </span>
                        {item.nominee_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 dark:bg-white/5 text-neutral-500 flex items-center gap-0.5">
                            <User size={10} /> Nominee: {item.nominee_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Renewal Badge & Actions */}
                    <div className="flex items-center gap-2">
                      {isOverdue ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
                          Overdue
                        </span>
                      ) : isDueSoon ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                          Due in {item.days_to_renewal}d
                        </span>
                      ) : item.days_to_renewal !== null && item.days_to_renewal !== undefined ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          Due in {item.days_to_renewal}d
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400">
                          Active
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                        title="Edit Policy"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Policy"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Policy Financial Details */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-neutral-100 dark:border-white/5">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Sum Assured (Cover)
                      </span>
                      <span className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                        <PrivacyMask>{formatINRShort(item.sum_assured)}</PrivacyMask>
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        ₹{item.sum_assured.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Annual Premium
                      </span>
                      <span className="text-base sm:text-xl font-bold text-neutral-900 dark:text-white tabular-nums">
                        <PrivacyMask>₹{Math.round(item.annual_premium).toLocaleString("en-IN")}</PrivacyMask>
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        per {item.premium_frequency.toLowerCase().replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Next Premium Due
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        {formatDatePretty(item.next_premium_due_date)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">
                        Policy Duration
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {formatDatePretty(item.policy_start_date)} – {formatDatePretty(item.policy_end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-neutral-400 italic pt-2.5 truncate">
                    Notes: {item.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PORTALED MODAL ── */}
      <InsurancePolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePolicy}
        initialData={
          editingItem
            ? {
                id: editingItem.id,
                policy_type: editingItem.policy_type,
                insurer_name: editingItem.insurer_name,
                policy_name: editingItem.policy_name,
                policy_number: editingItem.policy_number || undefined,
                sum_assured: editingItem.sum_assured,
                annual_premium: editingItem.annual_premium,
                premium_frequency: editingItem.premium_frequency,
                policy_start_date: editingItem.policy_start_date,
                policy_end_date: editingItem.policy_end_date || undefined,
                next_premium_due_date: editingItem.next_premium_due_date || undefined,
                nominee_name: editingItem.nominee_name || undefined,
                status: editingItem.status,
                notes: editingItem.notes || undefined,
                profile_id: editingItem.profile_id,
              }
            : null
        }
      />

      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-[#1a202c] text-neutral-900 dark:text-white px-4 py-2.5 rounded-2xl shadow-xl border border-neutral-200 dark:border-white/10 flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px]">
            ✓
          </span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
