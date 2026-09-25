import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header.tsx';
import { GlobalFilters } from './components/GlobalFilters.tsx';
import { SupervisorCard, type SupervisorData } from './components/SupervisorCard.tsx';
import { ProjectsModal } from './components/ProjectsModal.tsx';
import { ProjectDetailModal } from './components/ProjectDetailModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { ImportSummaryBanner } from './components/ImportSummaryBanner.tsx';
import { Skeleton } from './components/ui/skeleton.tsx';
import { Button } from './components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog.tsx';
import {
  Database,
  PlusCircle,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Filter,
  X,
} from 'lucide-react';
import { getStatusColor, isArabicOrRtl } from './lib/utils.ts';
import type { Project } from './db/schema.ts';
import type { ImportResult } from './lib/excelMapping.ts';

export interface ProjectSearchItem {
  id: number;
  job_id: string;
  po_number: string | null;
  supervisor: string;
  status: string;
  substation_name: string | null;
}

export default function App() {
  const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
  const [projectIndex, setProjectIndex] = useState<ProjectSearchItem[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalSupervisors: 0,
    totalStatuses: 0,
    avgProgress: 0,
    totalCostReplanned: 0,
    totalCostExecuted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global search & status filter for dashboard cards
  const [searchQuery, setSearchQuery] = useState('');
  const [globalStatusFilter, setGlobalStatusFilter] = useState('');

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<ImportResult | null>(null);

  // Seed confirmation dialog state
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Immediate loading target feedback on supervisor card clicks
  const [loadingTarget, setLoadingTarget] = useState<{
    supervisor: string;
    status: string | null;
  } | null>(null);

  // In-memory cache for fast modal rendering
  const projectsCache = useRef<Map<string, Project[]>>(new Map());

  // Projects slide-over / modal state (completely independent of global filter bar)
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

  // Selected project for detail view & editing
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch summary from Turso DB
  const fetchSummary = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/summary');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }

      setSupervisors(data.supervisors || []);
      setProjectIndex(data.projectsIndex || []);
      setStats(
        data.stats || {
          totalProjects: 0,
          totalSupervisors: 0,
          totalStatuses: 0,
          avgProgress: 0,
          totalCostReplanned: 0,
          totalCostExecuted: 0,
        }
      );
      if (isRefresh) {
        toast.success('Dashboard metrics refreshed from Turso');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error('Error connecting to Turso: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Extract all distinct status names with counts dynamically for the filter bar
  const allStatusesWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const sup of supervisors) {
      for (const st of sup.statuses) {
        if (st.status) {
          map.set(st.status, (map.get(st.status) || 0) + st.count);
        }
      }
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [supervisors]);

  // Compute filtered supervisors based on Global Search & Global Status Filter
  // Matches (case-insensitive, partial match) against:
  // job_id, po_number, supervisor, status, substation_name (OR logic)
  const filteredSupervisors = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    const hasSearch = Boolean(trimmedQuery);
    const hasStatusFilter = Boolean(globalStatusFilter);

    // If no search and no status filter, return the default supervisor groups
    if (!hasSearch && !hasStatusFilter) {
      return supervisors;
    }

    const q = trimmedQuery.toLowerCase();

    // Pre-calculate full supervisor totals for comparison (e.g. "1 matching of 98 total")
    const fullSupervisorTotals = new Map<string, number>();
    for (const sup of supervisors) {
      fullSupervisorTotals.set(sup.supervisor, sup.total);
    }

    // Granular multi-field matching using projectIndex
    if (projectIndex.length > 0) {
      // 1. Filter projectIndex across ALL requested fields:
      // job_id, po_number, supervisor, status, substation_name (OR logic)
      const matchingProjects = projectIndex.filter((p) => {
        // Global status filter pill (exact match if active)
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

      // If nothing matched, return empty array so "No Supervisors Matched" is shown
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

      // Sort supervisor cards descending by matching total projects
      return result.sort((a, b) => b.total - a.total);
    }

    // Fallback if projectIndex is loading
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

  // When clicking a status row or supervisor card:
  // Opens the project modal for that supervisor + status combination.
  // Instant UI feedback with skeleton + in-memory cache for 0ms reopen.
  const handleOpenProjectsModal = async (supervisor: string, status: string | null) => {
    const cacheKey = `${supervisor}:::${status || 'ALL'}`;
    const cached = projectsCache.current.get(cacheKey);

    // Immediate button loading target for instant click feedback
    setLoadingTarget({ supervisor, status });

    if (cached && cached.length > 0) {
      // Instant render from cache!
      setModalProjects(cached);
      setIsModalProjectsLoading(false);
      setProjectsModal({
        open: true,
        supervisor,
        status,
      });
      setLoadingTarget(null);

      // Revalidate in background silently (SWR)
      try {
        const url = new URL('/api/projects', window.location.origin);
        url.searchParams.set('supervisor', supervisor);
        if (status) {
          url.searchParams.set('status', status);
        }
        const res = await fetch(url.toString());
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.projects)) {
          projectsCache.current.set(cacheKey, data.projects);
          setModalProjects(data.projects);
        }
      } catch (e) {
        // Silent failure on background revalidation
      }
      return;
    }

    // If not cached: open modal IMMEDIATELY with skeleton, clear old rows
    setModalProjects([]);
    setIsModalProjectsLoading(true);
    setProjectsModal({
      open: true,
      supervisor,
      status,
    });

    try {
      const url = new URL('/api/projects', window.location.origin);
      url.searchParams.set('supervisor', supervisor);
      if (status) {
        url.searchParams.set('status', status);
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch projects');
      }
      const fetched = data.projects || [];
      projectsCache.current.set(cacheKey, fetched);
      setModalProjects(fetched);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load projects list');
    } finally {
      setIsModalProjectsLoading(false);
      setLoadingTarget(null);
    }
  };

  // Open detail edit view
  const handleOpenProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  // When a project edit is saved
  const handleProjectSaved = async (updatedProject: Project) => {
    projectsCache.current.clear(); // invalidate cache on save
    setModalProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    setSelectedProject(updatedProject);
    setIsDetailOpen(false);

    toast.success(`Project ${updatedProject.job_id} updated successfully!`);
    await fetchSummary();
  };

  // When a project is deleted
  const handleProjectDeleted = async (deletedId: number) => {
    projectsCache.current.clear(); // invalidate cache on delete
    setModalProjects((prev) => prev.filter((p) => p.id !== deletedId));
    toast.success('Project deleted successfully');
    await fetchSummary();
  };

  // Handle successful import
  const handleImportComplete = async (summary: ImportResult) => {
    projectsCache.current.clear(); // invalidate cache on import
    setLastImportSummary(summary);
    toast.success(`Import complete! +${summary.added} added, ${summary.updated} updated.`);
    await fetchSummary();
  };

  // Seed data trigger with explicit confirmation
  const handleConfirmSeedData = async () => {
    try {
      setIsSeeding(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        projectsCache.current.clear();
        toast.success(`Successfully seeded ${data.seededCount} demo projects!`);
        setIsSeedConfirmOpen(false);
        await fetchSummary();
      } else {
        toast.error('Failed to seed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('Failed to seed data: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Toaster position="top-right" richColors />

      {/* Header & KPI Summary */}
      <Header
        stats={stats}
        onOpenImport={() => setIsImportOpen(true)}
        onRefresh={() => fetchSummary(true)}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Import feedback banner if an import just completed */}
        {lastImportSummary && (
          <ImportSummaryBanner
            summary={lastImportSummary}
            onDismiss={() => setLastImportSummary(null)}
            onViewDetails={() => setIsImportOpen(true)}
          />
        )}

        {/* Global Filter Bar: Independent of card click logic */}
        <GlobalFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={globalStatusFilter}
          onStatusChange={setGlobalStatusFilter}
          allStatuses={allStatusesWithCounts}
          totalSupervisorsFiltered={filteredSupervisors.length}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-9 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-8 text-center max-w-xl mx-auto my-12">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-red-900">Database Connection Notice</h3>
            <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{error}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSummary()}
                className="bg-white border-red-200 text-red-800 hover:bg-red-100"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        ) : filteredSupervisors.length === 0 ? (
          /* Empty Search / No Data State */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center max-w-lg mx-auto my-8">
            <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {supervisors.length === 0 ? 'No Projects in Database' : 'No Supervisors Matched'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
              {supervisors.length === 0
                ? 'Import an Excel spreadsheet (.xlsx/.xls) to start tracking your project workflow.'
                : 'Try adjusting your search query or resetting the status filters above.'}
            </p>

            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              {supervisors.length === 0 ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsImportOpen(true)}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Import Excel File</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSeedConfirmOpen(true)}
                    className="gap-2 border-slate-200"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Seed Demo Projects</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setGlobalStatusFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Dynamic Supervisor Cards Grid */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>Supervisor Dispatch Cards</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {filteredSupervisors.length}
                </span>
                {globalStatusFilter && (
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                    Global filter: {globalStatusFilter}
                  </span>
                )}
              </h2>
              <span className="text-xs text-slate-400">
                Click any status row to view its project list in the slide-over
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
      </main>

      {/* Projects Modal / Slide-over with instant skeleton */}
      <ProjectsModal
        open={projectsModal.open}
        onClose={() => setProjectsModal((prev) => ({ ...prev, open: false }))}
        supervisor={projectsModal.supervisor}
        status={projectsModal.status}
        projects={modalProjects}
        isLoading={isModalProjectsLoading}
        onSelectProject={handleOpenProjectDetail}
        initialFilter={searchQuery}
      />

      {/* Project Detail & Inline Edit Modal */}
      <ProjectDetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        project={selectedProject}
        onSaveSuccess={handleProjectSaved}
        onDeleteSuccess={handleProjectDeleted}
      />

      {/* Excel Import Modal */}
      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Seed Demo Projects Confirmation Dialog */}
      <Dialog open={isSeedConfirmOpen} onOpenChange={() => !isSeeding && setIsSeedConfirmOpen(false)}>
        <DialogContent maxWidth="max-w-md" onClose={() => !isSeeding && setIsSeedConfirmOpen(false)} className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Seed Demo Projects?
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 text-xs leading-relaxed">
              This action will insert sample demo projects into your database. If you are tracking real imported projects, this will mix mock data with your actual project records.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isSeeding}
              onClick={() => setIsSeedConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={isSeeding}
              onClick={handleConfirmSeedData}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 cursor-pointer"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Seeding Demo Projects...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Yes, Seed Demo Projects</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ProjectFlow — Turso (libSQL) + Drizzle ORM + SheetJS Engine</span>
          <span>Dynamic status aggregation • Isolated status filtering • RTL Arabic support enabled</span>
        </div>
      </footer>
    </div>
  );
}
