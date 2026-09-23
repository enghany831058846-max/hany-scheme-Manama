import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Database, PlusCircle, Sparkles, AlertCircle, Filter, X } from 'lucide-react';
import { getStatusColor, isArabicOrRtl } from './lib/utils.ts';
import type { Project } from './db/schema.ts';
import type { ImportResult } from './lib/excelMapping.ts';

export default function App() {
  const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
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

  // Single project detail / edit modal
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch dashboard summary
  const fetchSummary = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/summary');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard summary');
      }

      setSupervisors(data.supervisors || []);
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

      if (showToast) {
        toast.success('Dashboard metrics refreshed');
      }
    } catch (err: any) {
      console.error('Error in fetchSummary:', err);
      setError(err.message);
      toast.error(`Error loading data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Extract all distinct statuses with overall project counts for global filter bar
  const allDistinctStatusCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const sup of supervisors) {
      for (const st of sup.statuses) {
        if (st.status) {
          countMap.set(st.status, (countMap.get(st.status) || 0) + st.count);
        }
      }
    }
    return Array.from(countMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [supervisors]);

  // Filter supervisor cards based on global search query and global status filter
  const filteredSupervisors = useMemo(() => {
    return supervisors
      .filter((sup) => {
        // 1. Status filter from global filter bar: only keep supervisors who have this status
        if (globalStatusFilter) {
          const hasStatus = sup.statuses.some((s) => s.status === globalStatusFilter);
          if (!hasStatus) return false;
        }

        // 2. Search query (matches supervisor name or any status)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesSupervisor = sup.supervisor.toLowerCase().includes(q);
          const matchesAnyStatus = sup.statuses.some((s) => s.status.toLowerCase().includes(q));
          return matchesSupervisor || matchesAnyStatus;
        }

        return true;
      })
      .map((sup) => {
        // When global status is selected, only show that status on the supervisor card
        if (globalStatusFilter) {
          const matchingStatuses = sup.statuses.filter((s) => s.status === globalStatusFilter);
          const filteredCount = matchingStatuses.reduce((acc, curr) => acc + curr.count, 0);
          return {
            ...sup,
            total: filteredCount,
            totalAllStatuses: sup.total,
            statuses: matchingStatuses,
          };
        }
        return sup;
      });
  }, [supervisors, searchQuery, globalStatusFilter]);

  // When clicking a status row inside a supervisor card:
  // Opens the project modal for that supervisor + status combination.
  // CRITICAL: Does NOT touch globalStatusFilter or searchQuery at all!
  const handleOpenProjectsModal = async (supervisor: string, status: string | null) => {
    setProjectsModal({
      open: true,
      supervisor,
      status,
    });

    try {
      setIsModalProjectsLoading(true);
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
      setModalProjects(data.projects || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load projects list');
    } finally {
      setIsModalProjectsLoading(false);
    }
  };

  // Open detail edit view
  const handleOpenProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  // When a project edit is saved
  const handleProjectSaved = async (updatedProject: Project) => {
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
    setModalProjects((prev) => prev.filter((p) => p.id !== deletedId));
    toast.success('Project deleted successfully');
    await fetchSummary();
  };

  // Handle successful import
  const handleImportComplete = async (summary: ImportResult) => {
    setLastImportSummary(summary);
    toast.success(`Import complete! +${summary.added} added, ${summary.updated} updated.`);
    await fetchSummary();
  };

  // Seed data trigger if database is empty
  const handleSeedData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully seeded ${data.seededCount} projects!`);
        await fetchSummary();
      }
    } catch (err: any) {
      toast.error('Failed to seed data: ' + err.message);
    } finally {
      setIsLoading(false);
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Import Summary Toast / Banner */}
        <ImportSummaryBanner
          summary={lastImportSummary}
          onDismiss={() => setLastImportSummary(null)}
          onViewDetails={() => setIsImportOpen(true)}
        />

        {/* Global Search & Filter Bar (Filtering supervisor cards by text and status) */}
        <GlobalFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={globalStatusFilter}
          onStatusChange={setGlobalStatusFilter}
          allStatuses={allDistinctStatusCounts}
          totalSupervisorsFiltered={filteredSupervisors.length}
        />

        {/* Active Status Banner when a global status filter is active */}
        {globalStatusFilter && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/90 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Filter className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-950">Active Global Filter:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getStatusColor(globalStatusFilter).bg} ${getStatusColor(globalStatusFilter).text} ${getStatusColor(globalStatusFilter).border}`}
                    dir={isArabicOrRtl(globalStatusFilter) ? 'rtl' : 'ltr'}
                  >
                    {globalStatusFilter}
                  </span>
                  <span className="text-xs font-semibold text-indigo-800">
                    ({filteredSupervisors.reduce((acc, s) => acc + s.total, 0)} projects across {filteredSupervisors.length} supervisors)
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Dashboard cards are filtered to this status. Click any status row inside a card to open its full project list.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGlobalStatusFilter('')}
              className="text-xs border-indigo-300 text-indigo-800 hover:bg-indigo-100 bg-white shrink-0 cursor-pointer font-semibold gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Show All Statuses</span>
            </Button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchSummary()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && supervisors.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSupervisors.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-lg mx-auto my-8">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-4">
              <Database className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {supervisors.length === 0 ? 'No Projects In Database Yet' : 'No Supervisors Match Current Filters'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
              {supervisors.length === 0
                ? 'Import an Excel spreadsheet (.xlsx/.xls) or seed realistic demo projects to start tracking.'
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
                    onClick={handleSeedData}
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
                  onSelectStatus={(sup, status) => handleOpenProjectsModal(sup, status)}
                  onViewAllSupervisorProjects={(sup) => handleOpenProjectsModal(sup, null)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Projects Modal / Slide-over (Controlled purely by projectsModal state) */}
      <ProjectsModal
        open={projectsModal.open}
        onClose={() => setProjectsModal((prev) => ({ ...prev, open: false }))}
        supervisor={projectsModal.supervisor}
        status={projectsModal.status}
        projects={modalProjects}
        isLoading={isModalProjectsLoading}
        onSelectProject={handleOpenProjectDetail}
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
