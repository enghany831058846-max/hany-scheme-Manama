import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  FileText,
  Hash,
  MapPin,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  CheckSquare,
  Square,
  ArrowUpDown,
} from 'lucide-react';
import { Input } from '../components/ui/input.tsx';
import { getStatusColor, isArabicOrRtl } from '../lib/utils.ts';
import { safeFetchJson } from '../lib/api.ts';
import type { Project } from '../db/schema.ts';

interface ProjectDetailsPageProps {
  onSelectProject: (project: Project) => void;
}

export function ProjectDetailsPage({ onSelectProject }: ProjectDetailsPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting state
  const [sortField, setSortField] = useState<'job_id' | 'status' | 'progress_percent' | 'created_at'>('job_id');
  const [sortAsc, setSortAsc] = useState(true);

  // Load all projects on mount
  useEffect(() => {
    let isMounted = true;
    async function loadAllProjects() {
      try {
        setIsLoading(true);
        const data = await safeFetchJson<{ success: boolean; projects: Project[] }>('/api/projects');
        if (isMounted && data.success && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      } catch (err) {
        console.error('Error fetching all projects:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadAllProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter projects by search query & optional status filter
  // Must match job_id, po_number, zone, block, substation_name (case-insensitive, partial match, OR logic across all fields)
  const filteredProjects = useMemo(() => {
    let list = projects;

    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const matchJobId = p.job_id ? p.job_id.toLowerCase().includes(q) : false;
        const matchPo = p.po_number ? p.po_number.toLowerCase().includes(q) : false;
        const matchZone = p.zone ? p.zone.toLowerCase().includes(q) : false;
        const matchBlock = p.block ? p.block.toLowerCase().includes(q) : false;
        const matchSubstation = p.substation_name ? p.substation_name.toLowerCase().includes(q) : false;
        const matchContractor = p.contractor ? p.contractor.toLowerCase().includes(q) : false;
        const matchSupervisor = p.supervisor ? p.supervisor.toLowerCase().includes(q) : false;

        return Boolean(
          matchJobId || matchPo || matchZone || matchBlock || matchSubstation || matchContractor || matchSupervisor
        );
      });
    }

    // Sort
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
  }, [projects, searchQuery, statusFilter, sortField, sortAsc]);

  // Distinct statuses for quick filter
  const distinctStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.status) set.add(p.status);
    }
    return Array.from(set).sort();
  }, [projects]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProjects.length);
  const currentRows = filteredProjects.slice(startIndex, endIndex);

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedIds.size === currentRows.length && currentRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set<number>();
      for (const row of currentRows) {
        newSet.add(row.id);
      }
      setSelectedIds(newSet);
    }
  };

  const handleToggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Export selected or all visible to CSV
  const handleExportCsv = () => {
    const targetProjects =
      selectedIds.size > 0 ? filteredProjects.filter((p) => selectedIds.has(p.id)) : filteredProjects;

    if (targetProjects.length === 0) return;

    const headers = [
      'Job ID',
      'Job Type',
      'Status',
      'Progress %',
      'Supervisor',
      'Contractor',
      'Zone',
      'Block',
      'PO Number',
      'Substation Name',
      'Start Date',
      'Total Cost Replanned',
      'Total Cost Executed',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = targetProjects.map((p) => [
      escapeCsv(p.job_id),
      escapeCsv(p.job_type),
      escapeCsv(p.status),
      escapeCsv(p.progress_percent ?? 0),
      escapeCsv(p.supervisor),
      escapeCsv(p.contractor),
      escapeCsv(p.zone),
      escapeCsv(p.block),
      escapeCsv(p.po_number),
      escapeCsv(p.substation_name),
      escapeCsv(p.start_date || p.workflow_entry_state_date),
      escapeCsv(p.total_cost_replanned ?? ''),
      escapeCsv(p.total_cost_executed ?? ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_details_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field: 'job_id' | 'status' | 'progress_percent' | 'created_at') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Project Details
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comprehensive database directory with multi-field search and inline editing.
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredProjects.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>{selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export All CSV'}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
            <span>{filteredProjects.length} Projects</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main search bar matching job_id, po_number, zone, block, substation_name */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search all records (Job, PO, Zone...)"
              className="pl-10 pr-9 py-2.5 h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-48 py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-50/60 border border-slate-200 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses ({distinctStatuses.length})</option>
              {distinctStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {statusFilter && (
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Clear status filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selected rows counter bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/90 border border-indigo-100 text-xs text-indigo-900">
            <span className="font-semibold">
              {selectedIds.size} record{selectedIds.size === 1 ? '' : 's'} selected for bulk actions
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-24 text-center text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold">Loading projects database...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Layers className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No project records matched</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or reset status filter.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {/* Checkbox */}
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-indigo-600"
                    >
                      {selectedIds.size > 0 && selectedIds.size === currentRows.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>

                  {/* Job Details (job_id bold + job_type as subtitle) */}
                  <th
                    onClick={() => handleSort('job_id')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-slate-800 w-[240px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Job Details</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Status (colored pill) */}
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-slate-800 w-[180px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Progress (percentage + small date) */}
                  <th
                    onClick={() => handleSort('progress_percent')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-slate-800 w-[180px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Progress</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Location (zone/substation) */}
                  <th className="py-3.5 px-4 min-w-[220px]">Location</th>

                  {/* Action */}
                  <th className="py-3.5 px-4 text-right w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentRows.map((p) => {
                  const colors = getStatusColor(p.status);
                  const isSelected = selectedIds.has(p.id);
                  const isRtl = isArabicOrRtl(p.status);
                  const progress = p.progress_percent ?? 0;
                  const dateStr = p.start_date || p.workflow_entry_state_date || p.updated_at || 'No date';
                  const locationDisplay = [p.zone, p.block].filter(Boolean).join(' • ') || p.substation_name || '-';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      className={`cursor-pointer transition-colors duration-100 hover:bg-indigo-50/30 ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => handleToggleSelect(p.id, e)}>
                        <button type="button" className="cursor-pointer text-slate-400 hover:text-indigo-600">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Job Details: job_id bold + job_type as subtitle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2">
                          <Hash className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900 block">
                              {p.job_id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {p.job_type || 'General Project'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status: colored pill */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                          dir={isRtl ? 'rtl' : 'ltr'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          {p.status}
                        </span>
                      </td>

                      {/* Progress: percentage + small date */}
                      <td className="py-3.5 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>{progress}%</span>
                            <span className="text-[10px] font-normal text-slate-400 flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[70px]">{dateStr}</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                progress >= 100
                                  ? 'bg-emerald-500 w-full'
                                  : progress >= 75
                                  ? 'bg-indigo-600 w-3/4'
                                  : progress >= 50
                                  ? 'bg-indigo-600 w-1/2'
                                  : progress >= 25
                                  ? 'bg-amber-500 w-1/4'
                                  : progress > 0
                                  ? 'bg-amber-500 w-[10%]'
                                  : 'w-0'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Location: zone/substation */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-1.5 max-w-xs">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 font-medium break-words leading-relaxed">
                            {locationDisplay}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-slate-200 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination & Footer Bar */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredProjects.length === 0 ? 0 : startIndex + 1}</span> to{' '}
            <span className="font-bold text-slate-800">{endIndex}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredProjects.length}</span> records
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size selector */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Prev / Next buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-semibold text-slate-700">
                Page {validCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
