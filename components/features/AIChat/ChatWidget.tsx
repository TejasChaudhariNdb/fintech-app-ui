"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Square,
  Sparkles,
  Bot,
  Plus,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  History,
  Headphones,
  Search,
  Settings2,
  Check,
  BarChart2,
  PieChart,
  AlertCircle,
  Layers,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import ChatMessage from "./ChatMessage";
import ContactSupportModal from "../ContactSupportModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
}

interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatResult {
  response: string;
  session_id: number;
  session_title: string;
}

export default function ChatWidget() {
  const { activeProfileId } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Arthavi AI. I can analyze your portfolio, find investment insights, and answer market questions. How can I help you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [liveLoadingStage, setLiveLoadingStage] = useState<{
    stage: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [streamingText, setStreamingText] = useState("");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(
    undefined,
  );
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef("");

  // Auto-resize textarea height smoothly as user types (from 44px up to 180px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(44, nextHeight)}px`;
    }
  }, [inputValue]);

  // Focus input automatically on open (desktop/tablet)
  useEffect(() => {
    if (isOpen && !showHistory) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          textareaRef.current?.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showHistory]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !showHistory && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, showHistory]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadSessions = async () => {
    try {
      const list = await api.getSessions();
      setSessions(list);
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(historySearch.toLowerCase()),
  );

  const handleLoadSession = async (id: number) => {
    setIsLoadingSession(true);
    try {
      const history = await api.getSessionMessages(id);
      setMessages(
        history.map((h: SessionMessage) => ({
          role: h.role,
          content: h.content,
        })),
      );
      setCurrentSessionId(id);
      setShowHistory(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! I'm Arthavi AI. I can analyze your portfolio, find investment insights, and answer market questions. How can I help you today?",
      },
    ]);
    setCurrentSessionId(undefined);
    setShowHistory(false);
  };

  const handleStopResponse = () => {
    abortControllerRef.current?.abort();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isResponding || isLoadingSession) return;

    const userMsg = text.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsResponding(true);
    setLiveLoadingStage(null);
    setStreamingText("");
    streamingTextRef.current = "";
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let res: AIChatResult = {
        response: "",
        session_id: currentSessionId || 0,
        session_title: "",
      };
      let usedFallback = false;
      try {
        res = await api.chatWithAIStream(
          userMsg,
          currentSessionId,
          {
            onStatus: (status) => {
              setLiveLoadingStage({
                stage: status.stage,
                title: status.title,
                subtitle: status.subtitle,
              });
            },
            onToken: (tokenText) =>
              setStreamingText((prev) => {
                const next = prev + (tokenText || "");
                streamingTextRef.current = next;
                return next;
              }),
          },
          {
            signal: abortController.signal,
          },
          activeProfileId
        );
      } catch (streamErr) {
        if (streamErr instanceof Error && streamErr.name === "AbortError") {
          throw streamErr;
        }
        usedFallback = true;
        console.warn(
          "AI stream failed. Falling back to normal response.",
          streamErr,
        );
        res = (await api.chatWithAI(userMsg, currentSessionId, activeProfileId)) as AIChatResult;
        streamingTextRef.current = "";
        setStreamingText("");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.response },
        ]);
      }

      if (!usedFallback) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.response },
        ]);
        setStreamingText("");
      }

      if (res.session_id) {
        if (res.session_id !== currentSessionId) {
          setCurrentSessionId(res.session_id);
        }
        loadSessions();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error(err);
      setStreamingText("");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please check your network or try again.",
        },
      ]);
    } finally {
      setIsResponding(false);
      setLiveLoadingStage(null);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter is pressed without Shift, submit the form
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-10 right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
      {/* Main Chat Modal / Window */}
      <div
        className={`pointer-events-auto bg-white dark:bg-[#0B0E14] border border-neutral-200 dark:border-white/10 shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right
        fixed inset-0 lg:inset-auto lg:relative lg:w-[480px] xl:w-[520px] lg:h-[700px] lg:max-h-[82vh] lg:rounded-2xl lg:mb-4 z-50 lg:z-auto
        ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-8 pointer-events-none"
        }`}>
        {/* Modern Header */}
        <div className="px-4 py-3 border-b border-neutral-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0E1118]/90 backdrop-blur-md lg:rounded-t-2xl pt-safe-top transition-all">
          {showHistory ? (
            /* History Header */
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer border border-neutral-200/60 dark:border-white/5"
                  title="Back to Active Chat">
                  <ChevronLeft size={16} />
                  <span>Back to Chat</span>
                </button>
                <span className="text-xs font-bold text-neutral-900 dark:text-white hidden sm:inline-block">
                  Chat History
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs shadow-primary-500/25 transition-all active:scale-95 cursor-pointer"
                  title="Start New Chat">
                  <Plus size={14} />
                  <span>New Chat</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                  title="Close"
                  aria-label="Close Chat">
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Active Chat Header */
            <div className="flex items-center justify-between w-full">
              {/* Left: Branding & Assistant Info */}
              <div className="flex items-center gap-2.5">
                <div className="relative h-8 w-8 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/20 p-1 flex items-center justify-center shrink-0">
                  <Image
                    src="/logo.webp"
                    alt="Arthavi Logo"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-sm tracking-tight leading-none">
                    Arthavi AI
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 leading-none">
                      Online
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Grouped Actions */}
              <div className="flex items-center gap-1">
                {/* New Chat Button */}
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/5 hover:bg-primary-500/10 hover:text-primary-600 dark:hover:bg-primary-500/20 dark:hover:text-primary-400 text-neutral-700 dark:text-neutral-200 transition-all text-xs font-semibold active:scale-95 cursor-pointer border border-neutral-200/50 dark:border-white/5 shadow-2xs"
                  title="Start New Chat">
                  <Plus size={14} />
                  <span className="text-[11px]">New</span>
                </button>

                {/* History Button */}
                <button
                  onClick={() => {
                    setShowHistory(true);
                    loadSessions();
                  }}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer"
                  title="Chat History">
                  <History size={16} />
                </button>

                {/* Support Button */}
                <button
                  onClick={() => setShowContactModal(true)}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer"
                  title="Support"
                  aria-label="Support">
                  <Headphones size={16} />
                </button>

                {/* Divider */}
                <div className="h-4 w-px bg-neutral-200 dark:bg-white/10 mx-0.5" />

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-neutral-400 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                  title="Close"
                  aria-label="Close Chat">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* History Overlay */}
          {showHistory && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-[#0B0E14] overflow-y-auto">
              <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 p-3.5 backdrop-blur-md dark:border-white/10 dark:bg-[#0B0E14]/95">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-white/5 dark:text-neutral-400">
                    {sessions.length} conversation{sessions.length === 1 ? "" : "s"}
                  </span>
                  {currentSessionId && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                      Current chat active
                    </span>
                  )}
                </div>

                <div className="relative mt-2.5">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search past conversations..."
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1 px-2 pb-4">
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleLoadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group ${
                      currentSessionId === session.id
                        ? "bg-primary-50 dark:bg-primary-900/10"
                        : "hover:bg-neutral-50 dark:hover:bg-white/5"
                    }`}>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        currentSessionId === session.id
                          ? "bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300"
                          : "bg-neutral-100 text-neutral-400 dark:bg-white/5 dark:text-neutral-500 group-hover:bg-white dark:group-hover:bg-white/10"
                      }`}>
                      <MessageSquare size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            currentSessionId === session.id
                              ? "text-primary-700 dark:text-primary-400"
                              : "text-neutral-800 dark:text-neutral-200"
                          }`}>
                          {session.title || "Untitled Conversation"}
                        </h4>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {new Date(session.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        Last active session
                      </p>
                    </div>
                  </button>
                ))}
                {filteredSessions.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 dark:bg-white/5 mb-4 text-neutral-300 dark:text-neutral-600">
                      <Search size={24} />
                    </div>
                    <h5 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {sessions.length === 0 ? "No conversations yet" : "No results found"}
                    </h5>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {sessions.length === 0 
                        ? "Start a new chat to see your history here." 
                        : "Try a different search term or start a new chat."}
                    </p>
                    {sessions.length > 0 && (
                      <button
                        onClick={() => setHistorySearch("")}
                        className="mt-4 text-xs font-bold text-primary-500 hover:text-primary-600">
                        Clear Search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            {messages.map((m, idx) => (
              <ChatMessage key={idx} role={m.role} content={m.content} />
            ))}
            {messages.length === 1 && !isResponding && !streamingText && (
              <div className="flex flex-col gap-4 mt-8 px-2 sm:px-4 sm:ml-[40px]">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-white/5" />
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    Quick Portfolio Insights
                  </p>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-white/5" />
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { 
                      text: "Analyze my portfolio", 
                      icon: <BarChart2 size={16} />, 
                      color: "text-blue-500",
                      bg: "bg-blue-50 dark:bg-blue-500/5",
                      border: "border-blue-100 dark:border-blue-500/20"
                    },
                    { 
                      text: "Are my investments well diversified?", 
                      icon: <PieChart size={16} />, 
                      color: "text-purple-500",
                      bg: "bg-purple-50 dark:bg-purple-500/5",
                      border: "border-purple-100 dark:border-purple-500/20"
                    },
                    { 
                      text: "What’s missing in my portfolio?", 
                      icon: <AlertCircle size={16} />, 
                      color: "text-amber-500",
                      bg: "bg-amber-50 dark:bg-amber-500/5",
                      border: "border-amber-100 dark:border-amber-500/20"
                    },
                    { 
                      text: "Which funds overlap in my portfolio?", 
                      icon: <Layers size={16} />, 
                      color: "text-emerald-500",
                      bg: "bg-emerald-50 dark:bg-emerald-500/5",
                      border: "border-emerald-100 dark:border-emerald-500/20"
                    },
                    { 
                      text: "Recommend strong large cap funds", 
                      icon: <TrendingUp size={16} />, 
                      color: "text-indigo-500",
                      bg: "bg-indigo-50 dark:bg-indigo-500/5",
                      border: "border-indigo-100 dark:border-indigo-500/20"
                    },
                    { 
                      text: "Suggest a SIP plan for me", 
                      icon: <Wallet size={16} />, 
                      color: "text-rose-500",
                      bg: "bg-rose-50 dark:bg-rose-500/5",
                      border: "border-rose-100 dark:border-rose-500/20"
                    },
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q.text)}
                      className={`group text-left text-xs sm:text-sm ${q.bg} border ${q.border} hover:border-primary-500/50 hover:bg-white dark:hover:bg-primary-500/10 rounded-2xl p-3 sm:p-4 text-neutral-800 dark:text-neutral-200 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-3 active:scale-[0.98]`}>
                      <div className={`p-2 rounded-xl bg-white dark:bg-black/20 shadow-sm group-hover:scale-110 transition-transform ${q.color}`}>
                        {q.icon}
                      </div>
                      <span className="font-semibold flex-1 leading-tight">{q.text}</span>
                      <ChevronLeft size={14} className="rotate-180 opacity-40 group-hover:opacity-100 transition-all text-primary-500 group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isResponding && !streamingText && (
              <div className="flex items-start gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-3.5 dark:border-white/10 dark:bg-[#131722]/80 animate-in fade-in duration-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-sm">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      {liveLoadingStage?.title ?? "Analyzing your request..."}
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    {liveLoadingStage?.subtitle ?? "Preparing response"}
                  </p>
                </div>
              </div>
            )}
            {streamingText && (
              <ChatMessage role="assistant" content={streamingText} />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        {!showHistory && (
          <div className="p-4 border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0B0E14] lg:rounded-b-2xl pb-safe-bottom">
            <form
              onSubmit={handleSubmit}
              className="relative flex flex-col bg-neutral-50 dark:bg-[#131722]/90 rounded-2xl border border-neutral-200/80 dark:border-white/10 focus-within:border-primary-500/60 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:bg-white dark:focus-within:bg-[#0E1118] shadow-xs hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-200">
              
              {/* Multi-line auto-expanding textarea */}
              <div className="relative flex items-center w-full px-3.5 pt-3 pb-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your portfolio, stocks, mutual funds..."
                  className="w-full bg-transparent outline-none text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none max-h-44 min-h-[44px] leading-relaxed"
                />
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-transparent">
                {/* Left: Hint */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 select-none">
                    Shift + ↵ for new line
                  </span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {isResponding ? (
                    <button
                      type="button"
                      onClick={handleStopResponse}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer animate-pulse"
                      title="Stop Generating">
                      <Square size={12} fill="currentColor" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoadingSession}
                      className={`p-2 rounded-xl text-white transition-all duration-200 flex items-center justify-center active:scale-95 ${
                        inputValue.trim() && !isLoadingSession
                          ? "bg-primary-600 hover:bg-primary-500 shadow-md shadow-primary-500/25 cursor-pointer"
                          : "bg-neutral-200 dark:bg-white/10 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-50"
                      }`}
                      title="Send message (Enter)"
                      aria-label="Send message">
                      <Send size={14} className={inputValue.trim() ? "translate-x-px -translate-y-px" : ""} />
                    </button>
                  )}
                </div>
              </div>
            </form>

            {isResponding && (
              <div className="mt-2 flex items-center gap-2 justify-center">
                <span className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" />
                </span>
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
                  AI is thinking
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
                className="w-full flex items-center gap-1.5 text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors p-1">
                <span className="text-[10px] truncate flex-1 text-left">
                  Free plan responses can be a bit slower during busy times.
                </span>
                <ChevronDown
                  size={12}
                  className={`shrink-0 transition-transform duration-200 ${disclaimerExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {disclaimerExpanded && (
                <div className="mt-2 p-3 bg-neutral-50 dark:bg-white/5 rounded-lg">
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    AI suggestions are for informational purposes only — not
                    SEBI-registered advice.
                  </p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed mt-2">
                    AI-generated content is for informational purposes only and
                    does not constitute SEBI-registered investment advice. Past
                    performance is not indicative of future results. Please do
                    your own research and consult a certified financial advisor
                    before making any investment decisions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto group h-12 w-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-2.5 transition-all duration-500 border border-white/20 dark:border-white/10 backdrop-blur-xl ${
          isOpen
            ? "bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl px-5"
            : "bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 hover:shadow-primary-500/25 text-white rounded-xl px-5 hover:scale-105 active:scale-95"
        }`}>
        {isOpen ? (
          <>
            <X size={18} className="transition-transform group-hover:rotate-90 duration-300" />
            <span className="font-bold text-xs tracking-tight">Dismiss</span>
          </>
        ) : (
          <>
            <div className="relative">
              <Sparkles size={20} className="relative z-10" />
              <div className="absolute inset-0 bg-white/30 blur-lg animate-pulse" />
            </div>
            <span className="font-bold text-xs tracking-tight">Ask AI</span>
          </>
        )}
      </button>

      <ContactSupportModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
}
