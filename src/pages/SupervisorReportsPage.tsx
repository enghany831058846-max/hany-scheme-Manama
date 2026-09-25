import { useState, useMemo } from 'react';
import {
  BarChart3,
  Search,
  Filter,
  Download,
  Printer,
  Layers,
  Sparkles,
  Database,
  Loader2,
} from 'lucide-react';
import { SupervisorCard, type SupervisorData } from '../components/SupervisorCard.tsx';
import { GlobalFilters } from '../components/GlobalFilters.tsx';
import { ProjectsModal } from '../components/ProjectsModal.tsx';
import { buildApiUrl, safeFetchJson } from '../lib/api.ts';
import type { Project } from '../db/schema.ts';
import type { ProjectSearchItem } from '../App.tsx';

interface SupervisorReportsPageProps {
  supervisors: SupervisorData[];
  projectIndex: ProjectSearchItem[];
  allStatusesWithCounts: { status: string; count: number }[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
}

export function SupervisorReportsPage({
  supervisors,
  projectIndex,
  allStatusesWithCounts,
  isLoading,
  onSelectProject,
}: SupervisorReportsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [globalStatusFilter, setGlobalStatusFilter] = useState('');

  // Immediate loading target feedback on supervisor card clicks
  const [loadingTarget, setLoadingTarget] = useState<{
    supervisor: string;
    status: string | null;
  } | null>(null);

  // Projects slide-over / modal state
  const [projectsModal, setProjectsModal] = useState<{
    open: boolean;
    supervisor: string;
    status: string | null;
  }>({
    open: false,
    supervisor: '',
    status: null,
  });
  const [modalProjects, setModalProjects] = useState<Project[]>([]);
  const [isModalProjectsLoading, setIsModalProjectsLoading] = useState(false);

  // Filter supervisors using the multi-field search and status filter
  const filteredSupervisors = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    const hasSearch = Boolean(trimmedQuery);
    const hasStatusFilter = Boolean(globalStatusFilter);

    if (!hasSearch && !hasStatusFilter) {
      return supervisors;
    }

    const q = trimmedQuery.toLowerCase();

    // Pre-calculate full supervisor totals for comparison
    const fullSupervisorTotals = new Map<string, number>();
    for (const sup of supervisors) {
      fullSupervisorTotals.set(sup.supervisor, sup.total);
    }

    if (projectIndex.length > 0) {
      // 1. Filter projectIndex across ALL requested fields
      const matchingProjects = projectIndex.filter((p) => {
        if (hasStatusFilter && p.status !== globalStatusFilter) {
          return false;
        }

        if (hasSearch) {
          const matchJobId = p.job_id ? p.job_id.toLowerCase().includes(q) : false;
          const matchPo = p.po_number ? p.po_number.toLowerCase().includes(q) : false;
          const matchSupervisor = p.supervisor ? p.supervisor.toLowerCase().includes(q) : false;
          const matchStatus = p.status ? p.status.toLowerCase().includes(q) : false;
          const matchSubstation = p.substation_name ? p.substation_name.toLowerCase().includes(q) : false;

          return Boolean(matchJobId || matchPo || matchSupervisor || matchStatus || matchSubstation);
        }

        return true;
      });

      if (matchingProjects.length === 0) {
        return [];
      }

      // 2. Group matching projects by supervisor -> status -> count
      const supervisorMap = new Map<
        string,
        {
          supervisor: string;
          total: number;
          totalAllStatuses?: number;
          statuses: Map<string, number>;
        }
      >();

      for (const p of matchingProjects) {
        const sup = p.supervisor || 'Unassigned';
        const st = p.status || 'Unassigned';

        if (!supervisorMap.has(sup)) {
          supervisorMap.set(sup, {
            supervisor: sup,
            total: 0,
            totalAllStatuses: fullSupervisorTotals.get(sup) ?? 0,
            statuses: new Map<string, number>(),
          });
        }

        const entry = supervisorMap.get(sup)!;
        entry.total += 1;
        entry.statuses.set(st, (entry.statuses.get(st) || 0) + 1);
      }

      const result = Array.from(supervisorMap.values()).map((sup) => ({
        supervisor: sup.supervisor,
        total: sup.total,
        totalAllStatuses: sup.totalAllStatuses,
        statuses: Array.from(sup.statuses.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
      }));

      return result.sort((a, b) => b.total - a.total);
    }

    // Fallback
    return supervisors
      .filter((sup) => {
        if (hasSearch) {
          const matchSup = sup.supervisor.toLowerCase().includes(q);
          const matchStatus = sup.statuses.some((s) => s.status.toLowerCase().includes(q));
          if (!matchSup && !matchStatus) return false;
        }
        if (hasStatusFilter) {
          const hasStatus = sup.statuses.some((s) => s.status === globalStatusFilter);
          if (!hasStatus) return false;
        }
        return true;
      })
      .map((sup) => {
        if (hasStatusFilter) {
          const filteredStatuses = sup.statuses.filter((s) => s.status === globalStatusFilter);
          const totalForStatus = filteredStatuses.reduce((acc, curr) => acc + curr.count, 0);
          return {
            ...sup,
            total: totalForStatus,
            totalAllStatuses: sup.total,
            statuses: filteredStatuses,
          };
        }
        return sup;
      });
  }, [supervisors, projectIndex, searchQuery, globalStatusFilter]);

