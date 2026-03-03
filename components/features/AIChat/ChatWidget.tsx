"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  Clock,
  Plus,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
  Phone,
} from "lucide-react";
import { api } from "@/lib/api";
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

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Arthavi AI. Ask questions about your portfolio and investing concepts. for any human click on support button",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);

  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(
    undefined,
  );
  const [showHistory, setShowHistory] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiLoadingStages = [
    {
      title: "Understanding your question",
      subtitle: "Interpreting your goal and context",
    },
    {
      title: "Reviewing your portfolio context",
      subtitle: "Matching available data with your query",
    },
    {
      title: "Checking market context (if needed)",
      subtitle: "Looking for supporting signals",
    },
    {
      title: "Drafting your response",
      subtitle: "Building a clear, useful answer",
    },
  ];

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
    if (!isResponding) {
      setLoadingStageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStageIndex((prev) =>
        Math.min(prev + 1, aiLoadingStages.length - 1),
      );
    }, 1700);

    return () => clearInterval(interval);
  }, [isResponding, aiLoadingStages.length]);

  const loadSessions = async () => {
    try {
      const list = await api.getSessions();
      setSessions(list);
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  };

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
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! I'm Arthavi AI. Ask questions about your portfolio and investing concepts.for any human help contact/whatsapp +91 9158110065",
      },
    ]);
    setCurrentSessionId(undefined);
    setShowHistory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isResponding || isLoadingSession) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsResponding(true);

    try {
      const res = await api.chatWithAI(userMsg, currentSessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);

      if (res.session_id) {
        if (res.session_id !== currentSessionId) {
          setCurrentSessionId(res.session_id);
        }
        // Refresh list to update titles if new or changed
        loadSessions();
      }
    } catch (err) {
      console.error(err);
      let errorMessage =
        "Sorry, I'm having trouble connecting right now. Please try again later.";

      if (err instanceof Error && err.message.includes("403")) {
        errorMessage =
          "You have reached your free chat limit 🔒. Refer a friend in Profile to unlock unlimited access!";
      } else if (
        err instanceof Error &&
        err.message.includes("Free chat limit reached")
      ) {
        errorMessage =
          "You have reached your free chat limit 🔒. Refer a friend in Profile to unlock unlimited access!";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="fixed bottom-24 lg:bottom-10 right-6 z-100 flex flex-col items-end pointer-events-none font-sans">
      {/* Chat Window */}
      <div
        className={`pointer-events-auto bg-white dark:bg-[#0B0E14] border border-neutral-200 dark:border-white/10 shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right
        fixed inset-0 lg:inset-auto lg:relative lg:w-[400px] lg:h-[600px] lg:max-h-[70vh] lg:rounded-2xl lg:mb-4 z-200 lg:z-auto
        ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-8 pointer-events-none"
        }`}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-md lg:rounded-t-2xl pt-safe-top">
          {/* Left: History Button or Back */}
          <div className="flex items-center gap-2">
            {showHistory ? (
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-600 dark:text-neutral-400">
                <ChevronLeft size={18} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowHistory(true);
                  loadSessions();
                }}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-600 dark:text-neutral-400"
                title="History">
                <Clock size={18} />
              </button>
            )}

            <div
              className={`h-8 w-8 relative flex items-center justify-center transition-all ${
                showHistory ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}>
              <Image
                src="/logo.webp"
                alt="Arthavi Logo"
                fill
                className="object-contain drop-shadow-sm"
              />
            </div>
            <div className={`${showHistory ? "ml-0" : ""}`}>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">
                {showHistory ? "Chat History" : "Arthavi AI"}
              </h3>
            </div>
          </div>

          {/* Right: New Chat & Close */}
          <div className="flex items-center gap-1">
            {!showHistory && (
              <button
                onClick={handleNewChat}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors"
                title="New Chat">
                <Plus size={20} />
              </button>
            )}
            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors text-xs font-medium"
              title="Contact Support">
              <Phone size={14} />
              <span>Support</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* History Overlay */}
          {showHistory && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-[#0B0E14] p-4 overflow-y-auto">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleLoadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3
                                    ${
                                      currentSessionId === session.id
                                        ? "bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-500/20"
                                        : "bg-neutral-50 dark:bg-white/5 border-transparent hover:border-neutral-200 dark:hover:border-white/10"
                                    }`}>
                    <MessageSquare
                      size={16}
                      className={
                        currentSessionId === session.id
                          ? "text-primary-500"
                          : "text-neutral-400"
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-medium truncate ${
                          currentSessionId === session.id
                            ? "text-primary-700 dark:text-primary-400"
                            : "text-neutral-700 dark:text-neutral-200"
                        }`}>
                        {session.title}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center py-10 text-neutral-400 text-sm">
                    <p>No history yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-black/20 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}
            {isResponding && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <Bot
                    size={16}
                    className="text-neutral-500 dark:text-neutral-300"
                  />
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-none px-4 py-3 border border-neutral-200 dark:border-white/10 max-w-[85%] shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={14}
                      className="text-primary-500 animate-pulse"
                    />
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                      {aiLoadingStages[loadingStageIndex].title}
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    {aiLoadingStages[loadingStageIndex].subtitle}
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {aiLoadingStages.map((stage, idx) => {
                      const isDone = idx < loadingStageIndex;
                      const isCurrent = idx === loadingStageIndex;

                      return (
                        <div
                          key={stage.title}
                          className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDone
                                ? "bg-primary-500"
                                : isCurrent
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-neutral-300 dark:bg-neutral-600"
                            }`}
                          />
                          <span
                            className={`text-[11px] ${
                              isDone
                                ? "text-primary-600 dark:text-primary-400"
                                : isCurrent
                                  ? "text-neutral-700 dark:text-neutral-300"
                                  : "text-neutral-400 dark:text-neutral-500"
                            }`}>
                            {stage.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        {!showHistory && (
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0B0E14] lg:rounded-b-2xl pb-safe-bottom">
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-white/5 p-2 rounded-xl border border-transparent focus-within:border-primary-500 transition-colors">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your portfolio..."
                className="flex-1 bg-transparent px-2 outline-none text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400"
              />
              <button
                type="submit"
                disabled={
                  !inputValue.trim() || isResponding || isLoadingSession
                }
                className="p-2 bg-primary-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors shadow-md">
                <Send size={16} />
              </button>
            </div>
            <div className="mt-2 px-1">
              <button
                type="button"
                onClick={() => setDisclaimerExpanded((v) => !v)}
                className="w-full flex items-center gap-1 text-neutral-400 hover:text-neutral-500 transition-colors">
                <span className="text-[10px] truncate flex-1 text-left">
                  ⚠️ AI suggestions are for informational purposes only — not
                  SEBI-registered advice.
                </span>
                <ChevronDown
                  size={12}
                  className={`shrink-0 transition-transform duration-200 ${disclaimerExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {disclaimerExpanded && (
                <p className="text-neutral-400 text-[10px] leading-relaxed mt-1">
                  AI-generated content is for informational purposes only and
                  does not constitute SEBI-registered investment advice. Past
                  performance is not indicative of future results. Please do
                  your own research and consult a certified financial advisor
                  before making any investment decisions.
                </p>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-12 w-auto shadow-2xl flex items-center gap-2 transition-all duration-300 group border-2 border-white dark:border-white/10 ${
          isOpen
            ? "bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full px-4"
            : "bg-linear-to-tr from-primary-500 to-indigo-600 text-white hover:scale-105 rounded-full px-4"
        }`}>
        {isOpen ? (
          <>
            <X size={20} />
            <span className="font-semibold text-sm whitespace-nowrap">
              Close
            </span>
          </>
        ) : (
          <>
            <Sparkles size={20} className="fill-current animate-pulse" />
            <span className="font-semibold text-sm whitespace-nowrap">
              Ask AI
            </span>
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
