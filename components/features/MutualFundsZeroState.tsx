import React from "react";
import { UploadCloud, PlusCircle, TrendingUp, FileText } from "lucide-react";

interface MutualFundsZeroStateProps {
  onImportClick: () => void;
  onManualClick: () => void;
}

export default function MutualFundsZeroState({
  onImportClick,
  onManualClick,
}: MutualFundsZeroStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 py-12 text-center bg-white dark:bg-[#151A23] rounded-2xl border border-neutral-200 dark:border-white/5 shadow-sm max-w-lg mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 dark:bg-primary-500/10 rounded-full flex items-center justify-center mb-6">
        <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
        Start Tracking Your Wealth
      </h2>

      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-sm leading-relaxed">
        Get a unified view of your mutual fund investments. Import your
        portfolio instantly or start adding funds one by one.
      </p>

      <div className="w-full space-y-4">
        {/* Primary Option: Import */}
        <button
          onClick={onImportClick}
          className="group w-full flex items-center justify-between p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Import CAS Statement</div>
              <div className="text-xs text-primary-100 opacity-90">
                Best for existing portfolios
              </div>
            </div>
          </div>
          {/* Arrow Icon */}
        </button>

        {/* Secondary Option: Manual */}
        <button
          onClick={onManualClick}
          className="group w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:border-primary-500/50 dark:hover:border-primary-500/50 rounded-xl transition-all active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-neutral-100 dark:bg-white/10 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-500/20 transition-colors">
              <PlusCircle className="w-6 h-6 text-neutral-600 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                Add Funds Manually
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Search & add schemes directly
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-400">
        <FileText size={14} />
        <span>Your data is secure and private.</span>
      </div>
    </div>
  );
}
