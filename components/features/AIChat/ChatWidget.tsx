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
  BarChart3,
  PieChart,
  AlertCircle,
  Layers,
  TrendingUp,
  Wallet,
  ChevronRight,
  ShieldCheck,
  Scale,
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
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null);
  const userName = userProfile?.full_name ? userProfile.full_name.split(" ")[0] : "Investor";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef("");

  const suggestionCards = [
    {
      title: "Your Portfolio Insights",
      icon: <BarChart3 size={18} className="text-purple-600 dark:text-purple-400" />,
      questions: [
        "Break down my portfolio by large/mid/small cap fund",
        "Help me understand my sector allocation?",
        "What’s missing in my overall asset allocation?",
        "How is my portfolio health and diversification?",
      ],
    },
    {
      title: "Market Right Now",
      icon: <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />,
      questions: [
        "What's the latest interest rate for PPF & NPS?",
        "What's today's gold and silver price in India?",
        "What are the best FD rates currently available across banks?",
        "What is the latest Nifty 50 and market trend update?",
      ],
    },
    {
      title: "Fund Overlap & Savings",
      icon: <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />,
      questions: [
        "Which mutual funds overlap in my portfolio?",
        "How much will I save by moving to Direct MFs from my Regular MFs?",
        "Am I over-exposed to any single AMC or stock?",
        "Which are my highest and lowest performing holdings?",
      ],
    },
    {
      title: "SIP & Wealth Strategy",
      icon: <Wallet size={18} className="text-indigo-600 dark:text-indigo-400" />,
      questions: [
        "Suggest a monthly SIP allocation plan for me",
        "How should I allocate ₹25,000 monthly across equity & debt?",
        "How to rebalance my portfolio to reduce downside risk?",
        "Recommend strong flexi cap and large cap funds",
      ],
    },
    {
      title: "Tax Rules & Optimization",
      icon: <Scale size={18} className="text-rose-600 dark:text-rose-400" />,
      questions: [
        "How are my equity and debt mutual funds taxed?",
        "How does the ₹1.25 Lakh LTCG exemption apply to my funds?",
        "Are my ELSS tax-saving funds ready to withdraw?",
        "How to do tax-loss harvesting to save capital gains tax?",
      ],
    },
  ];

  const handleCarouselScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const cardWidth = carouselRef.current.firstElementChild
        ? (carouselRef.current.firstElementChild as HTMLElement).offsetWidth + 14
        : 300;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveCardIndex(Math.min(suggestionCards.length - 1, Math.max(0, index)));
    }
  };

  const scrollToCard = (index: number) => {
    setActiveCardIndex(index);
    if (carouselRef.current && carouselRef.current.children[index]) {
      (carouselRef.current.children[index] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }
  };

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
    api
      .getUserProfile()
      .then((data) => {
        if (data) setUserProfile(data);
      })
      .catch((err) => {
        console.error("Failed to load user profile in chat", err);
      });
  }, []);

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
    setMessages([]);
    setCurrentSessionId(undefined);
    setShowHistory(false);
    setActiveCardIndex(0);
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
    <>
      {/* Main Full-Screen Chat Modal / Window */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-xs lg:p-3 xl:p-4 animate-in fade-in duration-200 font-sans">
          <div className="w-full h-full flex flex-col bg-white dark:bg-[#0B0E14] lg:rounded-2xl lg:border lg:border-neutral-200/80 dark:lg:border-white/10 shadow-2xl overflow-hidden max-w-7xl mx-auto">
            {/* Modern Header */}
            <div className="px-4 py-3 border-b border-neutral-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0E1118]/90 backdrop-blur-md pt-safe-top shrink-0">
              {showHistory ? (
                /* History Header */
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowHistory(false)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer border border-neutral-200/60 dark:border-white/5"
                      title="Back to active conversation"
                      aria-label="Back to Chat">
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
                      title="Start a new conversation"
                      aria-label="New Chat">
                      <Plus size={14} />
                      <span>New Chat</span>
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-neutral-400 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                      title="Close chat"
                      aria-label="Close Chat">
                      <X size={18} />
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
                      title="Start a new conversation"
                      aria-label="New Chat">
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
                      title="View chat history"
                      aria-label="Chat History">
                      <History size={16} />
                    </button>

                    {/* Support Button */}
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer"
                      title="Contact customer support"
                      aria-label="Support">
                      <Headphones size={16} />
                    </button>

                    {/* Divider */}
                    <div className="h-4 w-px bg-neutral-200 dark:bg-white/10 mx-0.5" />

                    {/* Close Button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-neutral-400 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                      title="Close chat window"
                      aria-label="Close Chat">
                      <X size={18} />
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
              <ChatMessage
                key={idx}
                role={m.role}
                content={m.content}
                onSelectFollowUp={sendMessage}
              />
            ))}
            {messages.length === 0 && !isResponding && !streamingText && (
              <div className="flex flex-col items-center justify-center py-4 sm:py-8 px-2 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
                {/* Hero Greeting */}
                <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-primary-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 mb-3 animate-in zoom-in-75 duration-300">
                    <Sparkles size={22} className="animate-pulse" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    Hello {userName && userName !== "Investor" ? `${userName}, ` : ""}how can I help you today?
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md">
                    Choose a quick question below or ask anything about your mutual funds, stocks, and investments.
                  </p>
                </div>

                {/* Cards Container: Swipeable carousel on mobile, spacious multi-column layout on desktop */}
                <div className="w-full">
                  <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className="flex lg:grid lg:grid-cols-3 xl:grid-cols-5 gap-3.5 overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory px-2 pb-2 no-scrollbar scroll-smooth">
                    {suggestionCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="w-[84vw] max-w-[340px] lg:w-auto shrink-0 snap-center rounded-3xl p-4 sm:p-5 border border-purple-200/70 dark:border-purple-500/20 bg-gradient-to-b from-purple-50/70 via-indigo-50/25 to-white dark:from-purple-950/20 dark:via-[#131722] dark:to-[#0B0E14] shadow-xs flex flex-col justify-between">
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center gap-2.5 mb-3.5">
                            <div className="p-2 rounded-xl bg-white dark:bg-black/30 shadow-2xs border border-purple-100 dark:border-white/5 shrink-0">
                              {card.icon}
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm text-purple-950 dark:text-purple-200 tracking-tight">
                              {card.title}
                            </h3>
                          </div>

                          {/* Questions Pill List */}
                          <div className="flex flex-col gap-2">
                            {card.questions.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => sendMessage(q)}
                                className="w-full text-left py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl bg-white/95 dark:bg-[#151923] hover:bg-purple-50 dark:hover:bg-purple-500/10 border border-purple-100/70 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/30 text-xs sm:text-[13px] font-medium text-neutral-800 dark:text-neutral-200 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer leading-snug group">
                                <span className="group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                                  {q}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dot Indicators for Mobile Carousel */}
                  <div className="flex lg:hidden items-center justify-center gap-1.5 mt-4">
                    {suggestionCards.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => scrollToCard(i)}
                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                          activeCardIndex === i
                            ? "w-5 h-1.5 bg-purple-600 dark:bg-purple-400"
                            : "w-1.5 h-1.5 bg-neutral-200 dark:bg-white/20 hover:bg-neutral-300 dark:hover:bg-white/40"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
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
        </div>
      )}

      {/* Floating Trigger Button (Shown only when chat is closed to avoid mobile & desktop overlap) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-24 lg:bottom-8 right-4 sm:right-6 z-40 group h-12 shadow-[0_8px_30px_rgb(0,0,0,0.18)] flex items-center gap-2.5 transition-all duration-300 border border-white/20 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 hover:shadow-primary-500/30 text-white rounded-2xl px-5 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xl font-sans">
          <div className="relative">
            <Sparkles size={20} className="relative z-10" />
            <div className="absolute inset-0 bg-white/30 blur-lg animate-pulse" />
          </div>
          <span className="font-bold text-xs tracking-tight">Ask AI</span>
        </button>
      )}

      <ContactSupportModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </>
  );
}
