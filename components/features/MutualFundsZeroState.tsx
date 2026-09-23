import React, { useEffect } from "react";
import { UploadCloud, PlusCircle, TrendingUp, FileText, FileSpreadsheet } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface MutualFundsZeroStateProps {
  onImportClick: () => void;
  onImportCsvClick?: () => void;
  onManualClick: () => void;
}

export default function MutualFundsZeroState({
  onImportClick,
  onImportCsvClick,
  onManualClick,
}: MutualFundsZeroStateProps) {
  useEffect(() => {
    analytics.track({
      name: "import_screen_viewed",
      properties: { source: "holdings_mf_zero_state" },
    });
  }, []);
  return (
    <div className="flex flex-col items-center justify-center p-6 py-12 text-center bg-white dark:bg-[#151A23] rounded-2xl border border-neutral-200 dark:border-white/5 shadow-sm max-w-lg mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 dark:bg-primary-500/10 rounded-full flex items-center justify-center mb-6">
        <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
        Start Tracking Your Wealth
      </h2>

      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-sm leading-relaxed text-sm">
        Get a unified view of your mutual fund investments. Upload your CAS PDF statement, import a transaction CSV, or add funds manually.
      </p>

      <div className="w-full space-y-3">
        {/* Primary Option: Import CAS */}
        <button
          onClick={onImportClick}
          className="group w-full flex items-center justify-between p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm sm:text-base">Import CAS Statement</div>
              <div className="text-xs text-primary-100 opacity-90">
                Full history from CAMS / KFintech PDF
              </div>
            </div>
          </div>
        </button>

        {/* Secondary Option: Import CSV */}
        {onImportCsvClick && (
          <button
            onClick={onImportCsvClick}
            className="group w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-xl transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/30 transition-colors">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm sm:text-base">
                  Upload CSV File
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  From Excel, Zerodha Coin, Groww, or custom sheet
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Tertiary Option: Manual */}
        <button
          onClick={onManualClick}
          className="group w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:border-primary-500/50 dark:hover:border-primary-500/50 rounded-xl transition-all active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-neutral-100 dark:bg-white/10 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-500/20 transition-colors">
              <PlusCircle className="w-6 h-6 text-neutral-600 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-sm sm:text-base">
                Add Funds Manually
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Search & add transactions one by one
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-400">
        <FileText size={14} />
        <span>Your data is stored securely and processed with privacy in mind.</span>
      </div>
    </div>
  );
}