  // Open projects slide-over modal for supervisor + status
  const handleOpenProjectsModal = async (supervisor: string, status: string | null) => {
    setLoadingTarget({ supervisor, status });
    setModalProjects([]);
    setIsModalProjectsLoading(true);
    setProjectsModal({
      open: true,
      supervisor,
      status,
    });

    try {
      const targetUrl = buildApiUrl('/api/projects', { supervisor, status });
      const data = await safeFetchJson<{ success: boolean; projects: Project[] }>(targetUrl);
      setModalProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects list:', err);
    } finally {
      setIsModalProjectsLoading(false);
      setLoadingTarget(null);
    }
  };

  // Export PDF / Print Handler
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Enterprise Supervisor Reporting
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live supervisor dispatch workload, stage distribution & project tracking.
            </p>
          </div>
        </div>

        {/* Action button: Export PDF */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer active:scale-95"
            title="Print or save as PDF report"
          >
            <Printer className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={globalStatusFilter}
        onStatusChange={setGlobalStatusFilter}
        allStatuses={allStatusesWithCounts}
        totalSupervisorsFiltered={filteredSupervisors.length}
      />

      {/* Main Supervisor Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-40" />
              <div className="space-y-2 pt-2">
                <div className="h-9 bg-slate-100 rounded-lg" />
                <div className="h-9 bg-slate-100 rounded-lg" />
                <div className="h-9 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSupervisors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center max-w-lg mx-auto my-8">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Supervisors Matched</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
            Try adjusting your search query or reset the active status filters above.
          </p>
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchQuery('');
                setGlobalStatusFilter('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span>Supervisor Dispatch Cards</span>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                {filteredSupervisors.length}
              </span>
              {globalStatusFilter && (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                  Filtered by: {globalStatusFilter}
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Click any status button to view the slide-over project list
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSupervisors.map((item) => (
              <SupervisorCard
                key={item.supervisor}
                data={item}
                activeStatusFilter={globalStatusFilter}
                loadingTarget={loadingTarget}
                onSelectStatus={(sup, status) => handleOpenProjectsModal(sup, status)}
                onViewAllSupervisorProjects={(sup) => handleOpenProjectsModal(sup, null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Projects Modal / Slide-over with card rows */}
      <ProjectsModal
        open={projectsModal.open}
        onClose={() => setProjectsModal((prev) => ({ ...prev, open: false }))}
        supervisor={projectsModal.supervisor}
        status={projectsModal.status}
        projects={modalProjects}
        isLoading={isModalProjectsLoading}
        onSelectProject={onSelectProject}
        initialFilter={searchQuery}
      />
    </div>
  );
}
