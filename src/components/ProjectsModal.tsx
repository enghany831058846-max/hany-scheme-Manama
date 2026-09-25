import { useState, useMemo, useEffect } from 'react';
import { Search, X, Hash, ArrowUpDown, ChevronRight, Layers, Loader2, Building2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';
import { getStatusColor, isArabicOrRtl } from '../lib/utils.ts';
import type { Project } from '../db/schema.ts';

interface ProjectsModalProps {
  open: boolean;
  onClose: () => void;
  supervisor: string;
  status: string | null;
  projects: Project[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
  initialFilter?: string;
}

type SortField = 'job_id' | 'job_type' | 'status' | 'progress_percent' | 'contractor' | 'block';

export function ProjectsModal({
  open,
  onClose,
  supervisor,
  status,
  projects,
  isLoading,
  onSelectProject,
  initialFilter = '',
}: ProjectsModalProps) {
  const [filterText, setFilterText] = useState(initialFilter);
  const [sortField, setSortField] = useState<SortField>('job_id');
  const [sortAsc, setSortAsc] = useState(true);

  // Initialize or synchronize filter when modal opens
  useEffect(() => {
    if (open) {
      setFilterText(initialFilter);
    }
  }, [open, initialFilter]);

  // Filter projects by text inside modal
  const filteredProjects = useMemo(() => {
    let list = projects;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(
        (p) =>
          p.job_id.toLowerCase().includes(q) ||
          (p.job_type && p.job_type.toLowerCase().includes(q)) ||
          (p.contractor && p.contractor.toLowerCase().includes(q)) ||
          (p.block && p.block.toLowerCase().includes(q)) ||
          (p.zone && p.zone.toLowerCase().includes(q)) ||
          (p.status && p.status.toLowerCase().includes(q)) ||
          (p.po_number && p.po_number.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';

      if (sortField === 'progress_percent') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortAsc ? numA - numB : numB - numA;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [projects, filterText, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const statusColors = status ? getStatusColor(status) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent maxWidth="max-w-6xl" onClose={onClose} className="p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {supervisor}
                </DialogTitle>
                {status ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors?.bg} ${statusColors?.text} ${statusColors?.border}`}
                    dir={isArabicOrRtl(status) ? 'rtl' : 'ltr'}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColors?.dot}`} />
                    {status}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    All Statuses
                  </span>
                )}
              </div>
              <DialogDescription className="mt-1">
                {isLoading ? (
                  <span className="flex items-center gap-2 text-indigo-600 font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading project records from Turso database...</span>
                  </span>
                ) : (
                  <span>
                    Found {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}. Click any row to view complete details or edit.
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>

          {/* Search bar inside modal */}
          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              disabled={isLoading}
              placeholder={isLoading ? 'Loading records...' : 'Filter by Job ID, Contractor, Type, Block, Status, or PO...'}
              className="pl-10 pr-9 py-2 h-9 text-xs rounded-lg disabled:opacity-50"
            />
            {filterText && !isLoading && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Table Container - styled with a clean bordered card enclosure and subtle background tint */}
        <div className="overflow-x-auto overflow-y-auto max-h-[62vh] rounded-xl border border-slate-200/90 shadow-xs my-3 bg-slate-100/50 p-2.5 ring-1 ring-slate-900/5">
          {isLoading ? (
            /* Instant Skeleton Table when loading */
            <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-none">
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-700 align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Job ID</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-700 align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Job Type</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-700 align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Status</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-700 align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Progress</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-700 min-w-[240px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Contractor</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-700 min-w-[170px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Block</th>
                  <th className="py-3.5 px-4 text-right text-xs font-bold text-slate-700 align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">Action</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="h-4 bg-slate-200/80 rounded w-28" />
                    </td>
                    <td className="py-4 px-4 align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="h-4 bg-slate-200/80 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="h-5 bg-slate-200/80 rounded-full w-20" />
                    </td>
                    <td className="py-4 px-4 align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="w-24 space-y-1.5">
                        <div className="h-2 bg-slate-200/80 rounded-full w-full" />
                        <div className="h-2 bg-slate-200/80 rounded w-8" />
                      </div>
                    </td>
                    <td className="py-4 px-4 min-w-[240px] align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="h-4 bg-slate-200/80 rounded w-52" />
                    </td>
                    <td className="py-4 px-4 min-w-[170px] align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="h-5 bg-slate-200/80 rounded-full w-28" />
                    </td>
                    <td className="text-right py-4 px-4 align-middle bg-slate-50/95 border-y border-slate-200/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs">
                      <div className="h-6 bg-slate-200/80 rounded-md w-12 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-lg border border-slate-200/80 m-2">
              <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No projects found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query.</p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-none">
                  <th
                    onClick={() => handleSort('job_id')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 w-[160px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Job ID</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'job_id' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('job_type')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 w-[130px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Job Type</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'job_type' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('status')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 w-[130px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'status' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('progress_percent')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 w-[130px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Progress</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'progress_percent' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('contractor')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 min-w-[260px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Contractor</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'contractor' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('block')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 min-w-[180px] max-w-[240px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Block</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'block' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </th>

                  <th className="text-right text-xs font-bold text-slate-700 py-3.5 px-4 w-[90px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const colors = getStatusColor(p.status);
                  const isStatusRTL = isArabicOrRtl(p.status);
                  const progress = p.progress_percent ?? 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      className="cursor-pointer group transition-all"
                    >
                      {/* Job ID */}
                      <td className="font-mono text-xs font-bold text-indigo-700 py-4 px-4 whitespace-nowrap align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{p.job_id}</span>
                        </div>
                      </td>

                      {/* Job Type */}
                      <td className="text-xs text-slate-700 font-medium py-4 px-4 whitespace-nowrap align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        {p.job_type || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border} shadow-2xs`}
                          dir={isStatusRTL ? 'rtl' : 'ltr'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          {p.status}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-4 px-4 whitespace-nowrap align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                progress >= 100
                                  ? 'bg-emerald-500'
                                  : progress >= 50
                                  ? 'bg-indigo-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Contractor: Wide, full wrapping text without truncation */}
                      <td className="py-4 px-4 min-w-[260px] max-w-[380px] align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-slate-800 break-words leading-relaxed whitespace-normal">
                            {p.contractor || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Block: Pill badge with location pin icon */}
                      <td className="py-4 px-4 min-w-[180px] max-w-[240px] align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        {p.block ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200/90 shadow-2xs max-w-full"
                            title={p.block}
                          >
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.block}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="text-right py-4 px-4 whitespace-nowrap align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs group-hover:shadow-xs transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-slate-200/90 group-hover:border-indigo-200 shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Edit</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>
            {isLoading ? 'Fetching records...' : `Showing ${filteredProjects.length} of ${projects.length} project items`}
          </span>
          <span className="font-mono text-[11px] text-slate-400">Turso Database</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
