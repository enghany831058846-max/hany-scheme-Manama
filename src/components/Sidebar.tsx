import { useState } from 'react';
import {
  Home,
  FileText,
  BarChart3,
  UploadCloud,
  Layers,
  Database,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useRouter, type AppRoute } from '../lib/router.tsx';

interface SidebarProps {
  totalRecords: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

interface NavItem {
  id: AppRoute;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    id: '/',
    label: 'Dashboard',
    subtitle: 'Health matrix & stages',
    icon: Home,
  },
  {
    id: '/project-details',
    label: 'Project Details',
    subtitle: 'All records directory',
    icon: FileText,
  },
  {
    id: '/supervisor-reports',
    label: 'Supervisor Reports',
    subtitle: 'Enterprise workload',
    icon: BarChart3,
  },
  {
    id: '/import-records',
    label: 'Import Records',
    subtitle: 'Excel & seed demo data',
    icon: UploadCloud,
  },
];

export function Sidebar({ totalRecords, onRefresh, isLoading }: SidebarProps) {
  const { currentRoute, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (route: AppRoute) => {
    navigate(route);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base font-['Plus_Jakarta_Sans',sans-serif]">
              ProjectFlow
            </span>
            <span className="ml-2 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
              Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh DB"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                    ProjectFlow
                  </h1>
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  Enterprise Project Hub
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="px-4 py-3 mx-4 my-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-600">Database Live</span>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              {totalRecords} records
            </span>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-2 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Main Navigation
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  type="button"
                  className={`w-full group flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {item.label}
                      </p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      isActive ? 'text-white/80' : 'text-slate-300 group-hover:text-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* DB & Engine indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-700">Turso libSQL</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Synced</span>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Database'}</span>
            </button>
          )}

          <div className="pt-2 text-[10px] text-slate-400 text-center">
            ProjectFlow v2.0 • 4-Module Suite
          </div>
        </div>
      </aside>
    </>
  );
}
