"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import AppSkeleton from "@/components/ui/AppSkeleton";
import { 
  Lightbulb, 
  MessageSquare, 
  CheckCircle2, 
  Send,
  MessageCircle,
  HelpCircle,
  Bug,
  ThumbsUp,
  Heart,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Filter,
  ExternalLink,
  TrendingUp,
} from "lucide-react";

export default function SuggestionsPage() {
  // Active Main Tab: "suggestion" | "feedback"
  const [activeTab, setActiveTab] = useState<"suggestion" | "feedback">("suggestion");
  
  // Segment filter: "all" | "mine"
  const [viewSegment, setViewSegment] = useState<"all" | "mine">("all");
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Load More Pagination State (Matches Activity / Transactions Page)
  const LIMIT = 6;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<"suggestion" | "feedback">("suggestion");
  const [type, setType] = useState("feature");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Comment expand state & inputs
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [postingComment, setPostingComment] = useState<Record<number, boolean>>({});

  const [toast, setToast] = useState({
    message: "",
    type: "info" as "success" | "error" | "loading" | "info",
    isVisible: false,
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "loading" = "success",
  ) => {
    setToast({ message, type, isVisible: true });
    if (type !== "loading") {
      setTimeout(
        () => setToast((prev) => ({ ...prev, isVisible: false })),
        3000,
      );
    }
  };

  const loadData = async (currentOffset: number = 0, isAppend: boolean = false) => {
    try {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await api.getPublicSuggestions(activeTab, LIMIT, currentOffset);
      
      let newItems: any[] = [];
      let serverHasMore = false;

      if (Array.isArray(res)) {
        // Support deployed server returning raw array [...]
        newItems = res;
        serverHasMore = res.length >= LIMIT;
      } else if (res && typeof res === "object") {
        // Support object { items: [...], has_more: boolean }
        newItems = Array.isArray(res.items) ? res.items : [];
        serverHasMore = !!res.has_more;
      }

      if (isAppend) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setHasMore(serverHasMore);
    } catch (err) {
      console.error(err);
      showToast("Failed to load community board", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setItems([]);
    loadData(0, false);

    if (activeTab === "suggestion") {
      setType("feature");
    } else {
      setType("appreciation");
    }
  }, [activeTab]);

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    loadData(nextOffset, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await api.submitFeedback({
        main_category: modalCategory,
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      setTitle("");
      setBody("");
      setShowFormModal(false);
      showToast(
        modalCategory === "feedback"
          ? "Feedback submitted successfully!"
          : "Suggestion submitted successfully!",
        "success"
      );
      
      if (activeTab !== modalCategory) {
        setActiveTab(modalCategory);
      } else {
        setOffset(0);
        loadData(0, false);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAgree = async (itemId: number) => {
    try {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const hasAgreed = !item.has_agreed;
            const agreeCount = hasAgreed ? item.agree_count + 1 : Math.max(0, item.agree_count - 1);
            return { ...item, has_agreed: hasAgreed, agree_count: agreeCount };
          }
          return item;
        })
      );
      await api.toggleFeedbackAgree(itemId);
    } catch (err) {
      console.error(err);
      showToast("Could not register vote", "error");
      loadData(0, false);
    }
  };

  const handleToggleComments = (itemId: number) => {
    setOpenComments((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleAddComment = async (itemId: number) => {
    const commentText = commentInputs[itemId]?.trim();
    if (!commentText) return;

    setPostingComment((prev) => ({ ...prev, [itemId]: true }));
    try {
      const newComment = await api.submitFeedbackComment(itemId, commentText);
      setCommentInputs((prev) => ({ ...prev, [itemId]: "" }));
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const updatedComments = [...(item.comments || []), newComment];
            return {
              ...item,
              comments: updatedComments,
              comments_count: updatedComments.length,
            };
          }
          return item;
        })
      );
      showToast("Reply added", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to add reply", "error");
    } finally {
      setPostingComment((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Helper formatting for status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return { label: "Accepted", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      case "in_progress":
        return { label: "In Progress", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "resolved":
        return { label: "Action Taken", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case "not_feasible":
        return { label: "Shelved", cls: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20" };
      default:
        return { label: "Under Review", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    }
  };

  // Sub-category badge styling & icons
  const getSubCategoryBadge = (subType: string) => {
    switch (subType) {
      case "appreciation":
        return { label: "Appreciation", style: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20", icon: Heart };
      case "criticism":
        return { label: "Area for Improvement", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: AlertTriangle };
      case "data_mismatch":
        return { label: "Data Mismatch", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", icon: AlertTriangle };
      case "delay":
        return { label: "Response Delay", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: Clock };
      case "bug":
        return { label: "Bug Report", style: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: Bug };
      case "ui_ux":
        return { label: "UI / UX Idea", style: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", icon: Sparkles };
      case "other":
        return { label: "Other", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", icon: HelpCircle };
      case "idea":
        return { label: "General Idea", style: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", icon: Lightbulb };
      case "feature":
      default:
        return { label: "Feature Request", style: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", icon: Lightbulb };
    }
  };

  // Category tags options for active tab
  const suggestionTypes = [
    { id: "feature", label: "Feature Request", icon: Lightbulb },
    { id: "ui_ux", label: "UI / UX Idea", icon: Sparkles },
    { id: "idea", label: "General Idea", icon: MessageSquare },
    { id: "other", label: "Other", icon: HelpCircle },
  ];

  const feedbackTypes = [
    { id: "appreciation", label: "Appreciation", icon: Heart },
    { id: "criticism", label: "Area for Improvement", icon: AlertTriangle },
    { id: "data_mismatch", label: "Data Mismatch", icon: AlertTriangle },
    { id: "delay", label: "Response Delay", icon: Clock },
    { id: "bug", label: "Bug Report", icon: Bug },
  ];

  const categoryOptions = activeTab === "suggestion" ? suggestionTypes : feedbackTypes;

  // Filter items based on segment view and status filter, placing user's own posts FIRST
  const filteredItems = items
    .filter((item) => {
      if (viewSegment === "mine" && !item.is_mine) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.is_mine !== b.is_mine) {
        return a.is_mine ? -1 : 1;
      }
      const aTime = a.created_at_iso ? new Date(a.created_at_iso).getTime() : 0;
      const bTime = b.created_at_iso ? new Date(b.created_at_iso).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="pb-32 lg:pb-12 min-h-screen animate-fade-in text-neutral-900 dark:text-white px-4 max-w-5xl mx-auto">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Top Title Bar */}
      <div className="pt-8 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            Suggestions &amp; Feedback
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Share feature requests, report issues, and help shape Arthavi.
          </p>
        </div>

        <button
          onClick={() => {
            setModalCategory(activeTab);
            setType(activeTab === "suggestion" ? "feature" : "bug");
            setShowFormModal(true);
          }}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer"
        >
          {activeTab === "suggestion" ? (
            <>
              <Lightbulb size={15} className="text-white" />
              <span>New Suggestion</span>
            </>
          ) : (
            <>
              <MessageCircle size={15} className="text-white" />
              <span>New Feedback</span>
            </>
          )}
        </button>
      </div>

      {/* Official WhatsApp Channel Banner */}
      <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/5 border border-[#25D366]/30 dark:border-[#25D366]/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] shrink-0">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Arthavi Official WhatsApp Channel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#25D366]/15 text-[#25D366] uppercase tracking-wider">
                Updates
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Follow our official WhatsApp channel for live release updates, feature announcements, and financial discussions.
            </p>
          </div>
        </div>

        <a
          href="https://whatsapp.com/channel/0029VbDJYC42ER6nb5bslr1K"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 active:scale-98 cursor-pointer"
        >
          <span>Join WhatsApp Channel</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Main Tabs (Suggestions vs Feedback) */}
      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-2xl border border-neutral-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab("suggestion")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "suggestion"
                ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            <Lightbulb size={14} className="text-amber-500" />
            <span>Suggestions &amp; Ideas</span>
          </button>

          <button
            onClick={() => setActiveTab("feedback")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "feedback"
                ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            <MessageCircle size={14} className="text-pink-500" />
            <span>Feedback &amp; Issues</span>
          </button>
        </div>

        {/* Secondary Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Segment: All vs Mine */}
          <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
            <button
              onClick={() => setViewSegment("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewSegment === "all"
                  ? "bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              All Submissions
            </button>
            <button
              onClick={() => setViewSegment("mine")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewSegment === "mine"
                  ? "bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              My Submissions
            </button>
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-xl px-3 py-1.5 font-medium outline-none text-xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="new">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Action Taken</option>
            <option value="not_feasible">Shelved</option>
          </select>
        </div>
      </div>

      {/* Main Community Feed Board */}
      <div className="mt-6">
        {loading ? (
          <AppSkeleton />
        ) : filteredItems.length > 0 ? (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const subCat = getSubCategoryBadge(item.type);
              const SubIcon = subCat.icon;
              const statusInfo = getStatusBadge(item.status);
              const commentsOpen = !!openComments[item.id];
              const commentsList = item.comments || [];

              return (
                <Card
                  key={item.id}
                  className={`p-5 bg-white dark:bg-surface border rounded-2xl flex flex-col gap-3.5 hover:shadow-md transition-shadow relative overflow-hidden ${
                    item.is_mine 
                      ? "border-primary-500/40 dark:border-primary-500/30 ring-1 ring-primary-500/10 shadow-sm shadow-primary-500/5" 
                      : "border-neutral-200 dark:border-white/5"
                  }`}
                >
                  {/* Top Bar: Badges & Privacy Author Header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {/* Sub-Category Pill */}
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${subCat.style}`}>
                        <SubIcon size={12} />
                        {subCat.label}
                      </span>

                      {/* Status Tag */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                      {item.is_mine ? (
                        <span className="text-primary-600 dark:text-primary-400 font-extrabold bg-primary-500/15 border border-primary-500/20 px-2.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-2xs">
                          📌 My Submission
                        </span>
                      ) : (
                        <span>Community Member</span>
                      )}
                      <span>•</span>
                      <span>{item.created_at}</span>
                    </div>
                  </div>

                  {/* Content Title & Body */}
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    {item.body && (
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {item.body}
                      </p>
                    )}
                  </div>

                  {/* Official Team Response Box */}
                  {item.action_taken && (
                    <div className="mt-1 p-3.5 rounded-xl bg-primary-50/60 dark:bg-primary-500/5 border border-primary-500/15 text-xs">
                      <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-bold mb-1">
                        <CheckCircle2 size={14} />
                        <span>Arthavi Team Response</span>
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                        &ldquo;{item.action_taken}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Card Actions Footer: Vote Agree & Reply Thread */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* I Agree Vote Button */}
                      <button
                        onClick={() => handleToggleAgree(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          item.has_agreed
                            ? "bg-primary-600 text-white border-primary-600 shadow-xs"
                            : "bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
                        }`}
                      >
                        <ThumbsUp size={14} className={item.has_agreed ? "fill-current" : ""} />
                        <span>I Agree</span>
                        {item.agree_count > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            item.has_agreed ? "bg-white/20 text-white" : "bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300"
                          }`}>
                            {item.agree_count}
                          </span>
                        )}
                      </button>

                      {/* Replies Toggle Button */}
                      <button
                        onClick={() => handleToggleComments(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition-all"
                      >
                        <MessageSquare size={14} />
                        <span>Replies</span>
                        <span className="bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 rounded-full text-[10px]">
                          {commentsList.length}
                        </span>
                        {commentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Comment Thread Drawer */}
                  {commentsOpen && (
                    <div className="mt-2 pt-3 border-t border-neutral-100 dark:border-white/5 space-y-3">
                      {commentsList.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {commentsList.map((c: any) => (
                            <div
                              key={c.id}
                              className={`p-3 rounded-xl text-xs ${
                                c.is_admin
                                  ? "bg-primary-50/70 dark:bg-primary-500/10 border border-primary-500/20"
                                  : "bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                  {c.is_admin && <ShieldCheck size={13} className="text-primary-500 shrink-0" />}
                                  <span className={c.is_admin ? "text-primary-600 dark:text-primary-400" : "text-neutral-800 dark:text-white"}>
                                    {c.is_admin ? "Arthavi Team" : c.is_mine ? "You" : "Community Member"}
                                  </span>
                                  {c.is_admin && (
                                    <span className="bg-primary-500 text-white text-[9px] px-1.5 py-0.2 rounded font-semibold">
                                      Official
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  {c.created_at}
                                </span>
                              </div>
                              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                                {c.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 italic text-center py-2">
                          No replies yet. Share your thoughts above!
                        </p>
                      )}

                      {/* Comment Input Box */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={commentInputs[item.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(item.id);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 rounded-xl outline-none focus:border-primary-500 text-neutral-900 dark:text-white"
                        />
                        <button
                          onClick={() => handleAddComment(item.id)}
                          disabled={postingComment[item.id] || !commentInputs[item.id]?.trim()}
                          className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                        >
                          {postingComment[item.id] ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Send size={12} />
                              <span>Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Load More Button (Identical to Transactions / Activity Page) */}
            {hasMore && (
              <div className="flex justify-center pt-4 pb-4">
                <Button
                  onClick={handleLoadMore}
                  variant="ghost"
                  disabled={loadingMore}
                  className="w-full py-3.5 text-primary-600 dark:text-primary-400 font-bold hover:bg-neutral-50 dark:hover:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl transition-colors flex justify-center items-center text-xs"
                >
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-neutral-500 dark:text-neutral-400 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-3xl space-y-4">
            <HelpCircle className="w-9 h-9 text-neutral-400 mx-auto" />
            <div>
              <p className="text-base font-bold text-neutral-800 dark:text-white">No submissions found</p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                {viewSegment === "mine"
                  ? "You haven't submitted any requests or feedback in this category yet."
                  : "Be the first to suggest a new feature or share feedback with us!"}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setModalCategory(activeTab);
                  setType(activeTab === "suggestion" ? "feature" : "bug");
                  setShowFormModal(true);
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                {activeTab === "suggestion" ? (
                  <>
                    <Lightbulb size={14} />
                    <span>Submit a Suggestion</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={14} />
                    <span>Give Feedback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Submission Modal (Clean & Professional) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#121621] border border-neutral-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                {modalCategory === "suggestion" ? (
                  <>
                    <Lightbulb size={20} className="text-amber-500" />
                    Suggest a Feature or Idea
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} className="text-pink-500" />
                    Submit Feedback or Issue
                  </>
                )}
              </h2>
            </div>

            {/* Modal Category Switcher */}
            <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-2xl border border-neutral-200 dark:border-white/5 mb-4">
              <button
                type="button"
                onClick={() => {
                  setModalCategory("suggestion");
                  setType("feature");
                }}
                className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  modalCategory === "suggestion"
                    ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                }`}
              >
                <Lightbulb size={13} className="text-amber-500" />
                <span>Feature Suggestion</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalCategory("feedback");
                  setType("bug");
                }}
                className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  modalCategory === "feedback"
                    ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                }`}
              >
                <MessageCircle size={13} className="text-pink-500" />
                <span>Feedback &amp; Issue</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                  Choose Category Tag
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(modalCategory === "suggestion" ? suggestionTypes : feedbackTypes).map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = type === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setType(opt.id)}
                        className={`flex items-center gap-2.5 p-3 border rounded-xl transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400 font-bold shadow-xs ring-1 ring-primary-500/20"
                            : "border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <Icon size={16} className={`shrink-0 ${modalCategory === "suggestion" ? "text-amber-500" : "text-pink-500"}`} />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    modalCategory === "suggestion"
                      ? "e.g., Add tax report export in CSV format..."
                      : "e.g., Issue with portfolio sync, or feedback..."
                  }
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                  Details / Notes (Optional)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    modalCategory === "suggestion"
                      ? "Describe your suggestion or feature idea in detail..."
                      : "Describe your feedback, issue, or steps to reproduce..."
                  }
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl outline-none transition-all text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{modalCategory === "suggestion" ? "Submit Suggestion" : "Submit Feedback"}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
