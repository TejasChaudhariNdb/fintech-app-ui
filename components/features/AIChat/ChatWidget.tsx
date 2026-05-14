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
  Phone,
  Search,
  Settings2,
  Check,
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

const AVAILABLE_MODELS = [
  {
    id: "claude-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    status: "active",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    provider: "OpenAI",
    status: "soon",
  },
  {
    id: "gemini",
    name: "Gemini",
    provider: "Google",
    status: "soon",
  },
  {
    id: "grok",
    name: "Grok",
    provider: "xAI",
    status: "soon",
  },
];

const ClaudeLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
    <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" />
  </svg>
);

const ChatGPTLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 320 320" fill="currentColor" className={className}>
    <path d="m297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z" />
  </svg>
);

const GeminiLogo = ({ className }: { className?: string }) => (
  <div className={className + " relative overflow-hidden"}>
    <Image
      src="/icons/gemini.png"
      alt="Gemini Logo"
      fill
      className="object-contain"
    />
  </div>
);

const GrokLogo = ({ className }: { className?: string }) => (
  <div className={className + " relative overflow-hidden"}>
    <Image
      src="/icons/grok.png"
      alt="Grok Logo"
      fill
      className="object-contain"
    />
  </div>
);

export default function ChatWidget() {
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

  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef("");
  const modelSelectorRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modelSelectorRef.current &&
        !modelSelectorRef.current.contains(event.target as Node)
      ) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    setShowModelSelector(false);
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
      let res: AIChatResult;
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
        res = (await api.chatWithAI(userMsg, currentSessionId)) as AIChatResult;
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
          "You have reached your free chat limit. Refer a friend in Profile to unlock unlimited access!";
      } else if (
        err instanceof Error &&
        err.message.includes("Free chat limit reached")
      ) {
        errorMessage =
          "You have reached your free chat limit. Refer a friend in Profile to unlock unlimited access!";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-10 right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
      <div
        className={`pointer-events-auto bg-white dark:bg-[#0B0E14] border border-neutral-200 dark:border-white/10 shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right
        fixed inset-0 lg:inset-auto lg:relative lg:w-[400px] lg:h-[600px] lg:max-h-[70vh] lg:rounded-2xl lg:mb-4 z-50 lg:z-auto
        ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-8 pointer-events-none"
        }`}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-md lg:rounded-t-2xl pt-safe-top">
          <div className="flex items-center gap-3">
            {showHistory ? (
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-600 dark:text-neutral-400">
                <ChevronLeft size={20} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowHistory(true);
                  loadSessions();
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-600 dark:text-neutral-400"
                title="Chats">
                <MessageSquare size={20} />
              </button>
            )}

            <div className="relative h-8 w-8">
              <Image
                src="/logo.webp"
                alt="Arthavi Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm tracking-tight">
                {showHistory ? "Recent Conversations" : "Arthavi Assistant"}
              </h3>
              {!showHistory && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Online
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!showHistory && (
              <button
                onClick={handleNewChat}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-500 dark:text-neutral-400 transition-colors"
                title="New Chat">
                <Plus size={18} />
              </button>
            )}
            <button
              onClick={() => setShowContactModal(true)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-500 dark:text-neutral-400 transition-colors"
              title="Support">
              <Phone size={18} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-500 dark:text-neutral-400 transition-colors">
              <X size={18} />
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
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-xs font-medium text-white hover:bg-primary-600">
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
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-black/20">
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}
            {messages.length === 1 && !isResponding && !streamingText && (
              <div className="flex flex-col gap-3 mt-8 pl-[48px] pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-white/5" />
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                    Quick Insights
                  </p>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-white/5" />
                </div>
                {[
                  "Analyze my portfolio performance",
                  "Are my investments well-diversified?",
                  "Recommend top large cap funds",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    className="group text-left text-sm bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:border-primary-500/50 hover:bg-primary-50/30 dark:hover:bg-primary-500/5 rounded-2xl px-5 py-4 text-neutral-800 dark:text-neutral-200 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer flex items-center justify-between">
                    <span className="font-medium">{q}</span>
                    <ChevronLeft size={16} className="rotate-180 opacity-0 group-hover:opacity-100 transition-all text-primary-500 translate-x-[-8px] group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            )}
            {isResponding && !streamingText && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <Bot
                    size={16}
                    className="text-neutral-500 dark:text-neutral-400"
                  />
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-none px-4 py-3 border border-neutral-200 dark:border-white/10 max-w-[80%]">
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
          <div className="p-4 border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0B0E14] lg:rounded-b-2xl pb-safe-bottom">
            {/* Model Selector */}
            {/* Model Selector Dropdown */}
            {showModelSelector && (
              <div className="mb-3 p-2 bg-white dark:bg-[#1A1D24] border border-neutral-200 dark:border-white/5 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-2xl overflow-hidden">
                <div className="space-y-0.5">
                  {AVAILABLE_MODELS.map((model) => {
                    const isSoon = model.status === "soon";
                    return (
                      <button
                        key={model.id}
                        disabled={isSoon}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowModelSelector(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group text-left ${
                          isSoon 
                            ? "opacity-40 cursor-not-allowed grayscale" 
                            : "hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-[0.98]"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className="text-neutral-700 dark:text-white">
                            {model.provider === "Anthropic" && <ClaudeLogo className="w-5 h-5" />}
                            {model.provider === "OpenAI" && <ChatGPTLogo className="w-5 h-5" />}
                            {model.provider === "Google" && <GeminiLogo className="w-5 h-5" />}
                            {model.provider === "xAI" && <GrokLogo className="w-5 h-5" />}
                          </div>
                          <h4 className={`text-sm font-semibold transition-colors ${
                            selectedModel.id === model.id ? "text-primary-500" : "text-neutral-900 dark:text-white"
                          }`}>
                            {model.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSoon && (
                            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                              Soon
                            </span>
                          )}
                          {selectedModel.id === model.id && (
                            <div className="w-5 h-5 rounded-full bg-primary-500/10 flex items-center justify-center">
                              <Check size={12} className="text-primary-500" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="relative flex flex-col bg-neutral-50 dark:bg-white/5 rounded-2xl border border-neutral-200 dark:border-white/10 focus-within:border-primary-500/50 focus-within:ring-4 focus-within:ring-primary-500/5 transition-all">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your portfolio..."
                className="w-full bg-transparent outline-none text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 px-4 pt-3 pb-2"
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <button
                  type="button"
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-white/10 transition-colors text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                  <div className="w-4 h-4 flex items-center justify-center overflow-hidden">
                    {selectedModel.provider === "Anthropic" && <ClaudeLogo className="w-4 h-4 text-primary-500" />}
                    {selectedModel.provider === "OpenAI" && <ChatGPTLogo className="w-4 h-4 text-primary-500" />}
                    {selectedModel.provider === "Google" && <GeminiLogo className="w-4 h-4 text-primary-500" />}
                    {selectedModel.provider === "xAI" && <GrokLogo className="w-4 h-4 text-primary-500" />}
                  </div>
                  {selectedModel.name}
                  <ChevronUp size={10} className={`transition-transform duration-200 ${showModelSelector ? "" : "rotate-180"}`} />
                </button>

                {isResponding ? (
                  <button
                    type="button"
                    onClick={handleStopResponse}
                    className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-95">
                    <Square size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoadingSession}
                    className="p-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95">
                    <Send size={14} />
                  </button>
                )}
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
