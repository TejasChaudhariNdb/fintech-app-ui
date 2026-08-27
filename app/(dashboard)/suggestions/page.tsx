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
  Users,
  Megaphone,
  Zap,
} from "lucide-react";

export default function SuggestionsPage() {
  const [activeTab, setActiveTab] = useState<"suggestion" | "feedback">("suggestion");
  const [viewSegment, setViewSegment] = useState<"all" | "mine">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const LIMIT = 6;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<"suggestion" | "feedback">("suggestion");
  const [type, setType] = useState("feature");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        newItems = res;
        serverHasMore = res.length >= LIMIT;
      } else if (res && typeof res === "object") {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return { label: "Accepted", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", dot: "bg-blue-500" };
      case "in_progress":
        return { label: "In Progress", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", dot: "bg-amber-500" };
      case "resolved":
        return { label: "Action Taken", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" };
      case "not_feasible":
        return { label: "Shelved", cls: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20", dot: "bg-neutral-400" };
      default:
        return { label: "Under Review", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20", dot: "bg-violet-500" };
    }
  };

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
    <div className="pb-32 lg:pb-12 min-h-screen animate-fade-in text-neutral-900 dark:text-white">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 px-6 pt-10 pb-8">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/15">
                <Megaphone size={15} className="text-white" />
              </div>
              <span className="text-white/70 text-[11px] font-semibold uppercase tracking-widest">
                Community Board
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Suggestions &amp; Feedback
            </h1>
            <p className="text-white/65 text-sm mt-1.5 max-w-md leading-relaxed">
              Vote on ideas, report issues, and help shape Arthavi&apos;s roadmap.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setModalCategory("suggestion");
                setType("feature");
                setShowFormModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl border border-white/25 transition-all active:scale-95 cursor-pointer"
            >
              <Lightbulb size={13} />
              New Suggestion
            </button>
            <button
              onClick={() => {
                setModalCategory("feedback");
                setType("bug");
                setShowFormModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl border border-white/25 transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle size={13} />
              New Feedback
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* WhatsApp Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-white dark:bg-surface border border-[#25D366]/25 dark:border-[#25D366]/15 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#25D366]/10 shrink-0">
              <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  Arthavi Official WhatsApp Channel
                </p>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#25D366]/15 text-[#25D366] uppercase tracking-wide">
                  Live
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Get release updates &amp; feature announcements directly on WhatsApp.
              </p>
            </div>
          </div>
          <a
            href="https://whatsapp.com/channel/0029VbDJYC42ER6nb5bslr1K"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
          >
            <span>Join Channel</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Tabs + Filters */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex bg-neutral-100 dark:bg-white/[0.06] p-1 rounded-2xl border border-neutral-200 dark:border-white/5 flex-1 sm:flex-none">
            <button
              onClick={() => setActiveTab("suggestion")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "suggestion"
                  ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              }`}
            >
              <Lightbulb
                size={13}
                className={activeTab === "suggestion" ? "text-amber-500" : "text-neutral-400"}
              />
              Suggestions &amp; Ideas
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "feedback"
                  ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              }`}
            >
              <MessageCircle
                size={13}
                className={activeTab === "feedback" ? "text-pink-500" : "text-neutral-400"}
              />
              Feedback &amp; Issues
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <div className="flex bg-neutral-100 dark:bg-white/[0.06] p-0.5 rounded-xl border border-neutral-200 dark:border-white/5">
              {(["all", "mine"] as const).map((seg) => (
                <button
                  key={seg}
                  onClick={() => setViewSegment(seg)}
                  className={`px-3 py-1.5 rounded-[9px] font-semibold text-xs transition-all cursor-pointer ${
                    viewSegment === seg
                      ? "bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {seg === "all" ? (
                    <span className="flex items-center gap-1.5">
                      <Users size={11} />
                      All
                    </span>
                  ) : (
                    <span>Mine</span>
                  )}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-xl px-3 py-1.5 font-semibold outline-none text-xs cursor-pointer"
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

        {/* Feed */}
        <div className="mt-5 mb-6">
          {loading ? (
            <AppSkeleton />
          ) : filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const subCat = getSubCategoryBadge(item.type);
                const SubIcon = subCat.icon;
                const statusInfo = getStatusBadge(item.status);
                const commentsOpen = !!openComments[item.id];
                const commentsList = item.comments || [];

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-surface rounded-2xl border transition-all hover:shadow-md ${
                      item.is_mine
                        ? "border-primary-400/40 dark:border-primary-500/25 ring-1 ring-primary-500/10"
                        : "border-neutral-200 dark:border-white/[0.07]"
                    }`}
                  >
                    <div className="flex">
                      {/* Card Body */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${subCat.style}`}
                            >
                              <SubIcon size={11} />
                              {subCat.label}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.cls}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                              {statusInfo.label}
                            </span>
                            {item.is_mine && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                                📌 My Post
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-medium shrink-0">
                            {item.created_at}
                          </span>
                        </div>

                        <h3 className="mt-2.5 text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                          {item.title}
                        </h3>

                        {item.body && (
                          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed line-clamp-3">
                            {item.body}
                          </p>
                        )}

                        {item.action_taken && (
                          <div className="mt-3 p-3 rounded-xl bg-primary-50/80 dark:bg-primary-500/8 border border-primary-400/20 text-xs">
                            <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-bold mb-1">
                              <CheckCircle2 size={13} />
                              <span>Arthavi Team Response</span>
                            </div>
                            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                              &ldquo;{item.action_taken}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-white/5 flex items-center gap-3">
                          {/* Vote pill */}
                          <button
                            onClick={() => handleToggleAgree(item.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              item.has_agreed
                                ? "bg-primary-600 border-primary-600 text-white"
                                : "bg-neutral-50 dark:bg-white/[0.04] border-neutral-200 dark:border-white/[0.07] text-neutral-500 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400"
                            }`}
                          >
                            <ThumbsUp size={12} className={item.has_agreed ? "fill-white" : ""} />
                            <span>{item.has_agreed ? "Agreed" : "Agree"}</span>
                            {item.agree_count > 0 && (
                              <span className={`font-bold ${ item.has_agreed ? "text-white/80" : "text-neutral-400 dark:text-neutral-500" }`}>
                                {item.agree_count}
                              </span>
                            )}
                          </button>

                          {/* Replies toggle */}
                          <button
                            onClick={() => handleToggleComments(item.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                          >
                            <MessageSquare size={12} />
                            <span>
                              {commentsList.length > 0
                                ? `${commentsList.length} Repl${commentsList.length === 1 ? "y" : "ies"}`
                                : "Reply"}
                            </span>
                            {commentsOpen ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </button>
                        </div>

                        {commentsOpen && (
                          <div className="mt-3 space-y-2">
                            {commentsList.length > 0 ? (
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {commentsList.map((c: any) => (
                                  <div
                                    key={c.id}
                                    className={`p-3 rounded-xl text-xs ${
                                      c.is_admin
                                        ? "bg-primary-50/80 dark:bg-primary-500/10 border border-primary-500/20"
                                        : "bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-white/5"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        {c.is_admin && (
                                          <ShieldCheck
                                            size={12}
                                            className="text-primary-500 shrink-0"
                                          />
                                        )}
                                        <span
                                          className={
                                            c.is_admin
                                              ? "text-primary-600 dark:text-primary-400"
                                              : "text-neutral-800 dark:text-white"
                                          }
                                        >
                                          {c.is_admin
                                            ? "Arthavi Team"
                                            : c.is_mine
                                            ? "You"
                                            : "Community Member"}
                                        </span>
                                        {c.is_admin && (
                                          <span className="bg-primary-500 text-white text-[8px] px-1.5 py-0.5 rounded font-semibold tracking-wide">
                                            OFFICIAL
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-neutral-400">
                                        {c.created_at}
                                      </span>
                                    </div>
                                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                      {c.comment}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-neutral-400 italic py-2 text-center">
                                No replies yet — be the first!
                              </p>
                            )}

                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Write a reply..."
                                value={commentInputs[item.id] || ""}
                                onChange={(e) =>
                                  setCommentInputs((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddComment(item.id);
                                }}
                                className="flex-1 px-3 py-2 text-xs bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 rounded-xl outline-none focus:border-primary-500 text-neutral-900 dark:text-white transition-colors"
                              />
                              <button
                                onClick={() => handleAddComment(item.id)}
                                disabled={
                                  postingComment[item.id] ||
                                  !commentInputs[item.id]?.trim()
                                }
                                className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                              >
                                {postingComment[item.id] ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                ) : (
                                  <Send size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-3">
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
            <div className="text-center py-16 px-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.07] rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                {activeTab === "suggestion" ? (
                  <Lightbulb className="w-7 h-7 text-amber-500" />
                ) : (
                  <MessageCircle className="w-7 h-7 text-pink-500" />
                )}
              </div>
              <p className="text-base font-bold text-neutral-800 dark:text-white">
                {viewSegment === "mine" ? "Nothing posted yet" : "Be the first to share"}
              </p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1.5 leading-relaxed">
                {viewSegment === "mine"
                  ? "You haven't submitted anything in this category yet."
                  : `Start the conversation — post the first ${
                      activeTab === "suggestion" ? "suggestion" : "piece of feedback"
                    }!`}
              </p>
              <button
                onClick={() => {
                  setModalCategory(activeTab);
                  setType(activeTab === "suggestion" ? "feature" : "bug");
                  setShowFormModal(true);
                }}
                className="mt-5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus size={14} />
                {activeTab === "suggestion" ? "Submit a Suggestion" : "Give Feedback"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submission Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFormModal(false);
          }}
        >
          <div className="bg-white dark:bg-[#13161f] border-t sm:border border-neutral-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Sticky modal header */}
            <div className="sticky top-0 bg-white dark:bg-[#13161f] px-6 pt-5 pb-4 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    modalCategory === "suggestion" ? "bg-amber-500/10" : "bg-pink-500/10"
                  }`}
                >
                  {modalCategory === "suggestion" ? (
                    <Lightbulb size={18} className="text-amber-500" />
                  ) : (
                    <MessageCircle size={18} className="text-pink-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight">
                    {modalCategory === "suggestion" ? "Suggest a Feature" : "Submit Feedback"}
                  </h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {modalCategory === "suggestion"
                      ? "Share an idea or improvement"
                      : "Report an issue or share your experience"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 pt-4 space-y-5">
              {/* Category switcher */}
              <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-2xl border border-neutral-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setModalCategory("suggestion");
                    setType("feature");
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalCategory === "suggestion"
                      ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <Lightbulb size={12} className="text-amber-500" />
                  Feature Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalCategory("feedback");
                    setType("bug");
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalCategory === "feedback"
                      ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <MessageCircle size={12} className="text-pink-500" />
                  Feedback &amp; Issue
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Category type */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(modalCategory === "suggestion" ? suggestionTypes : feedbackTypes).map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = type === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setType(opt.id)}
                          className={`flex items-center gap-2 p-3 border rounded-xl transition-all text-left cursor-pointer ${
                            isSelected
                              ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-700 dark:text-primary-400 font-bold shadow-xs"
                              : "border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5"
                          }`}
                        >
                          <Icon
                            size={15}
                            className={`shrink-0 ${
                              isSelected
                                ? modalCategory === "suggestion"
                                  ? "text-amber-500"
                                  : "text-pink-500"
                                : "text-neutral-400"
                            }`}
                          />
                          <span className="text-xs">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      modalCategory === "suggestion"
                        ? "e.g., Add tax report export in CSV format..."
                        : "e.g., Portfolio sync not updating correctly..."
                    }
                    required
                    autoComplete="off"
                  />
                </div>

                {/* Details */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    Details{" "}
                    <span className="text-neutral-300 dark:text-neutral-600 font-normal normal-case tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      modalCategory === "suggestion"
                        ? "Describe your idea in detail — the more context, the better..."
                        : "Describe the issue, steps to reproduce, or your feedback..."
                    }
                    rows={4}
                    className="w-full px-3 py-2.5 text-sm bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 rounded-xl outline-none transition-all text-neutral-900 dark:text-white resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="px-5 py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer rounded-xl"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send size={13} />
                        <span>
                          {modalCategory === "suggestion"
                            ? "Submit Suggestion"
                            : "Submit Feedback"}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
