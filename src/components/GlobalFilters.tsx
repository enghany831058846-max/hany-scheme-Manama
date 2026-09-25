import { Search, X, Filter, Check, RotateCcw } from 'lucide-react';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { getStatusColor, isArabicOrRtl } from '../lib/utils.ts';

export interface StatusCount {
  status: string;
  count: number;
}

interface GlobalFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  allStatuses: StatusCount[];
  totalSupervisorsFiltered: number;
  totalProjectsFiltered?: number;
}

export function GlobalFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  allStatuses,
  totalSupervisorsFiltered,
  totalProjectsFiltered,
}: GlobalFiltersProps) {
  const totalAllProjects = allStatuses.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs mb-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Job ID, PO Number, Supervisor, Status, or Substation..."
            className="pl-10 pr-9 py-2 h-10 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter Dropdown & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            <span>Status:</span>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter Status"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[180px]"
          >
            <option value="">All Statuses ({totalAllProjects} projects)</option>
            {allStatuses.map((item) => (
              <option key={item.status} value={item.status} dir={isArabicOrRtl(item.status) ? 'rtl' : 'ltr'}>
                {item.status} ({item.count})
              </option>
            ))}
          </select>

          {(searchQuery || selectedStatus) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSearchChange('');
                onStatusChange('');
              }}
              className="h-10 text-xs text-slate-700 hover:text-red-700 hover:bg-red-50 border-slate-200 gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filter Badges - Shows ALL statuses with counts, sorted by frequency */}
      {allStatuses.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span>Quick Status Filter</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Click any status to view only that status across all supervisors)
              </span>
            </div>
            {selectedStatus && (
              <button
                onClick={() => onStatusChange('')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Show All Statuses</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 text-xs no-scrollbar flex-wrap sm:flex-nowrap">
            {/* "All" button */}
            <button
              onClick={() => onStatusChange('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                !selectedStatus
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${!selectedStatus ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'}`}>
                {totalAllProjects}
              </span>
            </button>

            {/* All distinct status buttons */}
            {allStatuses.map((item) => {
              const isSelected = selectedStatus === item.status;
              const colors = getStatusColor(item.status);
              const isRTL = isArabicOrRtl(item.status);

              return (
                <button
                  key={item.status}
                  onClick={() => onStatusChange(isSelected ? '' : item.status)}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  title={`Filter by: ${item.status}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'ring-2 ring-indigo-600 bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs'
                      : `${colors.bg} ${colors.text} ${colors.border} hover:shadow-xs hover:border-slate-300`
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  ) : (
                    <span className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                  )}
                  <span className="truncate max-w-[170px]">{item.status}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : `${colors.chipBg} ${colors.text}`
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
