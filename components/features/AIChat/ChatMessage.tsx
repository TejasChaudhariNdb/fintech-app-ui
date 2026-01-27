import React from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-primary-500 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
          isUser
            ? "bg-primary-500 text-white rounded-tr-none shadow-md"
            : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200 dark:border-white/10 shadow-sm"
        }`}>
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => (
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                {children}
              </span>
            ),
          }}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
