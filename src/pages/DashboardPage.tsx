import { useState, useMemo } from 'react';
import {
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Database,
  Filter,
} from 'lucide-react';
import { getStatusColor, isArabicOrRtl, formatCurrency } from '../lib/utils.ts';
import { StatusBatchModal } from '../components/StatusBatchModal.tsx';
import { buildApiUrl, safeFetchJson } from '../lib/api.ts';
import type { Project } from '../db/schema.ts';

interface StatusCountItem {
  status: string;
  count: number;
}

interface DashboardPageProps {
  stats: {
    totalProjects: number;
    totalSupervisors: number;
    totalStatuses: number;
    avgProgress: number;
    totalCostReplanned: number;
    totalCostExecuted: number;
  };
  statusesWithCounts: StatusCountItem[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
}

export function DashboardPage({
  stats,
  statusesWithCounts,
  isLoading,
  onSelectProject,
}: DashboardPageProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProjects, setBatchProjects] = useState<Project[]>([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // In-memory cache for status cohorts
  const [statusCache, setStatusCache] = useState<Record<string, Project[]>>({});

  const handleOpenStatusBatch = async (statusName: string) => {
    setSelectedStatus(statusName);
    setIsBatchModalOpen(true);

    if (statusCache[statusName]) {
      setBatchProjects(statusCache[statusName]);
      setIsBatchLoading(false);
      return;
    }

    try {
      setIsBatchLoading(true);
      const url = buildApiUrl('/api/projects', { status: statusName });
      const data = await safeFetchJson<{ success: boolean; projects: Project[] }>(url);
      const list = data.projects || [];
      setStatusCache((prev) => ({ ...prev, [statusName]: list }));
      setBatchProjects(list);
    } catch (err) {
      console.error('Failed to load status batch:', err);
    } finally {
      setIsBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Project Health Matrix
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time lifecycle distribution overview.
              </p>
            </div>
          </div>
        </div>

        {/* Global Records Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{stats.totalProjects} GLOBAL RECORDS</span>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Projects</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProjects}</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Supervisors</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSupervisors}</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Stages</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{statusesWithCounts.length}</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Progress</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.avgProgress}%</p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Replanned</span>
          <p className="text-base font-bold text-slate-900 mt-1.5 truncate" title={String(stats.totalCostReplanned)}>
            {formatCurrency(stats.totalCostReplanned)}
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Executed</span>
          <p className="text-base font-bold text-emerald-700 mt-1.5 truncate" title={String(stats.totalCostExecuted)}>
            {formatCurrency(stats.totalCostExecuted)}
          </p>
        </div>
      </div>

      {/* Main Section: Dynamic Status Cohort Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>Lifecycle Distribution Cards</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {statusesWithCounts.length} Stages
            </span>
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Click any status card to inspect the full batch view and export report
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-16" />
                <div className="h-1.5 bg-slate-200 rounded w-12" />
                <div className="h-4 bg-slate-200 rounded w-32" />
              </div>
            ))}
          </div>
        ) : statusesWithCounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
            <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-800">No Status Records Found</p>
            <p className="text-xs text-slate-500 mt-1">Import an Excel spreadsheet or seed demo records to populate the matrix.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statusesWithCounts.map((item) => {
              const colors = getStatusColor(item.status);
              const percentage = stats.totalProjects > 0 ? Math.round((item.count / stats.totalProjects) * 100) : 0;
              const isRtl = isArabicOrRtl(item.status);

              return (
                <div
                  key={item.status}
                  onClick={() => handleOpenStatusBatch(item.status)}
                  className={`group relative bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.99] ${colors.bg}`}
                >
                  {/* Subtle color-coded left accent bar */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${colors.dot}`} />

                  <div>
                    {/* Top Row: Count + Ratio */}
                    <div className="flex items-start justify-between">
                      <div>
                        {/* Count of projects in this status (large bold number) */}
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 block font-['Plus_Jakarta_Sans',sans-serif]">
                          {item.count}
                        </span>
                        {/* Short colored underline/accent bar */}
                        <div className={`h-1.5 w-12 rounded-full mt-2 ${colors.dot}`} />
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          {percentage}% share
                        </span>
                        <div className="mt-2 h-7 w-7 rounded-lg bg-white/80 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors shadow-2xs">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    {/* Status name in uppercase below it */}
                    <div className="mt-4 pt-3 border-t border-slate-200/50">
                      <p
                        className={`text-xs font-bold uppercase tracking-wider ${colors.text} truncate`}
                        dir={isRtl ? 'rtl' : 'ltr'}
                        title={item.status}
                      >
                        {item.status}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer hint */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Batch view</span>
                    <span className="flex items-center gap-0.5 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                      <span>Explore</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Batch Modal */}
      <StatusBatchModal
        open={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        status={selectedStatus}
        projects={batchProjects}
        isLoading={isBatchLoading}
        onSelectProject={(p) => {
          onSelectProject(p);
        }}
      />
    </div>
  );
}
