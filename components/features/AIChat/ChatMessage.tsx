import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Sparkles } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

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
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all ${
          isUser
            ? "bg-primary-500 text-white rounded-tr-none shadow-primary-500/10"
            : "bg-white dark:bg-[#1A1D24] text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200 dark:border-white/5 shadow-neutral-200/50 dark:shadow-none"
        }`}
      >
        {role === "assistant" && (
          <div className="flex items-center gap-1.5 mb-2 opacity-50">
            <Sparkles size={10} className="text-primary-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Assistant</span>
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
      </div>
    </div>
  );
}