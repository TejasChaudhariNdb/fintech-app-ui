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
  const [loading, setLoading] = useState(false);

  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(
    undefined,
  );
  const [showHistory, setShowHistory] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const loadSessions = async () => {
    try {
      const list = await api.getSessions();
      setSessions(list);
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  };

  const handleLoadSession = async (id: number) => {
    setLoading(true);
    try {
      const history = await api.getSessionMessages(id);
      setMessages(
        history.map((h: any) => ({ role: h.role, content: h.content })),
      );
      setCurrentSessionId(id);
      setShowHistory(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
    if (!inputValue.trim() || loading) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

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
      setLoading(false);
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
            {loading && (
              <div className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <Bot
                    size={16}
                    className="text-neutral-500 dark:text-neutral-300"
                  />
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-none px-4 py-3 border border-neutral-200 dark:border-white/10">
                  <div className="flex gap-1 h-5 items-center">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
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
                disabled={!inputValue.trim() || loading}
                className="p-2 bg-primary-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors shadow-md">
                <Send size={16} />
              </button>
            </div>
            <p className="text-neutral-400 text-[10px] text-center mt-2">
              Values are generated based on your portfolio data.
            </p>
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
