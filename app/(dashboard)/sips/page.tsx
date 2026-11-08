"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Repeat,
  Plus,
  RefreshCw,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Check,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  Wallet,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ReceiptText,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import PrivacyMask from "@/components/ui/PrivacyMask";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { useProfile } from "@/context/ProfileContext";
import { api, SIPRecord, SIPSummary } from "@/lib/api";

type FilterTab = "ALL" | "ACTIVE" | "STOPPED";
type FrequencyFilter = "ALL" | "MONTHLY" | "DAILY";

export default function MySIPsPage() {
  const router = useRouter();
  const { activeProfileId, activeProfile, profiles } = useProfile();

  const [sips, setSips] = useState<SIPRecord[]>([]);
  const [summary, setSummary] = useState<SIPSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [freqFilter, setFreqFilter] = useState<FrequencyFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const getRelationForProfile = (profileId?: number | null) => {
    if (!profileId) return "OTHER";
    const found = profiles.find((p) => p.id === profileId);
    return found ? found.relation : "OTHER";
  };

  const getProfileName = (sip: SIPRecord) => {
    if (sip.profile_name) return sip.profile_name;
    if (sip.profile_id) {
      const found = profiles.find((p) => p.id === sip.profile_id);
      if (found) return found.name;
    }
    return "Self";
  };

  const getProfileBadgeColor = (relation: string) => {
    const rel = (relation || "").toUpperCase();
    if (rel === "SELF") return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (rel === "MOTHER") return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    if (rel === "FATHER") return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    if (rel === "SPOUSE") return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    if (rel === "CHILD") return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
  };

  // Modal States
  const [selectedSipForReminder, setSelectedSipForReminder] = useState<SIPRecord | null>(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSip, setEditingSip] = useState<SIPRecord | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    scheme_name: "",
    folio_number: "",
    amc: "",
    amount: "",
    sip_day: 5,
    status: "ACTIVE",
    reminder_days_before: 3,
    notify_push: true,
    notify_in_app: true,
    notify_email: false,
    notes: "",
  });

  // Reminder Modal form state
  const [reminderConfig, setReminderConfig] = useState({
    reminder_enabled: true,
    reminder_days_before: 3,
    notify_push: true,
    notify_in_app: true,
    notify_email: false,
  });

  // Toast State
  const [toast, setToast] = useState({
    message: "",
    type: "info" as "success" | "error" | "loading" | "info",
    isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "loading" = "success") => {
    setToast({ message, type, isVisible: true });
    if (type !== "loading") {
      setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3500);
    }
  };

  const loadData = async (isSync = false) => {
    try {
      if (isSync) setSyncing(true);
      else setLoading(true);

      const sipsRes = await api.getSIPs(activeProfileId);
      const summaryRes = await api.getSIPSummary(activeProfileId);

      // Deduplicate by profile_id + scheme_name + folio_number
      const uniqueMap = new Map<string, SIPRecord>();
      (sipsRes || []).forEach((s: SIPRecord) => {
        const key = `${s.profile_id || "default"}_${s.scheme_name.trim().toLowerCase()}_${(s.folio_number || "").trim().toLowerCase()}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, s);
        }
      });

      setSips(Array.from(uniqueMap.values()));
      setSummary(summaryRes || null);
    } catch (err: any) {
      console.error("Failed to load SIPs:", err);
      showToast(err.message || "Failed to load SIP details", "error");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProfileId]);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      showToast("Syncing recurring SIPs from CAS transactions...", "loading");
      await api.syncSIPs(activeProfileId);
      await loadData(true);
      showToast("Synced and cleaned up SIPs successfully!", "success");
    } catch (err: any) {
      console.error("Failed to sync SIPs:", err);
      showToast(err.message || "Failed to sync SIPs", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (sip: SIPRecord) => {
    try {
      const updated = await api.toggleSIPStatus(sip.id);
      setSips((prev) => prev.map((s) => (s.id === sip.id ? updated : s)));
      const updatedSummary = await api.getSIPSummary(activeProfileId);
      setSummary(updatedSummary);
      showToast(
        `SIP marked as ${updated.status === "ACTIVE" ? "Active" : "Stopped"}`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  const handleDeleteSip = async (id: number) => {
    if (!confirm("Are you sure you want to remove this SIP entry?")) return;
    try {
      await api.deleteSIP(id);
      setSips((prev) => prev.filter((s) => s.id !== id));
      const updatedSummary = await api.getSIPSummary(activeProfileId);
      setSummary(updatedSummary);
      showToast("SIP removed successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete SIP", "error");
    }
  };

  const openReminderModal = (sip: SIPRecord) => {
    setSelectedSipForReminder(sip);
    setReminderConfig({
      reminder_enabled: sip.reminder_enabled,
      reminder_days_before: sip.reminder_days_before ?? 3,
      notify_push: sip.notify_push,
      notify_in_app: sip.notify_in_app,
      notify_email: sip.notify_email,
    });
  };

  const saveReminderSettings = async () => {
    if (!selectedSipForReminder) return;
    try {
      const updated = await api.updateSIP(selectedSipForReminder.id, reminderConfig);
      setSips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSipForReminder(null);
      showToast("Reminder preferences updated!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update reminder settings", "error");
    }
  };

  const openAddEditModal = (sip?: SIPRecord) => {
    if (sip) {
      setEditingSip(sip);
      setFormData({
        scheme_name: sip.scheme_name,
        folio_number: sip.folio_number || "",
        amc: sip.amc || "",
        amount: sip.amount.toString(),
        sip_day: sip.sip_day || 5,
        status: sip.status,
        reminder_days_before: sip.reminder_days_before ?? 3,
        notify_push: sip.notify_push,
        notify_in_app: sip.notify_in_app,
        notify_email: sip.notify_email,
        notes: sip.notes || "",
      });
    } else {
      setEditingSip(null);
      setFormData({
        scheme_name: "",
        folio_number: "",
        amc: "",
        amount: "",
        sip_day: 5,
        status: "ACTIVE",
        reminder_days_before: 3,
        notify_push: true,
        notify_in_app: true,
        notify_email: false,
        notes: "",
      });
    }
    setShowAddEditModal(true);
  };

  const handleSaveAddEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (!formData.scheme_name.trim()) {
      showToast("Please enter a scheme name", "error");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid monthly amount", "error");
      return;
    }

    try {
      if (editingSip) {
        const updated = await api.updateSIP(editingSip.id, {
          scheme_name: formData.scheme_name,
          folio_number: formData.folio_number || null,
          amc: formData.amc || null,
          amount: amt,
          sip_day: Number(formData.sip_day),
          status: formData.status,
          reminder_days_before: Number(formData.reminder_days_before),
          notify_push: formData.notify_push,
          notify_in_app: formData.notify_in_app,
          notify_email: formData.notify_email,
          notes: formData.notes,
        });
        setSips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast("SIP updated successfully!", "success");
      } else {
        const created = await api.createSIP({
          scheme_name: formData.scheme_name,
          folio_number: formData.folio_number || null,
          amc: formData.amc || null,
          amount: amt,
          sip_day: Number(formData.sip_day),
          profile_id: activeProfileId && activeProfileId !== "all" ? Number(activeProfileId) : null,
          reminder_enabled: true,
          reminder_days_before: Number(formData.reminder_days_before),
          notify_push: formData.notify_push,
          notify_in_app: formData.notify_in_app,
          notify_email: formData.notify_email,
          notes: formData.notes,
        });
        setSips((prev) => [created, ...prev]);
        showToast("New SIP added successfully!", "success");
      }
      const updatedSummary = await api.getSIPSummary(activeProfileId);
      setSummary(updatedSummary);
      setShowAddEditModal(false);
    } catch (err: any) {
      showToast(err.message || "Failed to save SIP", "error");
    }
  };

  // Filtered SIP list
  const filteredSips = useMemo(() => {
    return sips.filter((s) => {
      // Status filter
      if (activeTab === "ACTIVE" && s.status !== "ACTIVE") return false;
      if (activeTab === "STOPPED" && s.status === "ACTIVE") return false;

      // Frequency filter (PhonePe style)
      if (freqFilter === "MONTHLY" && s.frequency === "DAILY") return false;
      if (freqFilter === "DAILY" && s.frequency !== "DAILY") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchScheme = s.scheme_name.toLowerCase().includes(q);
        const matchFolio = (s.folio_number || "").toLowerCase().includes(q);
        const matchAmc = (s.amc || "").toLowerCase().includes(q);
        const matchProfile = (s.profile_name || "").toLowerCase().includes(q);
        return matchScheme || matchFolio || matchAmc || matchProfile;
      }
      return true;
    });
  }, [sips, activeTab, freqFilter, searchQuery]);

  const activeCount = useMemo(() => sips.filter((s) => s.status === "ACTIVE").length, [sips]);
  const stoppedCount = useMemo(() => sips.filter((s) => s.status !== "ACTIVE").length, [sips]);
  const monthlyCount = useMemo(() => sips.filter((s) => s.frequency !== "DAILY").length, [sips]);
  const dailyCount = useMemo(() => sips.filter((s) => s.frequency === "DAILY").length, [sips]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6 px-3 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Top Header */}
      <div className="border-b border-neutral-200 dark:border-white/10 pb-5 space-y-3">
        {/* Top Row: Title, Profile Badge, Subtitle & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  My SIPs
                </h1>
                {/* Profile context badge */}
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                  activeProfileId === "all"
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20"
                    : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    activeProfileId === "all" ? "bg-primary-500"
                    : activeProfile?.relation?.toUpperCase() === "SELF" ? "bg-blue-500"
                    : activeProfile?.relation?.toUpperCase() === "MOTHER" ? "bg-purple-500"
                    : activeProfile?.relation?.toUpperCase() === "FATHER" ? "bg-green-500"
                    : activeProfile?.relation?.toUpperCase() === "SPOUSE" ? "bg-orange-500"
                    : activeProfile?.relation?.toUpperCase() === "CHILD" ? "bg-yellow-500"
                    : "bg-indigo-500"
                  }`} />
                  <span>{activeProfileId === "all" ? "All Family" : activeProfile?.name}</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                Track ongoing & stopped mutual fund SIPs, scheduled deduction dates, and reminders
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncing}
              className="rounded-xl flex items-center gap-1.5 border-neutral-200 dark:border-white/10 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-primary-500" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync from CAS"}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => openAddEditModal()}
              className="rounded-xl flex items-center gap-1.5 shadow-sm text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add SIP</span>
            </Button>
          </div>
        </div>

        {/* Bottom Row: Clean Segmented Switcher */}
        <div className="flex items-center p-1 bg-neutral-100/90 dark:bg-neutral-800/60 rounded-xl w-full sm:max-w-xs border border-neutral-200/50 dark:border-white/5">
          <button
            onClick={() => router.push("/activity")}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm transition-all cursor-default"
          >
            <CalendarClock className="w-3.5 h-3.5 text-primary-500" />
            <span>My SIPs</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-neutral-200/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Monthly Commitment */}
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30 dark:from-[#0E121A] dark:to-emerald-950/20 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Monthly Commitment
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Repeat className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>{formatCurrency(summary?.total_active_monthly_commitment || 0)}</PrivacyMask>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {summary?.active_sips_count || 0} active ongoing {summary?.active_sips_count === 1 ? "SIP" : "SIPs"}
              </p>
            </div>
          </Card>

          {/* Card 2: Next Upcoming SIP */}
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-[#0E121A] dark:to-blue-950/20 border-blue-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Next Upcoming Debit
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              {summary?.next_upcoming_sip ? (
                <>
                  <div className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
                    <PrivacyMask>{formatCurrency(summary.next_upcoming_sip.amount)}</PrivacyMask>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                    {formatDate(summary.next_upcoming_sip.next_sip_date)}
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {summary.next_upcoming_sip.days_left === 0
                        ? "Today"
                        : summary.next_upcoming_sip.days_left === 1
                        ? "Tomorrow"
                        : `in ${summary.next_upcoming_sip.days_left}d`}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <div className="text-base sm:text-xl font-semibold text-neutral-400 dark:text-neutral-500">
                    None scheduled
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">No active debits queued</p>
                </>
              )}
            </div>
          </Card>

          {/* Card 3: Total Invested via SIP */}
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-white to-purple-50/30 dark:from-[#0E121A] dark:to-purple-950/20 border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Total Invested via SIP
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
                <PrivacyMask>{formatCurrency(summary?.total_invested_so_far || 0)}</PrivacyMask>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Recorded historical installments
              </p>
            </div>
          </Card>

          {/* Card 4: Stopped / Completed SIPs */}
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-white to-neutral-50/50 dark:from-[#0E121A] dark:to-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Stopped / Inactive
              </span>
              <div className="p-2 rounded-xl bg-neutral-500/10 text-neutral-600 dark:text-neutral-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
                {summary?.stopped_sips_count || 0}
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Completed or paused mandates
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-white/5 rounded-xl border border-neutral-200/60 dark:border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "ALL"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            All ({sips.length})
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "ACTIVE"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab("STOPPED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "STOPPED"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            Stopped ({stoppedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scheme, AMC, member, or folio..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Frequency Filter Pills (PhonePe Style) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
        <button
          onClick={() => setFreqFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            freqFilter === "ALL"
              ? "bg-primary-600 text-white border-primary-600 shadow-sm"
              : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          All SIPs ({sips.length})
        </button>
        <button
          onClick={() => setFreqFilter("MONTHLY")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            freqFilter === "MONTHLY"
              ? "bg-primary-600 text-white border-primary-600 shadow-sm"
              : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          Monthly SIPs ({monthlyCount})
        </button>
        <button
          onClick={() => setFreqFilter("DAILY")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            freqFilter === "DAILY"
              ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
              : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          Daily SIPs ({dailyCount})
        </button>
      </div>

      {/* SIP Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-neutral-200/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredSips.length === 0 ? (
        /* Zero State */
        <Card className="p-8 sm:p-12 text-center border-dashed">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
            {searchQuery
              ? "No SIPs matching your search"
              : activeTab === "ACTIVE"
              ? "No active ongoing SIPs found"
              : activeTab === "STOPPED"
              ? "No stopped SIPs found"
              : "No SIPs detected yet"}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mt-1.5">
            {searchQuery
              ? "Try searching for a different keyword or scheme name."
              : "Sync from your uploaded CAS statements to automatically discover your SIPs, or manually add your recurring mutual fund investments."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncing}
              className="rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-primary-500" : ""}`} />
              <span>Sync from CAS</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openAddEditModal()}
              className="rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom SIP</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredSips.map((sip) => {
            const isActive = sip.status === "ACTIVE";
            const progressPercent =
              sip.total_installments && sip.total_installments > 0
                ? Math.min(100, Math.round((sip.completed_installments / sip.total_installments) * 100))
                : null;

            return (
              <Card
                key={sip.id}
                className={`p-4 sm:p-5 transition-all duration-200 border ${
                  isActive
                    ? "border-neutral-200 dark:border-white/10 hover:border-emerald-500/40 hover:shadow-md"
                    : "border-neutral-200/60 dark:border-white/5 opacity-85 hover:opacity-100 bg-neutral-50/50 dark:bg-white/[0.01]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Scheme Info & Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Family Member Profile Badge (shown in All Family mode) */}
                      {activeProfileId === "all" && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getProfileBadgeColor(
                            sip.profile_relation || getRelationForProfile(sip.profile_id)
                          )}`}
                        >
                          <span>{getProfileName(sip)}</span>
                        </span>
                      )}

                      {/* AMC Pill */}
                      {sip.amc && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">
                          {sip.amc}
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                          }`}
                        />
                        {isActive ? "Active / Running" : "Stopped / Inactive"}
                      </span>

                      {/* Frequency Badge */}
                      {sip.frequency === "DAILY" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          Daily SIP
                        </span>
                      )}
                      {sip.frequency === "WEEKLY" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Weekly SIP
                        </span>
                      )}

                      {/* Auto-detected pill */}
                      {sip.is_auto_detected && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Auto-detected
                        </span>
                      )}

                      {sip.folio_number && (
                        <span className="text-[11px] text-neutral-400">
                          Folio: <span className="font-mono">{sip.folio_number}</span>
                        </span>
                      )}
                    </div>

                    {/* Scheme Name */}
                    <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white leading-snug">
                      {sip.scheme_name}
                    </h3>

                    {/* Schedule & Timing Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                      {sip.frequency === "DAILY" ? (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-cyan-500" />
                          Debits <strong className="text-neutral-800 dark:text-neutral-200">every day</strong>
                        </span>
                      ) : sip.frequency === "WEEKLY" ? (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />
                          Debits <strong className="text-neutral-800 dark:text-neutral-200">weekly</strong>
                        </span>
                      ) : sip.sip_day ? (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-neutral-400" />
                          Debits on <strong className="text-neutral-800 dark:text-neutral-200">{sip.sip_day}th</strong> of every month
                        </span>
                      ) : null}

                      {isActive && sip.next_sip_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          Next debit: <strong className="text-blue-600 dark:text-blue-400">{formatDate(sip.next_sip_date)}</strong>
                        </span>
                      )}

                      {sip.last_sip_date && (
                        <span>
                          Last debit: {formatDate(sip.last_sip_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle / Right: Financials, Progress & Action Bar */}
                  <div className="flex flex-col sm:flex-row lg:flex-col sm:items-end justify-between gap-3 pt-3 lg:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-white/5">
                    {/* Amount & Installments */}
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-xl font-bold text-neutral-900 dark:text-white">
                        <PrivacyMask>{formatCurrency(sip.amount)}</PrivacyMask>
                        <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-1">
                          {sip.frequency === "DAILY" ? "/ day" : sip.frequency === "WEEKLY" ? "/ week" : "/ month"}
                        </span>
                      </div>
                      {sip.frequency === "DAILY" && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          ≈ <PrivacyMask>{formatCurrency(sip.amount * 30)}</PrivacyMask> / month (30 days)
                        </div>
                      )}

                      {/* Installment count */}
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {sip.total_installments ? (
                          <span>
                            Installment <strong>{sip.completed_installments}</strong> of <strong>{sip.total_installments}</strong>
                          </span>
                        ) : (
                          <span>
                            <strong>{sip.completed_installments}</strong> installments recorded
                          </span>
                        )}
                        {sip.total_invested > 0 && (
                          <span className="ml-1.5 text-neutral-400">
                            (Total: <PrivacyMask>{formatCurrency(sip.total_invested)}</PrivacyMask>)
                          </span>
                        )}
                      </div>

                      {/* Progress Bar if total is known */}
                      {progressPercent !== null && (
                        <div className="mt-1.5 w-full sm:w-48">
                          <div className="h-1.5 w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-neutral-400 text-right mt-0.5">
                            {progressPercent}% completed
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                      {/* Reminder Button */}
                      <button
                        onClick={() => openReminderModal(sip)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
                          sip.reminder_enabled
                            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300/50 hover:bg-amber-100"
                            : "bg-neutral-100 dark:bg-white/5 text-neutral-500 border-neutral-200/60 dark:border-white/10 hover:text-neutral-700"
                        }`}
                        title="Configure reminders"
                      >
                        {sip.reminder_enabled ? (
                          <>
                            <Bell className="w-3.5 h-3.5 text-amber-500" />
                            <span>Remind {sip.reminder_days_before}d before</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Reminders Off</span>
                          </>
                        )}
                      </button>

                      {/* Status Toggle Button */}
                      <button
                        onClick={() => handleToggleStatus(sip)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200/60 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 border border-neutral-200/60 dark:border-white/10 transition-colors flex items-center gap-1"
                        title={isActive ? "Mark SIP as Stopped" : "Resume / Activate SIP"}
                      >
                        {isActive ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Resume</span>
                          </>
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openAddEditModal(sip)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                        title="Edit SIP details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteSip(sip.id)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        title="Delete SIP entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reminder Configuration Modal */}
      {selectedSipForReminder && (
        <Modal
          isOpen={!!selectedSipForReminder}
          onClose={() => setSelectedSipForReminder(null)}
          title="SIP Reminder & Alert Settings"
        >
          <div className="space-y-5">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Scheme</p>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
                {selectedSipForReminder.scheme_name}
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                Amount: <strong className="inline-block"><PrivacyMask>{formatCurrency(selectedSipForReminder.amount)}</PrivacyMask></strong> / month • Next debit:{" "}
                <strong>{formatDate(selectedSipForReminder.next_sip_date)}</strong>
              </p>
            </div>

            {/* Toggle Enable/Disable */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                  Enable Upcoming Debit Alert
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Receive a proactive notification before your bank debit occurs.
                </p>
              </div>
              <input
                type="checkbox"
                checked={reminderConfig.reminder_enabled}
                onChange={(e) =>
                  setReminderConfig((prev) => ({ ...prev, reminder_enabled: e.target.checked }))
                }
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>

            {reminderConfig.reminder_enabled && (
              <>
                {/* Advance Days Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    When to remind me:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { days: 0, label: "On the Day" },
                      { days: 1, label: "1 Day Before" },
                      { days: 3, label: "3 Days Before" },
                      { days: 5, label: "5 Days Before" },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() =>
                          setReminderConfig((prev) => ({ ...prev, reminder_days_before: opt.days }))
                        }
                        className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                          reminderConfig.reminder_days_before === opt.days
                            ? "border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-semibold"
                            : "border-neutral-200 dark:border-white/10 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Channels */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Delivery Channels:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200/80 dark:border-white/10 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={reminderConfig.notify_in_app}
                        onChange={(e) =>
                          setReminderConfig((prev) => ({ ...prev, notify_in_app: e.target.checked }))
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-white">
                          In-App Notification Bell
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Shows up in your dashboard notification feed
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200/80 dark:border-white/10 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={reminderConfig.notify_push}
                        onChange={(e) =>
                          setReminderConfig((prev) => ({ ...prev, notify_push: e.target.checked }))
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-white">
                          Push Notification (FCM)
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Direct pop-up alert to your phone / Android PWA
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200/80 dark:border-white/10 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={reminderConfig.notify_email}
                        onChange={(e) =>
                          setReminderConfig((prev) => ({ ...prev, notify_email: e.target.checked }))
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-white">
                          Email Notification
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Send a reminder email to your registered address
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSipForReminder(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveReminderSettings}
                className="rounded-xl"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit SIP Modal */}
      {showAddEditModal && (
        <Modal
          isOpen={showAddEditModal}
          onClose={() => setShowAddEditModal(false)}
          title={editingSip ? "Edit SIP Details" : "Add Mutual Fund SIP"}
        >
          <form onSubmit={handleSaveAddEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Mutual Fund Scheme Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Parag Parikh Flexi Cap Fund - Direct Plan"
                value={formData.scheme_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, scheme_name: e.target.value }))}
                required
                className="rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Monthly SIP Amount (₹) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  min="1"
                  step="any"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  SIP Debit Day (1 - 31) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={formData.sip_day}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sip_day: Number(e.target.value) }))}
                  required
                  min="1"
                  max="31"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Folio Number (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 1234567/89"
                  value={formData.folio_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, folio_number: e.target.value }))}
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  AMC / Fund House (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. HDFC, Nippon, Invesco"
                  value={formData.amc}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amc: e.target.value }))}
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                SIP Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="ACTIVE">Active / Ongoing</option>
                <option value="STOPPED">Stopped / Inactive</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Notes (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Linked to HDFC Salary Account"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddEditModal(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="rounded-xl"
              >
                {editingSip ? "Update SIP" : "Add SIP"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
