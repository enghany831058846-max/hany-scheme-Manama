import { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Building2,
  MapPin,
  Hash,
  UserCheck,
  Search,
  ArrowUpDown,
  ExternalLink,
  Layers,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';
import { getStatusColor, isArabicOrRtl } from '../lib/utils.ts';
import type { Project } from '../db/schema.ts';

interface StatusBatchModalProps {
  open: boolean;
  onClose: () => void;
  status: string | null;
  projects: Project[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
}

export function StatusBatchModal({
  open,
  onClose,
  status,
  projects,
  isLoading,
  onSelectProject,
}: StatusBatchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'job_id' | 'contractor' | 'supervisor' | 'location'>('job_id');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter projects inside the batch modal
  const filtered = useMemo(() => {
    let list = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        return (
          p.job_id.toLowerCase().includes(q) ||
          (p.job_type && p.job_type.toLowerCase().includes(q)) ||
          (p.contractor && p.contractor.toLowerCase().includes(q)) ||
          (p.supervisor && p.supervisor.toLowerCase().includes(q)) ||
          (p.block && p.block.toLowerCase().includes(q)) ||
          (p.zone && p.zone.toLowerCase().includes(q)) ||
          (p.substation_name && p.substation_name.toLowerCase().includes(q))
        );
      });
    }

    return [...list].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'job_id') {
        valA = a.job_id || '';
        valB = b.job_id || '';
      } else if (sortField === 'contractor') {
        valA = a.contractor || '';
        valB = b.contractor || '';
      } else if (sortField === 'supervisor') {
        valA = a.supervisor || '';
        valB = b.supervisor || '';
      } else if (sortField === 'location') {
        valA = `${a.zone || ''} ${a.block || ''}`;
        valB = `${b.zone || ''} ${b.block || ''}`;
      }

      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [projects, searchQuery, sortField, sortAsc]);

  const handleSort = (field: 'job_id' | 'contractor' | 'supervisor' | 'location') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Generate CSV Report
  const handleGenerateReport = () => {
    if (filtered.length === 0) return;

    const headers = [
      'Job ID',
      'Job Type',
      'Status',
      'Progress %',
      'Supervisor',
      'Contractor',
      'Block',
      'Zone',
      'PO Number',
      'Substation Name',
      'Total Cost Replanned',
      'Total Cost Executed',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((p) => [
      escapeCsv(p.job_id),
      escapeCsv(p.job_type),
      escapeCsv(p.status),
      escapeCsv(p.progress_percent ?? 0),
      escapeCsv(p.supervisor),
      escapeCsv(p.contractor),
      escapeCsv(p.block),
      escapeCsv(p.zone),
      escapeCsv(p.po_number),
      escapeCsv(p.substation_name),
      escapeCsv(p.total_cost_replanned ?? ''),
      escapeCsv(p.total_cost_executed ?? ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanStatus = (status || 'all_status').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `project_health_report_${cleanStatus}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const statusColors = status ? getStatusColor(status) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent maxWidth="max-w-6xl" onClose={onClose} className="p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  FULL DATABASE BATCH VIEW
                </span>
                {status && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusColors?.bg} ${statusColors?.text} ${statusColors?.border}`}
                    dir={isArabicOrRtl(status) ? 'rtl' : 'ltr'}
                  >
                    <span className={`h-2 w-2 rounded-full ${statusColors?.dot}`} />
                    {status}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  {projects.length} Total Projects
                </span>
              </div>

              <DialogTitle className="text-2xl font-extrabold text-slate-900 mt-2 font-['Plus_Jakarta_Sans',sans-serif]">
                {status ? `${status} Status Cohort` : 'All Status Cohorts'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-slate-500 text-xs">
                Comprehensive breakdown of all projects currently indexed under this lifecycle phase. Click any record to inspect and edit.
              </DialogDescription>
            </div>

            {/* Top Right Action Button: Generate Report */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isLoading || filtered.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {/* Search bar inside status batch modal */}
          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Job Identity, Location, Contractor, or Supervisor..."
              className="pl-10 pr-9 py-2 h-9 text-xs rounded-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Modal Table Container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-xl border border-slate-200/90 shadow-2xs my-3 bg-slate-100/50 p-2.5">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold">Loading batch records from Turso...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 m-2">
              <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching projects found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query.</p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-none">
                  <th
                    onClick={() => handleSort('job_id')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 w-[200px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Job Identity</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('location')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 min-w-[200px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Location Vector</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('contractor')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 min-w-[260px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Stakeholder</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('supervisor')}
                    className="cursor-pointer hover:text-slate-900 select-none text-xs font-bold text-slate-700 py-3.5 px-4 min-w-[180px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Oversight</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  <th className="text-right text-xs font-bold text-slate-700 py-3.5 px-4 w-[90px] align-middle bg-slate-200/95 border-y border-slate-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl backdrop-blur-xs shadow-2xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const locationText = [p.zone, p.block].filter(Boolean).join(' • ') || p.substation_name || '-';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      className="cursor-pointer group transition-all"
                    >
                      {/* Job Identity */}
                      <td className="py-4 px-4 align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs transition-all">
                        <div className="flex items-start gap-2">
                          <Hash className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono text-xs font-bold text-indigo-700 block">
                              {p.job_id}
                            </span>
                            {p.job_type && (
                              <span className="text-[11px] text-slate-500 font-medium block">
                                {p.job_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location Vector */}
                      <td className="py-4 px-4 align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs transition-all">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-slate-800 break-words leading-relaxed">
                            {locationText}
                          </span>
                        </div>
                      </td>

                      {/* Stakeholder (contractor) */}
                      <td className="py-4 px-4 align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs transition-all">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-slate-800 break-words leading-relaxed">
                            {p.contractor || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Oversight (supervisor name, italic) */}
                      <td className="py-4 px-4 align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs transition-all">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span
                            className="text-xs italic font-semibold text-slate-800"
                            dir={isArabicOrRtl(p.supervisor) ? 'rtl' : 'ltr'}
                          >
                            {p.supervisor || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="text-right py-4 px-4 align-middle bg-slate-50/95 group-hover:bg-indigo-50/40 border-y border-slate-200/90 group-hover:border-indigo-300/90 first:border-l first:rounded-l-xl last:border-r last:rounded-r-xl shadow-2xs transition-all">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Edit</span>
                          <ExternalLink className="h-3 w-3" />
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
            Showing {filtered.length} of {projects.length} cohort items
          </span>
          <span className="font-mono text-[11px] text-slate-400">Turso libSQL</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
