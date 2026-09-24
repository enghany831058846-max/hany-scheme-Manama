import { Users, ChevronRight, Briefcase, Filter, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.tsx';
import { getStatusColor, isArabicOrRtl } from '../lib/utils.ts';

export interface SupervisorData {
  supervisor: string;
  total: number;
  totalAllStatuses?: number;
  statuses: {
    status: string;
    count: number;
  }[];
}

interface SupervisorCardProps {
  data: SupervisorData;
  activeStatusFilter?: string;
  loadingTarget?: { supervisor: string; status: string | null } | null;
  onSelectStatus: (supervisor: string, status: string) => void;
  onViewAllSupervisorProjects: (supervisor: string) => void;
}

export function SupervisorCard({
  data,
  activeStatusFilter,
  loadingTarget,
  onSelectStatus,
  onViewAllSupervisorProjects,
}: SupervisorCardProps) {
  // Check if supervisor name is Arabic
  const isSupervisorRTL = isArabicOrRtl(data.supervisor);
  const isFiltered = Boolean(activeStatusFilter);
  const isAllLoading = loadingTarget?.supervisor === data.supervisor && loadingTarget?.status === null;

  return (
    <Card className={`transition-all duration-200 border-slate-200/90 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
      isFiltered ? 'ring-1 ring-indigo-200 bg-white' : 'bg-white'
    }`}>
      <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle
                className="text-base font-bold text-slate-800 truncate"
                dir={isSupervisorRTL ? 'rtl' : 'ltr'}
                title={data.supervisor}
              >
                {data.supervisor}
              </CardTitle>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <Briefcase className="h-3 w-3" />
                Project Supervisor
              </p>
            </div>
          </div>

          {/* Total Badge - clicking opens modal with all projects for this supervisor */}
          <div className="flex flex-col items-end">
            <button
              type="button"
              onClick={() => onViewAllSupervisorProjects(data.supervisor)}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-2.5 py-1 text-xs font-bold shrink-0 cursor-pointer hover:bg-indigo-600 transition-colors shadow-xs active:scale-95"
              title={`View all projects for ${data.supervisor}`}
            >
              {isAllLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              ) : null}
              <span>{data.total}</span>
              <span className="text-[10px] font-normal opacity-85">
                {isFiltered ? 'matching' : 'projects'}
              </span>
            </button>
            {isFiltered && data.totalAllStatuses !== undefined && (
              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                of {data.totalAllStatuses} total
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Header row above statuses */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            <span>
              {isFiltered ? 'Active Filtered Status' : 'Status Breakdown'}
            </span>
            <span>Click to View Projects</span>
          </div>

          {/* When a status filter is active from the global filter bar */}
          {isFiltered && activeStatusFilter && (
            <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
              <span className="font-semibold text-[11px] flex items-center gap-1">
                <Filter className="h-3 w-3 text-indigo-600" />
                <span>Showing filtered status</span>
              </span>
              <span className="text-[10px] bg-indigo-200/80 text-indigo-900 font-bold px-2 py-0.5 rounded">
                {activeStatusFilter}
              </span>
            </div>
          )}

          {/* Dynamic Status List: Each row is a button that opens the project details modal for that supervisor + status */}
          <div className="space-y-1.5">
            {data.statuses.map((item) => {
              const colors = getStatusColor(item.status);
              const isStatusRTL = isArabicOrRtl(item.status);
              const totalToCompare = isFiltered && data.totalAllStatuses ? data.totalAllStatuses : data.total;
              const percentage = totalToCompare > 0 ? Math.round((item.count / totalToCompare) * 100) : 100;
              const isRowLoading = loadingTarget?.supervisor === data.supervisor && loadingTarget?.status === item.status;

              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => onSelectStatus(data.supervisor, item.status)}
                  title={`Click to view ${item.count} projects for ${data.supervisor} with status "${item.status}"`}
                  className={`w-full group flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer ${colors.bg} ${colors.border} hover:shadow-xs hover:border-indigo-400 hover:ring-1 hover:ring-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-left active:scale-[0.99] ${
                    isRowLoading ? 'ring-2 ring-indigo-500 shadow-xs' : ''
                  }`}
                >
                  {/* Left: Status Name + Dot */}
                  <div className="flex items-center gap-2 min-w-0 flex-1 py-0.5">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors.dot}`} />
                    <span
                      className={`truncate ${colors.text} font-bold`}
                      dir={isStatusRTL ? 'rtl' : 'ltr'}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Right: Percentage + Count Badge + Chevron / Spinner */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {percentage}%
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${colors.chipBg} ${colors.text}`}
                    >
                      {item.count}
                    </span>

                    {isRowLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => onViewAllSupervisorProjects(data.supervisor)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View All Supervisor Records</span>
            <ChevronRight className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-slate-400 font-mono">
            {data.statuses.length} {data.statuses.length === 1 ? 'stage' : 'stages'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
