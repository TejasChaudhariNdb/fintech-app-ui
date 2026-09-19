import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Sparkles, Copy, Check, ChevronRight } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  onSelectFollowUp?: (question: string) => void;
}

export default function ChatMessage({ role, content, onSelectFollowUp }: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  // Extract "You might also want to know" follow-up questions for rich clickable cards
  const followUpHeaderMatch = content.match(/(?:###\s*|\*\*)?You might also want to know[:\*\s]*/i);
  let mainContent = content;
  let followUps: string[] = [];

  if (role === "assistant" && followUpHeaderMatch && followUpHeaderMatch.index !== undefined) {
    mainContent = content.substring(0, followUpHeaderMatch.index).trim();
    const followUpSection = content.substring(followUpHeaderMatch.index + followUpHeaderMatch[0].length);
    followUps = followUpSection
      .split("\n")
      .map((line) =>
        line
          .replace(/^[\s*•\-–\d.)[\]]+/, "")
          .replace(/[\]>]+$/, "")
          .trim()
      )
      .filter(
        (q) =>
          q.length > 5 &&
          !q.toLowerCase().startsWith("note:") &&
          !q.toLowerCase().startsWith("*note") &&
          !q.toLowerCase().startsWith("research buddy") &&
          !q.toLowerCase().startsWith("arthavi ai")
      );
  }

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
            h1: ({ children }) => (
              <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white mt-3 mb-2 flex items-center gap-1.5 border-b border-neutral-100 dark:border-white/5 pb-1">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white mt-3 mb-1.5 flex items-center gap-1.5">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mt-2.5 mb-1 flex items-center gap-1">
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="mb-2 last:mb-0 font-normal leading-relaxed">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc pl-4 mb-2.5 space-y-1 font-normal text-neutral-700 dark:text-neutral-300">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-2.5 space-y-1 font-normal text-neutral-700 dark:text-neutral-300">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-0.5">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="my-2.5 pl-3.5 pr-3 py-2 border-l-3 border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 rounded-r-xl text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {children}
              </blockquote>
            ),
            hr: () => (
              <hr className="border-0 h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-white/10 to-transparent my-3" />
            ),
            strong: ({ children }) => (
              <span className={`font-semibold ${isUser ? "text-white" : "text-neutral-900 dark:text-white"}`}>
                {children}
              </span>
            ),
            code: ({ children }) => (
              <code className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
                isUser 
                  ? "bg-white/20 text-white" 
                  : "bg-neutral-100 dark:bg-white/5 text-primary-600 dark:text-primary-400 border border-neutral-200/50 dark:border-white/5"
              }`}>
                {children}
              </code>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 border border-neutral-200/80 dark:border-white/10 rounded-xl bg-white dark:bg-[#131722] shadow-xs">
                <table className="min-w-full divide-y divide-neutral-200/80 dark:divide-white/10 text-xs">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-neutral-50 dark:bg-white/[0.04]">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-neutral-50/60 dark:hover:bg-white/[0.02] transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2.5 text-left font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                {children}
              </th>
            ),
            td: ({ children }) => {
              const textContent = String(children || "");
              // Detect status labels and render as colorful badges
              let badgeClass = "";
              if (textContent.includes("Overweight") || textContent.includes("High Risk") || textContent.includes("🔴")) {
                badgeClass = "text-rose-600 dark:text-rose-400 font-semibold";
              } else if (textContent.includes("Underweight") || textContent.includes("Needs") || textContent.includes("🟡")) {
                badgeClass = "text-amber-600 dark:text-amber-400 font-semibold";
              } else if (textContent.includes("Balanced") || textContent.includes("Solid") || textContent.includes("🟢")) {
                badgeClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
              }

              return (
                <td className={`px-3 py-2 text-neutral-700 dark:text-neutral-200 whitespace-nowrap ${badgeClass}`}>
                  {children}
                </td>
              );
            },
          }}
        >
          {mainContent}
        </ReactMarkdown>

        {/* Dynamic Follow-up Questions ("You might also want to know") */}
        {role === "assistant" && followUps.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight">
              You might also want to know
            </h4>
            <div className="flex flex-col gap-1.5">
              {followUps.map((fq, fIdx) => (
                <button
                  key={fIdx}
                  onClick={() => onSelectFollowUp?.(fq)}
                  className="w-full flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-neutral-50 dark:bg-white/5 hover:bg-purple-50/90 dark:hover:bg-purple-500/10 hover:border-purple-200 dark:hover:border-purple-500/30 border border-neutral-200/60 dark:border-white/5 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-all group cursor-pointer active:scale-[0.99] text-left shadow-2xs">
                  <span className="group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {fq}
                  </span>
                  <ChevronRight size={14} className="text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 shrink-0 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

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