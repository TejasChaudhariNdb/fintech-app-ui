import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function MarketPredictionCard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getPredictionStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load prediction stats", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (prediction: 'BULL' | 'BEAR') => {
    if (voting) return;
    try {
      setVoting(true);
      await api.makePrediction(prediction);
      await loadStats(); // Reload to show updated stats and user's vote
    } catch (err) {
      console.error("Failed to vote", err);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-neutral-200 dark:border-white/5 bg-white/50 dark:bg-[#151A23]/50 flex items-center justify-center min-h-[140px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!stats) return null;

  const { has_voted_today, user_prediction, bull_percentage, bear_percentage, streak, yesterday_result } = stats;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/5 p-6 shadow-sm group">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header section */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Daily Prediction
              </span>
              {streak > 0 && (
                <span className="flex items-center text-xs font-semibold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full">
                  🔥 {streak} Day Streak
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white leading-tight">
              Where will Nifty 50 close tomorrow?
            </h3>
          </div>
        </div>

        {/* Previous result banner (if any) */}
        {yesterday_result && (
          <div className={`text-sm px-3 py-2 rounded-lg ${
            yesterday_result === 'WON' 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' 
              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
          }`}>
            {yesterday_result === 'WON' 
              ? '🎯 You were right yesterday! Your streak increased.' 
              : '😅 You missed yesterday\'s prediction. Try again!'}
          </div>
        )}

        {/* Voting / Stats Area */}
        {!has_voted_today ? (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => handleVote('BULL')}
              disabled={voting}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 rounded-xl transition-colors font-semibold disabled:opacity-50"
            >
              <TrendingUp size={18} />
              Higher (Bull)
            </button>
            <button
              onClick={() => handleVote('BEAR')}
              disabled={voting}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-xl transition-colors font-semibold disabled:opacity-50"
            >
              <TrendingDown size={18} />
              Lower (Bear)
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex justify-between text-sm mb-1">
              <span className={`font-semibold flex items-center gap-1 ${user_prediction === 'BULL' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`}>
                <TrendingUp size={14} /> Bulls ({bull_percentage}%)
                {user_prediction === 'BULL' && <span className="ml-1 text-[10px] bg-primary-100 dark:bg-primary-900/40 px-1.5 py-0.5 rounded">You</span>}
              </span>
              <span className={`font-semibold flex items-center gap-1 ${user_prediction === 'BEAR' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`}>
                {user_prediction === 'BEAR' && <span className="mr-1 text-[10px] bg-primary-100 dark:bg-primary-900/40 px-1.5 py-0.5 rounded">You</span>}
                Bears ({bear_percentage}%) <TrendingDown size={14} />
              </span>
            </div>
            
            {/* Progress Bar entirely using percentage */}
            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${bull_percentage}%` }}
              />
              <div 
                className="h-full bg-rose-400 dark:bg-rose-500 transition-all duration-1000 ease-out"
                style={{ width: `${bear_percentage}%` }}
              />
            </div>
            
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              Results will be updated after market close!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
