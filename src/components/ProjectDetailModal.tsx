import { useState, useEffect, useMemo } from 'react';
import { Save, X, Hash, Briefcase, Calendar, MapPin, Building2, DollarSign, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { getStatusColor, isArabicOrRtl } from '../lib/utils.ts';
import { safeFetchJson } from '../lib/api.ts';
import type { Project } from '../db/schema.ts';

interface ProjectDetailModalProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onSaveSuccess: (updatedProject: Project) => void;
  onDeleteSuccess?: (deletedId: number) => void;
}

export function ProjectDetailModal({
  open,
  onClose,
  project,
  onSaveSuccess,
  onDeleteSuccess,
}: ProjectDetailModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);

  // Fetch distinct statuses dynamically whenever modal opens
  useEffect(() => {
    if (open) {
      const fetchStatuses = async () => {
        try {
          setIsLoadingStatuses(true);
          const data = await safeFetchJson<{ success: boolean; statuses?: string[] }>('/api/statuses');
          if (data && data.success && Array.isArray(data.statuses)) {
            setAvailableStatuses(data.statuses);
          }
        } catch (err) {
          console.error('Failed to load dynamic statuses from /api/statuses:', err);
        } finally {
          setIsLoadingStatuses(false);
        }
      };
      fetchStatuses();
    }
  }, [open]);

  useEffect(() => {
    if (project) {
      setFormData({ ...project });
      setErrorMsg(null);
      setSuccessMsg(false);
      setShowDeleteConfirm(false);
    }
  }, [project]);

  // Ensure current project's status is always pre-selected & included in options
  const statusOptions = useMemo(() => {
    const list = [...availableStatuses];
    if (formData.status && !list.includes(formData.status)) {
      list.push(formData.status);
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [availableStatuses, formData.status]);

  if (!project) return null;

  const handleChange = (field: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);

      // Clean numbers
      const payload = { ...formData };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (payload.progress_percent !== undefined && payload.progress_percent !== '') {
        payload.progress_percent = parseFloat(String(payload.progress_percent)) || 0;
      }
      if (payload.total_cost_replanned !== undefined && payload.total_cost_replanned !== '') {
        payload.total_cost_replanned = parseFloat(String(payload.total_cost_replanned)) || 0;
      }
      if (payload.total_cost_executed !== undefined && payload.total_cost_executed !== '') {
        payload.total_cost_executed = parseFloat(String(payload.total_cost_executed)) || 0;
      }
      if (payload.total_cost_audited !== undefined && payload.total_cost_audited !== '') {
        payload.total_cost_audited = parseFloat(String(payload.total_cost_audited)) || 0;
      }

      const data = await safeFetchJson<{ success: boolean; project: Project; error?: string }>(
        `/api/projects/${project.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      setSuccessMsg(true);
      setTimeout(() => {
        onSaveSuccess(data.project);
      }, 600);
    } catch (err: any) {
      console.error('Error saving project:', err);
      setErrorMsg(err.message || 'Error updating record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await safeFetchJson(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      if (onDeleteSuccess) {
        onDeleteSuccess(project.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setErrorMsg(err.message || 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  const statusColors = getStatusColor(formData.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent maxWidth="max-w-4xl" onClose={onClose} className="p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                  ID: #{project.id}
                </span>
                <DialogTitle className="text-xl font-bold text-slate-900 font-mono">
                  {formData.job_id || 'Project Details'}
                </DialogTitle>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                  dir={isArabicOrRtl(formData.status) ? 'rtl' : 'ltr'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColors.dot}`} />
                  {formData.status || 'No Status'}
                </span>
              </div>
              <DialogDescription className="mt-1 text-xs">
                Edit project attributes below. Saves directly to Turso (libSQL) and re-aggregates dashboard metrics live.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-xs mb-3">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg p-3 text-xs mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Saved successfully! Updating dashboard...</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto max-h-[65vh] pr-1 space-y-6">
          {/* Section 1: Core Job & Workflow Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              <span>Job & Workflow Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job ID (Unique) *
                </label>
                <Input
                  value={formData.job_id || ''}
                  onChange={(e) => handleChange('job_id', e.target.value)}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job Type
                </label>
                <Input
                  value={formData.job_type || ''}
                  onChange={(e) => handleChange('job_type', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Status *
                  </label>
                  {isLoadingStatuses && (
                    <span className="text-[10px] text-slate-400">Loading options...</span>
                  )}
                </div>
                <select
                  value={formData.status || ''}
                  onChange={(e) => handleChange('status', e.target.value)}
                  dir={isArabicOrRtl(formData.status) ? 'rtl' : 'ltr'}
                  required
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 cursor-pointer"
                >
                  {!formData.status && (
                    <option value="" disabled>
                      Select status...
                    </option>
                  )}
                  {statusOptions.map((st) => (
                    <option key={st} value={st} dir={isArabicOrRtl(st) ? 'rtl' : 'ltr'}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phase Workflow
                </label>
                <Input
                  value={formData.phase_workflow || ''}
                  onChange={(e) => handleChange('phase_workflow', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Type Project
                </label>
                <Input
                  value={formData.project_type || ''}
                  onChange={(e) => handleChange('project_type', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Subtype Project
                </label>
                <Input
                  value={formData.project_subtype || ''}
                  onChange={(e) => handleChange('project_subtype', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Timeline & Progress */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              <span>Timeline & Progress</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Progress (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.progress_percent ?? ''}
                    onChange={(e) => handleChange('progress_percent', e.target.value)}
                    className="text-xs pr-6"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Workflow Entry State Date
                </label>
                <Input
                  type="date"
                  value={formData.workflow_entry_state_date || ''}
                  onChange={(e) => handleChange('workflow_entry_state_date', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Last Shutdown
                </label>
                <Input
                  value={formData.last_shutdown || ''}
                  onChange={(e) => handleChange('last_shutdown', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Personnel & Supervision */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
              <span>Personnel & Supervision</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Project Supervisor (Grouping Key) *
                </label>
                <Input
                  value={formData.supervisor || ''}
                  onChange={(e) => handleChange('supervisor', e.target.value)}
                  required
                  dir={isArabicOrRtl(formData.supervisor) ? 'rtl' : 'ltr'}
                  className="text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supervisor Job (Role Title)
                </label>
                <Input
                  value={formData.supervisor_job || ''}
                  onChange={(e) => handleChange('supervisor_job', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Construction Engineer
                </label>
                <Input
                  value={formData.construction_engineer || ''}
                  onChange={(e) => handleChange('construction_engineer', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Location & Substation Infrastructure */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              <span>Substation & Geographic Location</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Substation Name
                </label>
                <Input
                  value={formData.substation_name || ''}
                  onChange={(e) => handleChange('substation_name', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Substation No.
                </label>
                <Input
                  value={formData.substation_no || ''}
                  onChange={(e) => handleChange('substation_no', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Zone
                </label>
                <Input
                  value={formData.zone || ''}
                  onChange={(e) => handleChange('zone', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Block
                </label>
                <Input
                  value={formData.block || ''}
                  onChange={(e) => handleChange('block', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  SS Depot
                </label>
                <Input
                  value={formData.ss_depot || ''}
                  onChange={(e) => handleChange('ss_depot', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  SS Block
                </label>
                <Input
                  value={formData.ss_block || ''}
                  onChange={(e) => handleChange('ss_block', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Procurement, Orders & Contractor */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <Building2 className="h-3.5 w-3.5 text-purple-500" />
              <span>Procurement & Contractors</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contractor
                </label>
                <Input
                  value={formData.contractor || ''}
                  onChange={(e) => handleChange('contractor', e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PO Number
                </label>
                <Input
                  value={formData.po_number || ''}
                  onChange={(e) => handleChange('po_number', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Work Order
                </label>
                <Input
                  value={formData.work_order || ''}
                  onChange={(e) => handleChange('work_order', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PO Status
                </label>
                <Input
                  value={formData.po_status || ''}
                  onChange={(e) => handleChange('po_status', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Financials & Costs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>Financial Costs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total Cost Replanned
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_cost_replanned ?? ''}
                  onChange={(e) => handleChange('total_cost_replanned', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total Cost Executed
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_cost_executed ?? ''}
                  onChange={(e) => handleChange('total_cost_executed', e.target.value)}
                  className="text-xs font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total Cost Audited
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_cost_audited ?? ''}
                  onChange={(e) => handleChange('total_cost_audited', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Metadata preview */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-[11px] text-slate-400 font-mono">
            <span>Created: {project.created_at || 'N/A'}</span>
            <span>Last Updated: {formData.updated_at || project.updated_at || 'N/A'}</span>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left: Delete project action */}
            <div>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving || isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Project</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-red-50 border border-red-200 text-xs">
                  <span className="font-semibold text-red-900">Confirm delete?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-7 text-xs px-2.5 bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="h-7 text-xs px-2 border-red-200"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Cancel & Save */}
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSaving || isDeleting}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 px-5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving to Turso...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
