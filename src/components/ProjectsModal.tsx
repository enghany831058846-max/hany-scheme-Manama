import { useState, useMemo } from 'react';
import { Search, X, Calendar, Hash, ArrowUpDown, ChevronRight, Layers, Loader2 } from 'lucide-react';
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
  const [sortField, setSortField] = useState<'job_id' | 'progress_percent' | 'end_date'>('job_id');
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
          (p.substation_name && p.substation_name.toLowerCase().includes(q)) ||
          (p.po_number && p.po_number.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [projects, filterText, sortField, sortAsc]);

  const handleSort = (field: 'job_id' | 'progress_percent' | 'end_date') => {
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
      <DialogContent maxWidth="max-w-5xl" onClose={onClose} className="p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {supervisor}
                </DialogTitle>
                {status ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors?.bg} ${statusColors?.text} ${statusColors?.border}`}
                    dir={isArabicOrRtl(status) ? 'rtl' : 'ltr'}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColors?.dot}`} />
                    {status}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
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
              placeholder={isLoading ? 'Loading records...' : 'Filter by Job ID, Type, Substation, or PO Number...'}
              className="pl-10 pr-9 py-2 h-9 text-xs rounded-lg disabled:opacity-50"
            />
            {filterText && !isLoading && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Projects Table */}
        <div className="overflow-y-auto max-h-[60vh] rounded-lg border border-slate-100 my-2">
          {isLoading ? (
            /* Instant Skeleton Table when loading */
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="text-xs">Job ID</TableHead>
                  <TableHead className="text-xs">Job Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Progress</TableHead>
                  <TableHead className="text-xs">End Date</TableHead>
                  <TableHead className="text-xs">Substation / Zone</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <TableRow key={idx} className="animate-pulse">
                    <TableCell className="py-3.5">
                      <div className="h-4 bg-slate-200/80 rounded w-28" />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="h-4 bg-slate-200/80 rounded w-32" />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="h-5 bg-slate-200/80 rounded-full w-20" />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="w-24 space-y-1.5">
                        <div className="h-2 bg-slate-200/80 rounded-full w-full" />
                        <div className="h-2 bg-slate-200/80 rounded w-8" />
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="h-4 bg-slate-200/80 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="space-y-1">
                        <div className="h-4 bg-slate-200/80 rounded w-36" />
                        <div className="h-2.5 bg-slate-100 rounded w-20" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      <div className="h-6 bg-slate-200/80 rounded w-12 ml-auto" />
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
                <TableRow className="bg-slate-50/70">
                  <TableHead
                    onClick={() => handleSort('job_id')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs"
                  >
                    <div className="flex items-center gap-1">
                      <span>Job ID</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">Job Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead
                    onClick={() => handleSort('progress_percent')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs"
                  >
                    <div className="flex items-center gap-1">
                      <span>Progress</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('end_date')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs"
                  >
                    <div className="flex items-center gap-1">
                      <span>End Date</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">Substation / Zone</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
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
                      className="cursor-pointer hover:bg-indigo-50/40 transition-colors group"
                    >
                      <TableCell className="font-mono text-xs font-bold text-indigo-700 py-3">
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-slate-400" />
                          <span>{p.job_id}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-700 font-medium py-3 max-w-[160px] truncate" title={p.job_type || ''}>
                        {p.job_type || '-'}
                      </TableCell>

                      <TableCell className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
                          dir={isStatusRTL ? 'rtl' : 'ltr'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          {p.status}
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
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

                      <TableCell className="text-xs text-slate-600 font-mono py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{p.end_date || '-'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 py-3 max-w-[180px] truncate" title={p.substation_name || ''}>
                        <div className="font-medium text-slate-800 truncate">
                          {p.substation_name || '-'}
                        </div>
                        {p.zone && (
                          <div className="text-[10px] text-slate-400">
                            {p.zone} {p.block ? `(${p.block})` : ''}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
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
          <span className="font-mono text-[11px]">Database: Turso (libSQL)</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
