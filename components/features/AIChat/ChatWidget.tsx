"use client";

import Image from "next/image";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot } from "lucide-react";
import { api } from "@/lib/api";
import ChatMessage from "./ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Arthavi AI. Ask questions about your portfolio and investing concepts.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await api.chatWithAI(userMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again later.",
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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 relative flex items-center justify-center">
              <Image
                src="/logo.webp"
                alt="Arthavi Logo"
                fill
                className="object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">
                Arthavi AI
              </h3>
              <p className="text-[10px] text-green-500 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

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

        {/* Input */}
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
    </div>
  );
}
