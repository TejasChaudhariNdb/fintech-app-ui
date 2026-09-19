import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { analytics } from "@/lib/analytics";
import {
  Sparkles,
  ShieldAlert,
  Shield,
  CheckCircle,
  TrendingUp,
  Zap,
  Info,
  X,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { useHaptic } from "@/lib/hooks/useHaptic";

interface Insight {
  type: "info" | "warning" | "success";
  title: string;
  message: string;
  icon: string;
}

interface InsightsCardProps {
  insights: Insight[];
}

export default function InsightsCard({ insights }: InsightsCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const { light } = useHaptic();

  const current = insights && insights.length > 0 ? insights[currentIndex] : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`${current.title}\n${current.message}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy insight", err);
    }
  };

  useEffect(() => {
    if (current) {
      analytics.track({
        name: "ai_insight_viewed",
        properties: {
          insight_id: current.title,
          insight_type: current.type,
        },
      });
    }
  }, [currentIndex, current]);

  if (!insights || insights.length === 0 || !current) return null;


  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "sparkles":
        return <Sparkles size={20} />;
      case "shield-alert":
        return <ShieldAlert size={20} />;
      case "shield":
        return <Shield size={20} />;
      case "check-circle":
        return <CheckCircle size={20} />;
      case "trending-up":
        return <TrendingUp size={20} />;
      case "zap":
        return <Zap size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
      case "success":
        return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-200 dark:border-green-500/20";
      case "info":
      default:
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
    }
  };

  const handleNext = () => {
    light();
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
          <Sparkles size={14} className="text-yellow-500" />
          Smart Insights
        </h3>
        {insights.length > 1 && (
          <div className="flex gap-1">
            {insights.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-4 bg-neutral-400 dark:bg-neutral-500"
                    : "w-1.5 bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <Card
        className={`relative overflow-hidden transition-all duration-300 border ${getColor(
          current.type
        )}`}>
        <div className="p-4 flex gap-4 items-start">
          <div className="shrink-0 mt-0.5 p-2 rounded-full bg-white/50 dark:bg-white/5">
            {getIcon(current.icon)}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{current.title}</h4>
            <p className="text-xs opacity-90 leading-relaxed">
              {current.message}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer opacity-70 hover:opacity-100"
              title="Copy insight"
              aria-label="Copy insight">
              {copied ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
            {insights.length > 1 && (
              <button
                onClick={handleNext}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Next insight"
                aria-label="Next insight">
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
