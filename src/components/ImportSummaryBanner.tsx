import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { ImportResult } from '../lib/excelMapping.ts';

interface ImportSummaryBannerProps {
  summary: ImportResult | null;
  onDismiss: () => void;
  onViewDetails: () => void;
}

export function ImportSummaryBanner({
  summary,
  onDismiss,
  onViewDetails,
}: ImportSummaryBannerProps) {
  if (!summary) return null;

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-emerald-950">
                Excel Import Summary
              </h4>
              <span className="text-xs bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                Live Synced
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-0.5 font-medium">
              <span className="font-bold text-emerald-900">+{summary.added}</span> added,{' '}
              <span className="font-bold text-emerald-900">{summary.updated}</span> updated,{' '}
              <span className="font-bold text-emerald-900">{summary.skipped}</span> skipped out of{' '}
              {summary.totalProcessed} rows.
              {summary.duplicates.length > 0 && ` (${summary.duplicates.length} duplicate Job IDs handled)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onViewDetails}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer"
          >
            View Details
          </button>
          <button
            onClick={onDismiss}
            className="p-1 rounded-md text-emerald-700 hover:bg-emerald-200/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
