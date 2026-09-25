import { useState, useEffect, useMemo, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage.tsx';
import { SupervisorReportsPage } from './pages/SupervisorReportsPage.tsx';
import { ImportRecordsPage } from './pages/ImportRecordsPage.tsx';
import { ProjectDetailModal } from './components/ProjectDetailModal.tsx';
import { RouterProvider, useRouter } from './lib/router.tsx';
import { fetchWithRetry } from './lib/api.ts';
import type { SupervisorData } from './components/SupervisorCard.tsx';
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

function MainLayout() {
  const { currentRoute } = useRouter();

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

  // Selected project for detail view & editing (shared across all 4 pages)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch summary from Turso DB
  const fetchSummary = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      const data = await fetchWithRetry<{
        success: boolean;
        supervisors: SupervisorData[];
        projectsIndex: ProjectSearchItem[];
        stats: any;
        error?: string;
      }>('/api/dashboard/summary', undefined, 3, 500);

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
      const errorText = err?.message || 'Error connecting to database';
      setError(errorText);
      toast.error('Error connecting to Turso: ' + errorText);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Extract all distinct status names with counts dynamically
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

  // Open detail edit view
  const handleOpenProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  // When a project edit is saved
  const handleProjectSaved = async (updatedProject: Project) => {
    setSelectedProject(updatedProject);
    setIsDetailOpen(false);
    toast.success(`Project ${updatedProject.job_id} updated successfully!`);
    await fetchSummary();
  };

  // When a project is deleted
  const handleProjectDeleted = async () => {
    setIsDetailOpen(false);
    toast.success('Project deleted successfully');
    await fetchSummary();
  };

  // Handle successful import
  const handleImportComplete = async (summary: ImportResult) => {
    toast.success(`Import complete! +${summary.added} added, ${summary.updated} updated.`);
    await fetchSummary();
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex">
      <Toaster position="top-right" richColors />

      {/* Left Persistent Sidebar */}
      <Sidebar
        totalRecords={stats.totalProjects}
        onRefresh={() => fetchSummary(true)}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72 transition-all">
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentRoute === '/' && (
            <DashboardPage
              stats={stats}
              statusesWithCounts={allStatusesWithCounts}
              isLoading={isLoading}
              onSelectProject={handleOpenProjectDetail}
            />
          )}

          {currentRoute === '/project-details' && (
            <ProjectDetailsPage onSelectProject={handleOpenProjectDetail} />
          )}

          {currentRoute === '/supervisor-reports' && (
            <SupervisorReportsPage
              supervisors={supervisors}
              projectIndex={projectIndex}
              allStatusesWithCounts={allStatusesWithCounts}
              isLoading={isLoading}
              onSelectProject={handleOpenProjectDetail}
            />
          )}

          {currentRoute === '/import-records' && (
            <ImportRecordsPage
              onImportComplete={handleImportComplete}
              onRefreshData={() => fetchSummary()}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-3 px-6 mt-auto">
          <div className="max-w-7xl mx-auto text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>ProjectFlow • Enterprise Project Tracking & Dispatch Hub</span>
            <span className="font-mono text-[11px]">Turso libSQL + Drizzle ORM • 4 Integrated Modules</span>
          </div>
        </footer>
      </div>

      {/* Global Project Detail & Inline Edit Modal */}
      <ProjectDetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        project={selectedProject}
        onSaveSuccess={handleProjectSaved}
        onDeleteSuccess={handleProjectDeleted}
      />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <MainLayout />
    </RouterProvider>
  );
}
