import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Sparkles, Copy, Check } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  return (
    <div className={`flex items-start gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105 ${
          isUser
            ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white"
            : "bg-white dark:bg-neutral-800 text-primary-500 dark:text-primary-400 border border-neutral-200 dark:border-neutral-700"
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all group ${
          isUser
            ? "bg-primary-500 text-white rounded-tr-none shadow-primary-500/10"
            : "bg-white dark:bg-[#1A1D24] text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200 dark:border-white/5 shadow-neutral-200/50 dark:shadow-none"
        }`}
      >
        {role === "assistant" && (
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-white/5 opacity-60">
            <Sparkles size={11} className="text-primary-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Arthavi AI
            </span>
          </div>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 font-medium">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc pl-4 mb-2 space-y-1.5 font-medium">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-2 space-y-1.5 font-medium">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            strong: ({ children }) => (
              <span className={`font-bold ${isUser ? "text-white" : "text-primary-600 dark:text-primary-400"}`}>
                {children}
              </span>
            ),
            code: ({ children }) => (
              <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isUser 
                  ? "bg-white/20 text-white" 
                  : "bg-neutral-100 dark:bg-white/5 text-primary-600 dark:text-primary-400"
              }`}>
                {children}
              </code>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 border border-neutral-200 dark:border-white/10 rounded-xl bg-neutral-50/50 dark:bg-white/5 shadow-sm">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10 text-xs">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-neutral-100/80 dark:bg-white/5">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-neutral-200 dark:divide-white/5">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-neutral-100/30 dark:hover:bg-white/2 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 text-neutral-700 dark:text-neutral-200 font-semibold whitespace-nowrap">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>

        {/* Bottom Actions for Assistant Message */}
        {role === "assistant" && (
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-100 dark:border-white/5">
            <div />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all text-xs font-medium active:scale-95 cursor-pointer opacity-80 hover:opacity-100"
              title="Copy response"
              aria-label="Copy AI response">
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom Actions for User Message */}
        {isUser && (
          <div className="flex justify-end mt-1.5 pt-1 border-t border-white/10 opacity-80 hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-white/20 text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer"
              title="Copy message"
              aria-label="Copy user message">
              {copied ? (
                <>
                  <Check size={10} className="text-emerald-200" />
                  <span className="text-emerald-200 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={10} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}