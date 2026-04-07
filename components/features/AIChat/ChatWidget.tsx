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
  MessageSquare,
  Phone,
  Search,
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

interface AIChatResult {
  response: string;
  session_id: number;
  session_title: string;
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
  const [liveLoadingStage, setLiveLoadingStage] = useState<{
    stage: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [streamingText, setStreamingText] = useState("");

  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(
    undefined,
  );
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef("");

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
          "Hello! I'm Arthavi AI. Ask questions about your portfolio and investing concepts.for any human help contact/whatsapp +91 9158110065",
      },
    ]);
    setCurrentSessionId(undefined);
    setShowHistory(false);
  };

  const handleStopResponse = () => {
    abortControllerRef.current?.abort();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isResponding || isLoadingSession) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsResponding(true);
    setLiveLoadingStage(null);
    setStreamingText("");
    streamingTextRef.current = "";
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let res: AIChatResult;
      let usedFallback = false;
      try {
        res = await api.chatWithAIStream(userMsg, currentSessionId, {
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
        }, {
          signal: abortController.signal,
        });
      } catch (streamErr) {
        if (streamErr instanceof Error && streamErr.name === "AbortError") {
          throw streamErr;
        }
        usedFallback = true;
        console.warn(
          "AI stream failed. Falling back to normal response.",
          streamErr,
        );
        res = (await api.chatWithAI(userMsg, currentSessionId)) as AIChatResult;
        streamingTextRef.current = "";
        setStreamingText("");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.response },
        ]);
      }

      if (!usedFallback) {
        setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
        setStreamingText("");
      }

      if (res.session_id) {
        if (res.session_id !== currentSessionId) {
          setCurrentSessionId(res.session_id);
        }
        // Refresh list to update titles if new or changed
        loadSessions();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (streamingTextRef.current.trim()) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: streamingTextRef.current.trim() },
          ]);
        }
        return;
      }

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
      abortControllerRef.current = null;
      setIsResponding(false);
      setLiveLoadingStage(null);
      setStreamingText("");
      streamingTextRef.current = "";
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
                title="Chats">
                <MessageSquare size={18} />
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
            <div className="absolute inset-0 z-10 bg-white dark:bg-[#0B0E14] overflow-y-auto">
              <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0B0E14]/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Chats
                    </p>
           
                  </div>
                  <button
                    onClick={handleNewChat}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
                  >
                    <Plus size={14} />
                    New Chat
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-white/5 dark:text-neutral-400">
                    {sessions.length} conversations
                  </span>
                  {currentSessionId && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                      Current chat selected
                    </span>
                  )}
                </div>

                <div className="relative mt-3">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search chat history..."
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2 p-4">
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleLoadSession(session.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3
                                    ${
                                      currentSessionId === session.id
                                        ? "bg-primary-50 dark:bg-primary-900/10 border-primary-200 shadow-sm dark:border-primary-500/20"
                                        : "bg-neutral-50 dark:bg-white/5 border-transparent hover:border-neutral-200 hover:bg-white dark:hover:border-white/10"
                                    }`}>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        currentSessionId === session.id
                          ? "bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300"
                          : "bg-white text-neutral-400 dark:bg-white/5 dark:text-neutral-500"
                      }`}
                    >
                      <MessageSquare size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-medium truncate ${
                          currentSessionId === session.id
                            ? "text-primary-700 dark:text-primary-400"
                            : "text-neutral-700 dark:text-neutral-200"
                        }`}>
                        {session.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {new Date(session.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredSessions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-400 dark:border-white/10">
                    <p>
                      {sessions.length === 0
                        ? "No chat history yet."
                        : "No chats match your search."}
                    </p>
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
            {isResponding && !streamingText && (
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
                      {liveLoadingStage?.title ?? "Working on your request"}
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
                type={isResponding ? "button" : "submit"}
                onClick={isResponding ? handleStopResponse : undefined}
                disabled={
                  isResponding
                    ? false
                    : !inputValue.trim() || isLoadingSession
                }
                className={`p-2 text-white rounded-lg transition-colors shadow-md ${
                  isResponding
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}>
                {isResponding ? <Square size={16} /> : <Send size={16} />}
              </button>
            </div>
            {isResponding && (
              <p className="mt-2 px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Response is generating. Tap stop to cancel without waiting.
              </p>
            )}
            <p className="mt-2 px-1 text-[11px] text-neutral-400 dark:text-neutral-500">
              Free plan responses can be a bit slower during busy times.
            </p>
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
