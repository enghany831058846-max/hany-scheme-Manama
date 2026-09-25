import { useState, useMemo } from 'react';
import { Search, X, Hash, ArrowUpDown, ChevronRight, Layers, Loader2, Building2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.tsx';
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
}: ProjectsModalProps) {
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<SortField>('job_id');
  const [sortAsc, setSortAsc] = useState(true);

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

        {/* Clean bordered table container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[62vh] rounded-xl border border-slate-200 shadow-xs my-3 bg-white ring-1 ring-slate-900/5">
          {isLoading ? (
            /* Instant Skeleton Table when loading */
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/90 border-b border-slate-200">
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 align-middle">Job ID</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 align-middle">Job Type</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 align-middle">Status</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 align-middle">Progress</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 min-w-[240px] align-middle">Contractor</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 min-w-[170px] align-middle">Block</TableHead>
                  <TableHead className="py-3 px-4 text-right text-xs font-semibold text-slate-700 align-middle">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <TableRow key={idx} className="animate-pulse border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                    <TableCell className="py-3.5 px-4 align-middle">
                      <div className="h-4 bg-slate-200/80 rounded w-28" />
                    </TableCell>
                    <TableCell className="py-3.5 px-4 align-middle">
                      <div className="h-4 bg-slate-200/80 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-3.5 px-4 align-middle">
                      <div className="h-5 bg-slate-200/80 rounded-full w-20" />
                    </TableCell>
                    <TableCell className="py-3.5 px-4 align-middle">
                      <div className="w-24 space-y-1.5">
                        <div className="h-2 bg-slate-200/80 rounded-full w-full" />
                        <div className="h-2 bg-slate-200/80 rounded w-8" />
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 min-w-[240px] align-middle">
                      <div className="h-4 bg-slate-200/80 rounded w-52" />
                    </TableCell>
                    <TableCell className="py-3.5 px-4 min-w-[170px] align-middle">
                      <div className="h-5 bg-slate-200/80 rounded-full w-28" />
                    </TableCell>
                    <TableCell className="text-right py-3.5 px-4 align-middle">
                      <div className="h-6 bg-slate-200/80 rounded-md w-12 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No projects found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/90 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs shadow-2xs">
                  <TableHead
                    onClick={() => handleSort('job_id')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-semibold text-slate-700 py-3 px-4 w-[160px] align-middle"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Job ID</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'job_id' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('job_type')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-semibold text-slate-700 py-3 px-4 w-[130px] align-middle"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Job Type</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'job_type' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('status')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-semibold text-slate-700 py-3 px-4 w-[130px] align-middle"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'status' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('progress_percent')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-semibold text-slate-700 py-3 px-4 w-[130px] align-middle"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Progress</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'progress_percent' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('contractor')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-semibold text-slate-700 py-3 px-4 min-w-[260px] align-middle"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Contractor</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'contractor' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('block')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-semibold text-slate-700 py-3 px-4 min-w-[180px] max-w-[240px] align-middle"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Block</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'block' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                  </TableHead>

                  <TableHead className="text-right text-xs font-semibold text-slate-700 py-3 px-4 w-[90px] align-middle">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((p) => {
                  const colors = getStatusColor(p.status);
                  const isStatusRTL = isArabicOrRtl(p.status);
                  const progress = p.progress_percent ?? 0;

                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      className="cursor-pointer odd:bg-white even:bg-slate-50/70 hover:bg-indigo-50/60 transition-colors border-b border-slate-100 group"
                    >
                      {/* Job ID */}
                      <TableCell className="font-mono text-xs font-bold text-indigo-700 py-3 px-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{p.job_id}</span>
                        </div>
                      </TableCell>

                      {/* Job Type */}
                      <TableCell className="text-xs text-slate-700 font-medium py-3 px-4 whitespace-nowrap align-middle">
                        {p.job_type || '-'}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 px-4 whitespace-nowrap align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border} shadow-2xs`}
                          dir={isStatusRTL ? 'rtl' : 'ltr'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          {p.status}
                        </span>
                      </TableCell>

                      {/* Progress */}
                      <TableCell className="py-3 px-4 whitespace-nowrap align-middle">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
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
                      </TableCell>

                      {/* Contractor: Wide, full wrapping text without truncation */}
                      <TableCell className="py-3 px-4 min-w-[260px] max-w-[380px] align-middle">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-slate-800 break-words leading-relaxed whitespace-normal">
                            {p.contractor || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Block: Pill badge with location pin icon */}
                      <TableCell className="py-3 px-4 min-w-[180px] max-w-[240px] align-middle">
                        {p.block ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/80 shadow-2xs max-w-full"
                            title={p.block}
                          >
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.block}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">-</span>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right py-3 px-4 whitespace-nowrap align-middle">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer group-hover:bg-indigo-100/90"
                        >
                          <span>Edit</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
