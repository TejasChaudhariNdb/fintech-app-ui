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
  Filter
} from "lucide-react";

export default function SuggestionsPage() {
  // Active Main Tab: "suggestion" | "feedback"
  const [activeTab, setActiveTab] = useState<"suggestion" | "feedback">("suggestion");
  
  // Segment filter: "mine" | "all"
  const [viewSegment, setViewSegment] = useState<"mine" | "all">("mine");
  
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
        main_category: activeTab,
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      setTitle("");
      setBody("");
      setShowFormModal(false);
      showToast(
        activeTab === "feedback" 
          ? "Feedback posted successfully!" 
          : "Suggestion posted successfully!",
        "success"
      );
      setOffset(0);
      loadData(0, false);
    } catch (err) {
      console.error(err);
      showToast("Failed to submit post", "error");
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
        return { label: "Criticism", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: AlertTriangle };
      case "data_mismatch":
        return { label: "Data Mismatch", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", icon: AlertTriangle };
      case "delay":
        return { label: "Response Delay", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: Clock };
      case "bug":
        return { label: "Bug Report", style: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: Bug };
      case "ui_ux":
        return { label: "UI / UX Idea", style: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", icon: Sparkles };
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
  ];

  const feedbackTypes = [
    { id: "appreciation", label: "Appreciation", icon: Heart },
    { id: "criticism", label: "Criticism", icon: AlertTriangle },
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
            Community Hub
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Share feature suggestions, report issues, or provide feedback to the Arthavi team.
          </p>
        </div>

        <button
          onClick={() => setShowFormModal(true)}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md shadow-primary-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>New {activeTab === "suggestion" ? "Suggestion" : "Feedback"}</span>
        </button>
      </div>

      {/* Main Tabs (Suggestions vs Feedback) */}
      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-2xl border border-neutral-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab("suggestion")}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === "suggestion"
                ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            <Lightbulb size={15} className="text-yellow-500" />
            <span>Suggestions</span>
          </button>

          <button
            onClick={() => setActiveTab("feedback")}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === "feedback"
                ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            <MessageCircle size={15} className="text-pink-500" />
            <span>Feedback & Experience</span>
          </button>
        </div>

        {/* Secondary Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Segment: Mine vs All */}
          <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
            <button
              onClick={() => setViewSegment("mine")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewSegment === "mine"
                  ? "bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              My Posts
            </button>
            <button
              onClick={() => setViewSegment("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewSegment === "all"
                  ? "bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              All Community Posts
            </button>
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-xl px-3 py-1.5 font-medium outline-none text-xs"
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
                          📌 My Post
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
          <div className="text-center py-16 text-neutral-500 dark:text-neutral-400 bg-white dark:bg-surface border border-neutral-200 dark:border-white/5 rounded-3xl space-y-3">
            <HelpCircle className="w-9 h-9 text-neutral-400 mx-auto" />
            <p className="text-base font-bold text-neutral-800 dark:text-white">No posts found</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {viewSegment === "mine"
                ? "You haven't created any posts in this category yet."
                : "Be the first to submit a post in this channel!"}
            </p>
            <button
              onClick={() => setShowFormModal(true)}
              className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create Post</span>
            </button>
          </div>
        )}
      </div>

      {/* Form Submission Modal (Clean & Professional) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#121621] border border-neutral-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
              {activeTab === "suggestion" ? (
                <>
                  <Lightbulb size={20} className="text-yellow-500" />
                  New Suggestion
                </>
              ) : (
                <>
                  <MessageCircle size={20} className="text-pink-500" />
                  New Feedback & Experience
                </>
              )}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
              Posting to channel: <strong className="text-neutral-800 dark:text-neutral-200 capitalize">{activeTab}</strong>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Tag Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Category Tag
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoryOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = type === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setType(opt.id)}
                        className={`flex items-center gap-2 p-2 border rounded-xl transition-all text-left ${
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400 font-bold shadow-xs"
                            : "border-neutral-200 dark:border-white/5 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="text-xs truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  activeTab === "suggestion"
                    ? "e.g., Add tax report export in CSV format..."
                    : "e.g., Appreciation for the new statement parser..."
                }
                required
                autoComplete="off"
              />

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Details / Context (Optional)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe your request or experience in detail..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl outline-none transition-all text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Post</span>
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
