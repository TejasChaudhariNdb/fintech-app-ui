"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import AppSkeleton from "@/components/ui/AppSkeleton";
import {
  FEEDBACK_STATUSES,
  getFeedbackStatusMeta,
  normalizeFeedbackStatus,
} from "@/lib/feedbackStatus";
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
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Maximize2,
  Trash2,
  UploadCloud,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(filename?: string, mimeType?: string) {
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (!filename) return false;
  const ext = filename.split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext || "");
}

function getAttachmentFullUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL}${url}`;
}

export default function SuggestionsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"suggestion" | "feedback">("suggestion");
  const [viewSegment, setViewSegment] = useState<"all" | "mine">("mine");
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; filename?: string } | null>(null);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showFormModal || lightboxImage) {
      const scrollY = window.scrollY;
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [showFormModal, lightboxImage]);

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

  useEffect(() => {
    if (selectedFile && isImageFile(selectedFile.name, selectedFile.type)) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, [selectedFile]);

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    loadData(nextOffset, true);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      showToast("Attachment size exceeds 15MB limit", "error");
      return;
    }
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        file: selectedFile,
      });
      setTitle("");
      setBody("");
      handleRemoveFile();
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
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to submit", "error");
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
      if (statusFilter !== "all") {
        const itemStatus = normalizeFeedbackStatus(item.status);
        if (itemStatus !== statusFilter) return false;
      }
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
              {FEEDBACK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
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
                const statusInfo = getFeedbackStatusMeta(item.status);
                const commentsOpen = !!openComments[item.id];
                const commentsList = item.comments || [];

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-surface rounded-2xl border transition-all hover:shadow-md ${
                      item.is_mine
                        ? "border-primary-400/40 dark:border-primary-500/25 ring-1 ring-primary-500/10"
                        : "border-neutral-200/80 dark:border-white/5"
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
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.badgeCls}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotCls}`} />
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

                        {item.attachment_url && (
                          <div className="mt-3">
                            {isImageFile(item.attachment_name, item.attachment_type) ? (
                              <div className="inline-block max-w-full">
                                <div
                                  onClick={() =>
                                    setLightboxImage({
                                      url: getAttachmentFullUrl(item.attachment_url),
                                      title: item.title,
                                      filename: item.attachment_name,
                                    })
                                  }
                                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] max-w-xs"
                                >
                                  <img
                                    src={getAttachmentFullUrl(item.attachment_url)}
                                    alt={item.attachment_name || "Attachment"}
                                    className="max-h-44 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                                    <Maximize2 size={14} />
                                    <span>Preview</span>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                                  <ImageIcon size={11} className="text-primary-500" />
                                  <span className="truncate max-w-[200px]">{item.attachment_name || "Image"}</span>
                                  {item.attachment_size && (
                                    <span>• {formatBytes(item.attachment_size)}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <a
                                href={getAttachmentFullUrl(item.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={item.attachment_name || true}
                                className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-primary-500/40 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition group cursor-pointer"
                              >
                                <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500">
                                  <FileText size={14} />
                                </div>
                                <div className="flex flex-col text-left min-w-0">
                                  <span className="truncate max-w-[180px] sm:max-w-[240px] text-xs font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                    {item.attachment_name || "Attached Document"}
                                  </span>
                                  {item.attachment_size && (
                                    <span className="text-[10px] text-neutral-400 font-normal">
                                      {formatBytes(item.attachment_size)}
                                    </span>
                                  )}
                                </div>
                                <Download size={14} className="text-neutral-400 group-hover:text-primary-500 shrink-0 ml-1" />
                              </a>
                            )}
                          </div>
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

      {/* Submission Modal via Portal */}
      {mounted &&
        showFormModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none overscroll-none animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleRemoveFile();
                setShowFormModal(false);
              }
            }}
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                handleFileSelect(file);
              }
            }}
          >
            <div
              className="bg-white dark:bg-[#13161f] border-t sm:border border-neutral-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl relative flex flex-col max-h-[85vh] sm:max-h-[85vh] overflow-hidden touch-pan-y overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile top handle bar */}
              <div className="sm:hidden pt-2.5 pb-0 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20" />
              </div>

              {/* Sticky Modal Header */}
              <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-[#13161f]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-xl shrink-0 ${
                      modalCategory === "suggestion" ? "bg-amber-500/10 text-amber-500" : "bg-pink-500/10 text-pink-500"
                    }`}
                  >
                    {modalCategory === "suggestion" ? (
                      <Lightbulb size={16} />
                    ) : (
                      <MessageCircle size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white leading-tight truncate">
                      {modalCategory === "suggestion" ? "Suggest a Feature" : "Submit Feedback"}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5 truncate">
                      {modalCategory === "suggestion"
                        ? "Share an idea or improvement"
                        : "Report an issue or share feedback"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveFile();
                    setShowFormModal(false);
                  }}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto px-5 py-3.5 sm:px-6 sm:py-4 space-y-3.5 touch-pan-y overscroll-contain">
                {/* Category switcher */}
                <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl border border-neutral-200/80 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setModalCategory("suggestion");
                      setType("feature");
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      modalCategory === "suggestion"
                        ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-xs"
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
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      modalCategory === "feedback"
                        ? "bg-white dark:bg-surface text-primary-600 dark:text-primary-400 shadow-xs"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    <MessageCircle size={12} className="text-pink-500" />
                    Feedback &amp; Issue
                  </button>
                </div>

                <form id="suggestion-form" onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Category type */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(modalCategory === "suggestion" ? suggestionTypes : feedbackTypes).map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = type === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setType(opt.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-2 border rounded-xl transition-all text-left cursor-pointer ${
                              isSelected
                                ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-700 dark:text-primary-400 font-bold shadow-xs"
                                : "border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <Icon
                              size={13}
                              className={`shrink-0 ${
                                isSelected
                                  ? modalCategory === "suggestion"
                                    ? "text-amber-500"
                                    : "text-pink-500"
                                  : "text-neutral-400"
                              }`}
                            />
                            <span className="text-xs truncate">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
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
                      className="text-xs sm:text-sm py-2"
                    />
                  </div>

                  {/* Details */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
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
                          ? "Describe your idea in detail — context, mockups, ideas..."
                          : "Describe the issue, steps to reproduce, or suggestions..."
                      }
                      rows={3}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 rounded-xl outline-none transition-all text-neutral-900 dark:text-white resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                    />
                  </div>

                  {/* File / Document Attachment (Box-Type Dropzone) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Attachment <span className="text-neutral-300 dark:text-neutral-600 font-normal normal-case">(optional)</span>
                      </label>
                      <span className="text-[9px] text-neutral-400">Max 15MB</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.csv,.xls,.xlsx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-primary-50/60 dark:bg-primary-500/10 border border-primary-500/30">
                        <div className="flex items-center gap-3 min-w-0">
                          {filePreviewUrl ? (
                            <img
                              src={filePreviewUrl}
                              alt="Preview"
                              className="w-11 h-11 object-cover rounded-xl border border-primary-500/30 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-600 dark:text-primary-400 shrink-0">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[200px] sm:max-w-[260px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {formatBytes(selectedFile.size)} • Attached
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer shrink-0"
                          title="Remove attachment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileSelect(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`group border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                          isDragging
                            ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 scale-[1.01]"
                            : "border-neutral-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-primary-500/50 hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-white/5 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 transition-colors mb-2">
                          <UploadCloud size={22} />
                        </div>
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          <span className="text-primary-600 dark:text-primary-400 font-bold underline underline-offset-2">Click to browse</span> or drag and drop
                        </p>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                          PDF, PNG, JPG, CSV, DOC (or paste screenshot)
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Sticky Modal Footer (Always Visible at Bottom) */}
              <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-neutral-100 dark:border-white/5 bg-neutral-50/80 dark:bg-[#13161f]/95 backdrop-blur-sm flex items-center justify-end gap-2 shrink-0 z-10 pb-safe">
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveFile();
                    setShowFormModal(false);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  form="suggestion-form"
                  disabled={submitting || !title.trim()}
                  className="px-4 py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer rounded-xl font-bold shadow-xs active:scale-95"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send size={12} />
                      <span>
                        {modalCategory === "suggestion"
                          ? "Submit Suggestion"
                          : "Submit Feedback"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Lightbox Modal for Attachment Previews via Portal */}
      {mounted &&
        lightboxImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 touch-none overscroll-contain animate-fade-in"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center touch-pan-y overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 text-white px-1">
                <span className="text-sm font-bold truncate max-w-[70vw]">
                  {lightboxImage.filename || lightboxImage.title}
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={lightboxImage.url}
                    download={lightboxImage.filename || "screenshot.png"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
