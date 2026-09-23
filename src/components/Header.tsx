import { useState } from 'react';
import { Upload, Download, RefreshCw, Layers, Users, Activity, TrendingUp, DollarSign, Database } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { Card } from './ui/card.tsx';
import { formatCurrency } from '../lib/utils.ts';

interface HeaderProps {
  stats: {
    totalProjects: number;
    totalSupervisors: number;
    totalStatuses: number;
    avgProgress: number;
    totalCostReplanned: number;
    totalCostExecuted: number;
  };
  onOpenImport: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function Header({ stats, onOpenImport, onRefresh, isLoading }: HeaderProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSample = async () => {
    try {
      setDownloading(true);
      const res = await fetch('/api/sample-excel');
      if (!res.ok) throw new Error('Failed to generate sample');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project_tracking_sample.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading sample Excel:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="border-b border-slate-200/80 bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                  ProjectFlow
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <Database className="h-3 w-3" />
                  Turso libSQL + Drizzle
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic Supervisor Dispatch & Project Performance Tracking
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-1.5 text-slate-600 border-slate-200"
              title="Refresh live data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              disabled={downloading}
              className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Sample Excel</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={onOpenImport}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 px-4 font-semibold"
            >
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
            </Button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <Card className="p-3.5 bg-slate-50/60 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Projects</span>
              <Layers className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalProjects}</p>
          </Card>

          <Card className="p-3.5 bg-slate-50/60 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Supervisors</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalSupervisors}</p>
          </Card>

          <Card className="p-3.5 bg-slate-50/60 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Distinct Statuses</span>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalStatuses}</p>
          </Card>

          <Card className="p-3.5 bg-slate-50/60 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Avg Progress</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-xl font-bold text-slate-900">{stats.avgProgress}%</p>
            </div>
          </Card>

          <Card className="p-3.5 bg-slate-50/60 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Replanned</span>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1 truncate" title={String(stats.totalCostReplanned)}>
              {formatCurrency(stats.totalCostReplanned)}
            </p>
          </Card>

          <Card className="p-3.5 bg-slate-50/60 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Executed</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-1 truncate" title={String(stats.totalCostExecuted)}>
              {formatCurrency(stats.totalCostExecuted)}
            </p>
          </Card>
        </div>
      </div>
    </header>
  );
}
